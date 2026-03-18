export interface OHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface TechnicalIndicators {
  vwap: number;
  ema20: number;
  rsi14: number;
  priceVsPriorClose: number;
}

export interface NewsArticle {
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentimentTag?: 'positive' | 'negative' | 'neutral';
}

export interface AIAnalysis {
  summary: string;
  catalyst: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  risk_factors: string[];
  suggested_action: 'watch' | 'consider long' | 'consider short' | 'avoid';
  reasoning: string;
  timestamp: string;
}

export interface ScoutCandidate {
  ticker: string;
  name: string;
  exchange: string;
  sector?: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  averageVolume30d: number;
  volumeRatio: number;
  marketCap?: number;
  week52High?: number;
  week52Low?: number;
  intradayBars: OHLCVBar[];
  indicators: TechnicalIndicators;
  news: NewsArticle[];
  aiAnalysis: AIAnalysis | null;
  scoutScore: number;
  lastUpdated: string;
}

export interface MarketStatus {
  isOpen: boolean;
  currentTime: string;
  nextEvent: string;
  message: string;
}

export interface CandidatesResponse {
  candidates: ScoutCandidate[];
  marketStatus: MarketStatus;
  lastUpdated: string | null;
  count: number;
}

export type SortField = 'scoutScore' | 'volumeRatio' | 'changePercent' | 'aiConfidence';
export type ActionFilter = 'all' | 'consider long' | 'consider short' | 'watch' | 'avoid';
