import { OHLCVBar, TechnicalIndicators } from './types/index.js';

/**
 * Calculate Volume Weighted Average Price from OHLCV bars.
 */
export function calculateVWAP(bars: OHLCVBar[]): number {
  if (bars.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const bar of bars) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTPV += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
}

/**
 * Calculate Exponential Moving Average for a given period.
 */
export function calculateEMA(bars: OHLCVBar[], period: number): number {
  if (bars.length === 0) return 0;
  if (bars.length < period) {
    // Not enough data — use SMA of available bars
    const sum = bars.reduce((acc, b) => acc + b.close, 0);
    return sum / bars.length;
  }

  const multiplier = 2 / (period + 1);

  // Start with SMA of first `period` bars
  let ema = bars.slice(0, period).reduce((acc, b) => acc + b.close, 0) / period;

  // Apply EMA formula for remaining bars
  for (let i = period; i < bars.length; i++) {
    ema = (bars[i].close - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (14-period by default).
 */
export function calculateRSI(bars: OHLCVBar[], period = 14): number {
  if (bars.length < period + 1) return 50; // Not enough data, return neutral

  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // Initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Smooth with subsequent bars
  for (let i = period; i < changes.length; i++) {
    if (changes[i] >= 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate all technical indicators for a set of bars.
 */
export function calculateIndicators(bars: OHLCVBar[], previousClose: number): TechnicalIndicators {
  const currentPrice = bars.length > 0 ? bars[bars.length - 1].close : 0;

  return {
    vwap: calculateVWAP(bars),
    ema20: calculateEMA(bars, 20),
    rsi14: calculateRSI(bars, 14),
    priceVsPriorClose: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
  };
}
