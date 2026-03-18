import axios from 'axios';
import { OHLCVBar, TickerSnapshot } from '../types/index.js';
import { getCached, setCached } from '../utils/cache.js';

const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SCREENER_URL = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

interface YahooQuoteResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  exchange?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  averageDailyVolume3Month?: number;
  averageDailyVolume10Day?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export async function fetchYahooQuote(ticker: string): Promise<TickerSnapshot | null> {
  try {
    const response = await axios.get(YAHOO_QUOTE_URL, {
      params: { symbols: ticker },
      headers: HEADERS,
    });

    const quotes = response.data?.quoteResponse?.result || [];
    if (quotes.length === 0) return null;

    const q: YahooQuoteResult = quotes[0];
    if (!q.regularMarketPrice) return null;

    return {
      ticker: q.symbol || ticker,
      name: q.shortName || q.longName || ticker,
      exchange: q.exchange || '',
      currentPrice: q.regularMarketPrice || 0,
      open: q.regularMarketOpen || 0,
      high: q.regularMarketDayHigh || 0,
      low: q.regularMarketDayLow || 0,
      previousClose: q.regularMarketPreviousClose || 0,
      volume: q.regularMarketVolume || 0,
      averageVolume30d: q.averageDailyVolume3Month || q.averageDailyVolume10Day || 0,
      volumeRatio: 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      marketCap: q.marketCap || 0,
      week52High: q.fiftyTwoWeekHigh || 0,
      week52Low: q.fiftyTwoWeekLow || 0,
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
    const response = await axios.get(YAHOO_SCREENER_URL, {
      params: { scrIds: 'most_actives', count: 100 },
      headers: HEADERS,
    });

    const quotes: YahooQuoteResult[] = response.data?.finance?.result?.[0]?.quotes || [];
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
    const response = await axios.get(`${YAHOO_CHART_URL}/${ticker}`, {
      params: {
        interval: '1m',
        range: '1d',
      },
      headers: HEADERS,
    });

    const result = response.data?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0] || {};

    const bars: OHLCVBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = ohlcv.close?.[i];
      const volume = ohlcv.volume?.[i];
      if (close == null || volume == null) continue;

      bars.push({
        timestamp: timestamps[i] * 1000,
        open: ohlcv.open?.[i] || 0,
        high: ohlcv.high?.[i] || 0,
        low: ohlcv.low?.[i] || 0,
        close,
        volume,
      });
    }

    const trimmed = bars.slice(-60);
    setCached(cacheKey, trimmed, 60);
    return trimmed;
  } catch (error) {
    console.error(`[Yahoo] Intraday bars failed for ${ticker}:`, (error as Error).message);
    return [];
  }
}
