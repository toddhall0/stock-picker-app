import axios from 'axios';
import { config } from '../config';
import { NewsArticle } from '../types';
import { RequestQueue } from '../utils/requestQueue';
import { getCached, setCached } from '../utils/cache';

const BASE_URL = 'https://finnhub.io/api/v1';
const queue = new RequestQueue(200, 'Finnhub');

const TRIGGER_WORDS_POSITIVE = ['earnings', 'upgrade', 'buyback', 'merger', 'acquisition', 'fda approval', 'short squeeze', 'beat'];
const TRIGGER_WORDS_NEGATIVE = ['lawsuit', 'downgrade', 'investigation', 'recall', 'fda rejection', 'bankruptcy', 'dilution'];

function isAvailable(): boolean {
  return config.finnhubApiKey.length > 0 && config.finnhubApiKey !== 'your_finnhub_key_here';
}

function classifySentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const hasPositive = TRIGGER_WORDS_POSITIVE.some((w) => lower.includes(w));
  const hasNegative = TRIGGER_WORDS_NEGATIVE.some((w) => lower.includes(w));

  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  return 'neutral';
}

export async function fetchCompanyNews(ticker: string): Promise<NewsArticle[]> {
  if (!isAvailable()) {
    console.warn('[Finnhub] No API key configured — skipping news fetch');
    return [];
  }

  const cacheKey = `finnhub_news_${ticker}`;
  const cached = getCached<NewsArticle[]>(cacheKey);
  if (cached) return cached;

  try {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const from = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await queue.add(() =>
      axios.get(`${BASE_URL}/company-news`, {
        params: {
          symbol: ticker,
          from,
          to,
          token: config.finnhubApiKey,
        },
      })
    );

    const articles: NewsArticle[] = (response.data || [])
      .slice(0, 10)
      .map((a: Record<string, unknown>) => {
        const headline = (a.headline as string) || '';
        const summary = (a.summary as string) || '';
        const combinedText = `${headline} ${summary}`;

        return {
          headline,
          summary,
          source: (a.source as string) || 'Unknown',
          url: (a.url as string) || '',
          publishedAt: new Date((a.datetime as number) * 1000).toISOString(),
          sentimentTag: classifySentiment(combinedText),
        };
      });

    setCached(cacheKey, articles, 300);
    return articles;
  } catch (error) {
    console.error(`[Finnhub] News fetch failed for ${ticker}:`, (error as Error).message);
    return [];
  }
}
