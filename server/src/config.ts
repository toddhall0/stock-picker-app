import dotenv from 'dotenv';
import path from 'path';
import { AppConfig } from './types/index.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config: AppConfig = {
  polygonApiKey: process.env.POLYGON_API_KEY || '',
  finnhubApiKey: process.env.FINNHUB_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  marketTimezone: process.env.MARKET_TIMEZONE || 'America/New_York',
  refreshIntervalMinutes: parseInt(process.env.REFRESH_INTERVAL_MINUTES || '5', 10),
  maxCandidates: parseInt(process.env.MAX_CANDIDATES || '20', 10),
  priceMin: parseFloat(process.env.PRICE_MIN || '5'),
  priceMax: parseFloat(process.env.PRICE_MAX || '20'),
  minVolumeRatio: parseFloat(process.env.MIN_VOLUME_RATIO || '2.0'),
  minAbsoluteVolume: parseInt(process.env.MIN_ABSOLUTE_VOLUME || '500000', 10),
  aiCacheTtlSeconds: parseInt(process.env.AI_CACHE_TTL_SECONDS || '600', 10),
};

export function getMarketStatus(): { isOpen: boolean; currentTime: string; nextEvent: string; message: string } {
  const now = new Date();
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.marketTimezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: config.marketTimezone,
    weekday: 'long',
  });

  const currentTime = etFormatter.format(now);
  const dayOfWeek = dateFormatter.format(now);
  const [hours, minutes] = currentTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  const isWeekday = !['Saturday', 'Sunday'].includes(dayOfWeek);
  const isDuringHours = totalMinutes >= marketOpen && totalMinutes < marketClose;
  const isOpen = isWeekday && isDuringHours;

  let nextEvent: string;
  let message: string;

  if (!isWeekday) {
    nextEvent = 'Monday 9:30 AM ET';
    message = 'Market closed — Weekend. Showing last cached results.';
  } else if (totalMinutes < marketOpen) {
    nextEvent = '9:30 AM ET';
    message = 'Market opens soon. Pre-market data shown.';
  } else if (totalMinutes >= marketClose) {
    nextEvent = 'Tomorrow 9:30 AM ET';
    message = 'Market closed. Showing final data from today.';
  } else {
    nextEvent = '4:00 PM ET';
    message = 'Market is open. Data refreshes every 5 minutes.';
  }

  return { isOpen, currentTime, nextEvent, message };
}
