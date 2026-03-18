import axios, { AxiosError } from 'axios';
import { config } from '../config.js';
import { OHLCVBar, TickerSnapshot } from '../types/index.js';
import { RequestQueue } from '../utils/requestQueue.js';
import { getCached, setCached } from '../utils/cache.js';

const BASE_URL = 'https://api.polygon.io';
const queue = new RequestQueue(250, 'Polygon');

function apiUrl(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${BASE_URL}${path}${separator}apiKey=${config.polygonApiKey}`;
}

function isAvailable(): boolean {
  return config.polygonApiKey.length > 0 && config.polygonApiKey !== 'your_polygon_key_here';
}

export async function fetchAllSnapshots(): Promise<TickerSnapshot[]> {
  if (!isAvailable()) {
    console.warn('[Polygon] No API key configured — skipping snapshot fetch');
    return [];
  }

  const cacheKey = 'polygon_snapshots';
  const cached = getCached<TickerSnapshot[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await queue.add(() =>
      axios.get(apiUrl('/v2/snapshot/locale/us/markets/stocks/tickers'))
    );

    const tickers = response.data?.tickers || [];
    const snapshots: TickerSnapshot[] = tickers.map((t: Record<string, unknown>) => {
      const day = t.day as Record<string, number> | undefined;
      const prevDay = t.prevDay as Record<string, number> | undefined;
      const lastQuote = t.lastQuote as Record<string, number> | undefined;
      const currentPrice = (t.lastTrade as Record<string, number>)?.p || day?.c || 0;
      const previousClose = prevDay?.c || 0;
      const todayVolume = day?.v || 0;
      const prevVolume = prevDay?.v || 1;

      const bid = lastQuote?.p || 0;
      const ask = lastQuote?.P || 0;
      const mid = (bid + ask) / 2;
      const spreadPercent = mid > 0 ? ((ask - bid) / mid) * 100 : 999;

      return {
        ticker: t.ticker as string,
        name: '',
        exchange: '',
        currentPrice,
        open: day?.o || 0,
        high: day?.h || 0,
        low: day?.l || 0,
        previousClose,
        volume: todayVolume,
        averageVolume30d: prevVolume,
        volumeRatio: prevVolume > 0 ? todayVolume / prevVolume : 0,
        change: currentPrice - previousClose,
        changePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
        bidAskSpreadPercent: spreadPercent,
      };
    });

    setCached(cacheKey, snapshots, 120);
    return snapshots;
  } catch (error) {
    const axErr = error as AxiosError;
    if (axErr.response?.status === 403) {
      console.warn('[Polygon] Snapshot endpoint requires paid plan. Falling back to Yahoo Finance.');
    } else {
      console.error('[Polygon] Snapshot fetch failed:', axErr.message);
    }
    return [];
  }
}

export async function fetchIntradayBars(ticker: string, limit = 60): Promise<OHLCVBar[]> {
  if (!isAvailable()) return [];

  const cacheKey = `polygon_bars_${ticker}`;
  const cached = getCached<OHLCVBar[]>(cacheKey);
  if (cached) return cached;

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const response = await queue.add(() =>
      axios.get(apiUrl(`/v2/aggs/ticker/${ticker}/range/1/minute/${today}/${today}?adjusted=true&sort=desc&limit=${limit}`))
    );

    const results = response.data?.results || [];
    const bars: OHLCVBar[] = results.map((r: Record<string, number>) => ({
      timestamp: r.t,
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      vwap: r.vw,
    })).reverse();

    setCached(cacheKey, bars, 60);
    return bars;
  } catch (error) {
    console.error(`[Polygon] Intraday bars failed for ${ticker}:`, (error as Error).message);
    return [];
  }
}

export async function fetchAvgVolume30d(ticker: string): Promise<number> {
  if (!isAvailable()) return 0;

  const cacheKey = `polygon_avgvol_${ticker}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await queue.add(() =>
      axios.get(apiUrl(`/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=desc&limit=30`))
    );

    const results = response.data?.results || [];
    if (results.length === 0) return 0;

    const totalVolume = results.reduce((sum: number, r: Record<string, number>) => sum + (r.v || 0), 0);
    const avg = totalVolume / results.length;

    setCached(cacheKey, avg, 3600);
    return avg;
  } catch (error) {
    console.error(`[Polygon] 30d avg volume failed for ${ticker}:`, (error as Error).message);
    return 0;
  }
}

export async function fetchTickerDetails(ticker: string): Promise<{ name: string; exchange: string; sector: string; marketCap: number }> {
  if (!isAvailable()) return { name: ticker, exchange: '', sector: '', marketCap: 0 };

  const cacheKey = `polygon_details_${ticker}`;
  const cached = getCached<{ name: string; exchange: string; sector: string; marketCap: number }>(cacheKey);
  if (cached) return cached;

  try {
    const response = await queue.add(() =>
      axios.get(apiUrl(`/v3/reference/tickers/${ticker}`))
    );

    const r = response.data?.results || {};
    const details = {
      name: (r.name as string) || ticker,
      exchange: (r.primary_exchange as string) || '',
      sector: (r.sic_description as string) || '',
      marketCap: (r.market_cap as number) || 0,
    };

    setCached(cacheKey, details, 86400);
    return details;
  } catch (error) {
    console.error(`[Polygon] Ticker details failed for ${ticker}:`, (error as Error).message);
    return { name: ticker, exchange: '', sector: '', marketCap: 0 };
  }
}
