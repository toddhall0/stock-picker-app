import { config } from './config.js';
import { ScoutCandidate, TickerSnapshot } from './types/index.js';
import { calculateIndicators } from './indicators.js';
import { fetchAllSnapshots, fetchIntradayBars, fetchTickerDetails } from './services/polygon.js';
import { fetchYahooScreener, fetchYahooQuote, fetchYahooIntradayBars } from './services/yahooFinance.js';
import { fetchCompanyNews } from './services/finnhub.js';
import { analyzeStock } from './services/claude.js';
import { getCached, setCached } from './utils/cache.js';

const VALID_EXCHANGES = ['XNYS', 'XNAS', 'XASE', 'NYSE', 'NASDAQ', 'AMEX', 'NMS', 'NYQ', 'NGM', 'NCM', 'NAS', 'ASE'];

export class StockScreener {
  private candidates: ScoutCandidate[] = [];
  private lastRunTime: string = '';
  private isRunning = false;

  getLastRunTime(): string {
    return this.lastRunTime;
  }

  getCandidates(): ScoutCandidate[] {
    return this.candidates;
  }

  getCandidate(ticker: string): ScoutCandidate | undefined {
    return this.candidates.find((c) => c.ticker === ticker);
  }

  isScreenerRunning(): boolean {
    return this.isRunning;
  }

