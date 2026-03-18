import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { AIAnalysis, OHLCVBar, TechnicalIndicators, NewsArticle } from '../types';
import { RequestQueue } from '../utils/requestQueue';
import { getCached, setCached } from '../utils/cache';

const queue = new RequestQueue(500, 'Claude');

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!config.anthropicApiKey || config.anthropicApiKey === 'your_anthropic_key_here') {
    return null;
  }
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

export async function analyzeStock(params: {
  ticker: string;
  currentPrice: number;
  volumeRatio: number;
  volume: number;
  averageVolume: number;
  recentBars: OHLCVBar[];
  indicators: TechnicalIndicators;
  news: NewsArticle[];
}): Promise<AIAnalysis | null> {
  const anthropic = getClient();
  if (!anthropic) {
    console.warn('[Claude] No API key configured — skipping AI analysis');
    return null;
  }

  const cacheKey = `claude_analysis_${params.ticker}`;
  const cached = getCached<AIAnalysis>(cacheKey);
  if (cached) return cached;

  const last5Bars = params.recentBars.slice(-5);
  const newsText = params.news
    .slice(0, 5)
    .map((n, i) => `${i + 1}. "${n.headline}" — ${n.source}, ${n.publishedAt}`)
    .join('\n');

  const prompt = `You are a stock market analyst. Analyze the following stock data and return ONLY a valid JSON object (no markdown, no code fences, no explanation outside the JSON).

STOCK: ${params.ticker}
CURRENT PRICE: $${params.currentPrice.toFixed(2)} (confirmed in $5-$20 price range)
VOLUME: ${params.volume.toLocaleString()} shares today
AVERAGE VOLUME (30d): ${params.averageVolume.toLocaleString()} shares
VOLUME RATIO: ${params.volumeRatio.toFixed(2)}x average

LAST 5 INTRADAY BARS (1-min):
${last5Bars.map((b) => `  O:${b.open.toFixed(2)} H:${b.high.toFixed(2)} L:${b.low.toFixed(2)} C:${b.close.toFixed(2)} V:${b.volume.toLocaleString()}`).join('\n')}

TECHNICAL INDICATORS:
  VWAP: $${params.indicators.vwap.toFixed(2)}
  EMA(20): $${params.indicators.ema20.toFixed(2)}
  RSI(14): ${params.indicators.rsi14.toFixed(1)}
  Price vs Prior Close: ${params.indicators.priceVsPriorClose >= 0 ? '+' : ''}${params.indicators.priceVsPriorClose.toFixed(2)}%

RECENT NEWS (last 48h):
${newsText || 'No recent news available.'}

Return this exact JSON structure:
{
  "summary": "2-3 sentence plain English synthesis",
  "catalyst": "primary reason for volume spike",
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": <number 1-10>,
  "risk_factors": ["up to 3 risk factors"],
  "suggested_action": "watch" | "consider long" | "consider short" | "avoid",
  "reasoning": "3-5 sentence detailed explanation"
}`;

  try {
    const result = await queue.add(async () => {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }
      return textBlock.text;
    });

    // Parse the JSON response, stripping any markdown fences if present
    let jsonText = result.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    const analysis: AIAnalysis = {
      summary: String(parsed.summary || ''),
      catalyst: String(parsed.catalyst || ''),
      sentiment: (['bullish', 'bearish', 'neutral'].includes(String(parsed.sentiment))
        ? String(parsed.sentiment)
        : 'neutral') as AIAnalysis['sentiment'],
      confidence: Math.min(10, Math.max(1, Number(parsed.confidence) || 5)),
      risk_factors: Array.isArray(parsed.risk_factors)
        ? (parsed.risk_factors as string[]).slice(0, 3).map(String)
        : [],
      suggested_action: (['watch', 'consider long', 'consider short', 'avoid'].includes(String(parsed.suggested_action))
        ? String(parsed.suggested_action)
        : 'watch') as AIAnalysis['suggested_action'],
      reasoning: String(parsed.reasoning || ''),
      timestamp: new Date().toISOString(),
    };

    setCached(cacheKey, analysis, config.aiCacheTtlSeconds);
    return analysis;
  } catch (error) {
    console.error(`[Claude] Analysis failed for ${params.ticker}:`, (error as Error).message);
    return null;
  }
}
