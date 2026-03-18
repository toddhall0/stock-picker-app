import yahooFinance from 'yahoo-finance2';
import { OHLCVBar, TickerSnapshot } from '../types';
import { getCached, setCached } from '../utils/cache';

// Suppress yahoo-finance2 validation warnings in production
yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

export async function fetchYahooQuote(ticker: string): Promise<TickerSnapshot | null> {
  try {
    const quote = await yahooFinance.quote(ticker);
    if (!quote || !quote.regularMarketPrice) return null;

    return {
      ticker: quote.symbol || ticker,
      name: quote.shortName || quote.longName || ticker,
      exchange: quote.exchange || '',
      currentPrice: quote.regularMarketPrice || 0,
      open: quote.regularMarketOpen || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      volume: quote.regularMarketVolume || 0,
      averageVolume30d: quote.averageDailyVolume3Month || quote.averageDailyVolume10Day || 0,
      volumeRatio: 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      marketCap: quote.marketCap || 0,
      week52High: quote.fiftyTwoWeekHigh || 0,
      week52Low: quote.fiftyTwoWeekLow || 0,
      sector: '',
    };
  } catch (error) {
    console.error(`[Yahoo] Quote failed for ${ticker}:`, (error as Error).message);
    return null;
  }
}

export async function fetchYahooScreener(): Promise<TickerSnapshot[]> {
  const cacheKey = 'yahoo_screener';
  const cached = getCached<TickerSnapshot[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use Yahoo Finance screener to find active stocks in our price range
    const result = await yahooFinance.screen({
      scrIds: 'most_actives',
      count: 100,
    });

    const quotes = result?.quotes || [];
    const snapshots: TickerSnapshot[] = [];

    for (const q of quotes) {
      const price = q.regularMarketPrice || 0;
      const prevClose = q.regularMarketPreviousClose || 0;
      const volume = q.regularMarketVolume || 0;
      const avgVol = q.averageDailyVolume3Month || q.averageDailyVolume10Day || 1;

      snapshots.push({
        ticker: q.symbol || '',
        name: q.shortName || q.longName || '',
        exchange: q.exchange || '',
        currentPrice: price,
        open: q.regularMarketOpen || 0,
        high: q.regularMarketDayHigh || 0,
        low: q.regularMarketDayLow || 0,
        previousClose: prevClose,
        volume,
        averageVolume30d: avgVol,
        volumeRatio: avgVol > 0 ? volume / avgVol : 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
        marketCap: q.marketCap || 0,
        week52High: q.fiftyTwoWeekHigh || 0,
        week52Low: q.fiftyTwoWeekLow || 0,
      });
    }

    setCached(cacheKey, snapshots, 120);
    return snapshots;
  } catch (error) {
    console.error('[Yahoo] Screener failed:', (error as Error).message);
    return [];
  }
}

export async function fetchYahooIntradayBars(ticker: string): Promise<OHLCVBar[]> {
  const cacheKey = `yahoo_bars_${ticker}`;
  const cached = getCached<OHLCVBar[]>(cacheKey);
  if (cached) return cached;

  try {
    const result = await yahooFinance.chart(ticker, {
      period1: new Date(Date.now() - 24 * 60 * 60 * 1000),
      interval: '1m',
    });

    const quotes = result?.quotes || [];
    const bars: OHLCVBar[] = quotes
      .filter((q) => q.close !== null && q.volume !== null)
      .slice(-60)
      .map((q) => ({
        timestamp: new Date(q.date).getTime(),
        open: q.open || 0,
        high: q.high || 0,
        low: q.low || 0,
        close: q.close || 0,
        volume: q.volume || 0,
      }));

    setCached(cacheKey, bars, 60);
    return bars;
  } catch (error) {
    console.error(`[Yahoo] Intraday bars failed for ${ticker}:`, (error as Error).message);
    return [];
  }
}