  async runFullPipeline(): Promise<ScoutCandidate[]> {
    if (this.isRunning) {
      console.log('[Screener] Pipeline already running — skipping');
      return this.candidates;
    }

    this.isRunning = true;
    console.log('[Screener] Starting full pipeline...');
    const startTime = Date.now();

    try {
      // Step 1: Universe fetch
      let snapshots = await fetchAllSnapshots();

      // Fallback to Yahoo Finance if Polygon returns nothing
      if (snapshots.length === 0) {
        console.log('[Screener] Polygon returned no data — using Yahoo Finance screener');
        snapshots = await fetchYahooScreener();
      }

      console.log(`[Screener] Step 1: Fetched ${snapshots.length} tickers`);

      // Step 2: Price filter
      let filtered = snapshots.filter(
        (s) => s.currentPrice >= config.priceMin && s.currentPrice <= config.priceMax
      );
      console.log(`[Screener] Step 2: ${filtered.length} tickers in $${config.priceMin}-$${config.priceMax} range`);

      // Step 3: Volume filter
      filtered = filtered.filter(
        (s) => s.volumeRatio >= config.minVolumeRatio && s.volume >= config.minAbsoluteVolume
      );
      console.log(`[Screener] Step 3: ${filtered.length} tickers with volume ratio >= ${config.minVolumeRatio}x`);

      // Step 4: Liquidity filter
      filtered = filtered.filter((s) => {
        const spreadOk = s.bidAskSpreadPercent === undefined || s.bidAskSpreadPercent <= 2;
        const exchangeOk = s.exchange === '' || VALID_EXCHANGES.some((e) => s.exchange.toUpperCase().includes(e));
        return spreadOk && exchangeOk;
      });
      console.log(`[Screener] Step 4: ${filtered.length} tickers after liquidity filter`);

      // Step 5: Sort & rank — top N by volume ratio
      filtered.sort((a, b) => b.volumeRatio - a.volumeRatio);
      const topCandidates = filtered.slice(0, config.maxCandidates);
      console.log(`[Screener] Step 5: Top ${topCandidates.length} candidates by volume ratio`);

      // Step 6: Enrich each candidate
      const enriched: ScoutCandidate[] = [];

      for (const snapshot of topCandidates) {
        try {
          const candidate = await this.enrichCandidate(snapshot);
          enriched.push(candidate);
        } catch (error) {
          console.error(`[Screener] Enrichment failed for ${snapshot.ticker}:`, (error as Error).message);
        }
      }

      // Step 7: Score & sort
      for (const candidate of enriched) {
        candidate.scoutScore = this.calculateScoutScore(candidate);
      }

      enriched.sort((a, b) => b.scoutScore - a.scoutScore);
      this.candidates = enriched.slice(0, 10);
      this.lastRunTime = new Date().toISOString();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Screener] Pipeline complete: ${this.candidates.length} candidates in ${elapsed}s`);

      setCached('last_candidates', this.candidates, 600);
      return this.candidates;
    } catch (error) {
      console.error('[Screener] Pipeline failed:', (error as Error).message);

      // Try to serve cached results
      const cached = getCached<ScoutCandidate[]>('last_candidates');
      if (cached) {
        this.candidates = cached;
        console.log('[Screener] Serving cached results from previous run');
      }

      return this.candidates;
    } finally {
      this.isRunning = false;
    }
  }

  private async enrichCandidate(snapshot: TickerSnapshot): Promise<ScoutCandidate> {
    // Fetch ticker details
    const details = await fetchTickerDetails(snapshot.ticker);

    // Fetch intraday bars — try Polygon first, fall back to Yahoo
    let bars = await fetchIntradayBars(snapshot.ticker);
    if (bars.length === 0) {
      bars = await fetchYahooIntradayBars(snapshot.ticker);
    }

    // Calculate indicators
    const indicators = calculateIndicators(bars, snapshot.previousClose);

    // Fetch news
    const news = await fetchCompanyNews(snapshot.ticker);

    // Get Yahoo data for extra fields if needed
    let marketCap = snapshot.marketCap || 0;
    let week52High = snapshot.week52High || 0;
    let week52Low = snapshot.week52Low || 0;
    let sector = snapshot.sector || details.sector || '';
    let name = snapshot.name || details.name || snapshot.ticker;
    let exchange = snapshot.exchange || details.exchange || '';

    if (!marketCap || !week52High) {
      const yahooQuote = await fetchYahooQuote(snapshot.ticker);
      if (yahooQuote) {
        marketCap = marketCap || yahooQuote.marketCap || 0;
        week52High = week52High || yahooQuote.week52High || 0;
        week52Low = week52Low || yahooQuote.week52Low || 0;
        name = name || yahooQuote.name;
        exchange = exchange || yahooQuote.exchange;
      }
    }

    // AI analysis
    const aiAnalysis = await analyzeStock({
      ticker: snapshot.ticker,
      currentPrice: snapshot.currentPrice,
      volumeRatio: snapshot.volumeRatio,
      volume: snapshot.volume,
      averageVolume: snapshot.averageVolume30d,
      recentBars: bars,
      indicators,
      news,
    });

    return {
      ticker: snapshot.ticker,
      name,
      exchange,
      sector,
      currentPrice: snapshot.currentPrice,
      open: snapshot.open,
      high: snapshot.high,
      low: snapshot.low,
      previousClose: snapshot.previousClose,
      change: snapshot.change,
      changePercent: snapshot.changePercent,
      volume: snapshot.volume,
      averageVolume30d: snapshot.averageVolume30d,
      volumeRatio: snapshot.volumeRatio,
      marketCap,
      week52High,
      week52Low,
      intradayBars: bars,
      indicators,
      news,
      aiAnalysis,
      scoutScore: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateScoutScore(candidate: ScoutCandidate): number {
    // Volume Ratio component (40% weight): normalize 2x-10x to 0-40
    const volRatio = Math.min(Math.max(candidate.volumeRatio, 2), 10);
    const volumeScore = ((volRatio - 2) / 8) * 40;

    // RSI component (20% weight): highest if RSI 50-70
    let rsiScore = 0;
    const rsi = candidate.indicators.rsi14;
    if (rsi >= 50 && rsi <= 70) {
      rsiScore = 20; // Perfect bullish momentum zone
    } else if (rsi >= 40 && rsi < 50) {
      rsiScore = 12;
    } else if (rsi > 70 && rsi <= 80) {
      rsiScore = 10;
    } else if (rsi >= 30 && rsi < 40) {
      rsiScore = 8;
    } else {
      rsiScore = 4;
    }

    // News component (20% weight)
    let newsScore = 10; // Neutral baseline
    for (const article of candidate.news) {
      if (article.sentimentTag === 'positive') newsScore += 2;
      else if (article.sentimentTag === 'negative') newsScore -= 2;
    }
    newsScore = Math.min(20, Math.max(0, newsScore));

    // AI Confidence component (20% weight)
    const aiConfidence = candidate.aiAnalysis?.confidence || 5;
    const aiScore = (aiConfidence / 10) * 20;

    return Math.round(volumeScore + rsiScore + newsScore + aiScore);
  }
}

export const screener = new StockScreener();
