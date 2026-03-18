import { ScoutCandidate } from '../types';
import { PriceChart } from './PriceChart';
import { VolumeChart } from './VolumeChart';

interface DetailPanelProps {
  candidate: ScoutCandidate | null;
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-2 border border-scout-border">
      <div className="text-xs text-scout-muted font-mono">{label}</div>
      <div className={`text-sm font-mono font-bold ${color || 'text-scout-text'}`}>{value}</div>
    </div>
  );
}

export function DetailPanel({ candidate }: DetailPanelProps) {
  if (!candidate) {
    return (
      <div className="h-full flex items-center justify-center text-scout-muted font-mono text-sm p-8">
        <div className="text-center">
          <div className="text-2xl mb-2">◉</div>
          <div>Select a candidate to view details</div>
        </div>
      </div>
    );
  }

  const c = candidate;
  const isPositive = c.changePercent >= 0;
  const ai = c.aiAnalysis;

  const sentimentBadge = ai?.sentiment === 'bullish'
    ? { text: 'BULLISH', cls: 'bg-scout-green/20 text-scout-green border-scout-green/30' }
    : ai?.sentiment === 'bearish'
    ? { text: 'BEARISH', cls: 'bg-scout-red/20 text-scout-red border-scout-red/30' }
    : { text: 'NEUTRAL', cls: 'bg-scout-amber/20 text-scout-amber border-scout-amber/30' };

  const actionBadge = ai?.suggested_action === 'consider long'
    ? { text: 'CONSIDER LONG', cls: 'bg-scout-green/20 text-scout-green' }
    : ai?.suggested_action === 'consider short'
    ? { text: 'CONSIDER SHORT', cls: 'bg-scout-red/20 text-scout-red' }
    : ai?.suggested_action === 'avoid'
    ? { text: 'AVOID', cls: 'bg-scout-red/30 text-scout-red' }
    : { text: 'WATCH', cls: 'bg-scout-amber/20 text-scout-amber' };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-2xl font-bold text-scout-text">{c.ticker}</h2>
            <span className={`text-xs font-mono px-2 py-0.5 border ${sentimentBadge.cls}`}>
              {sentimentBadge.text}
            </span>
          </div>
          <p className="text-sm text-scout-muted mt-1">{c.name}</p>
          <p className="text-xs text-scout-muted">
            {c.exchange}{c.sector ? ` · ${c.sector}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl text-scout-text">${c.currentPrice.toFixed(2)}</div>
          <div className={`font-mono text-sm ${isPositive ? 'text-scout-green' : 'text-scout-red'}`}>
            {isPositive ? '+' : ''}{c.change.toFixed(2)} ({isPositive ? '+' : ''}{c.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="border border-scout-border p-2">
        <div className="text-xs font-mono text-scout-muted mb-1 flex items-center gap-2">
          INTRADAY 1-MIN
          <span className="text-scout-green">— Price</span>
          <span className="text-scout-amber">-- VWAP</span>
          <span className="text-scout-blue">-- EMA20</span>
        </div>
        <PriceChart bars={c.intradayBars} vwap={c.indicators.vwap} ema20={c.indicators.ema20} />
      </div>

      {/* Volume Chart */}
      <div className="border border-scout-border p-2">
        <div className="text-xs font-mono text-scout-muted mb-1">INTRADAY VOLUME</div>
        <VolumeChart bars={c.intradayBars} averageVolume={c.averageVolume30d} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
        <StatCell label="PRICE" value={`$${c.currentPrice.toFixed(2)}`} />
        <StatCell label="OPEN" value={`$${c.open.toFixed(2)}`} />
        <StatCell label="HIGH" value={`$${c.high.toFixed(2)}`} />
        <StatCell label="LOW" value={`$${c.low.toFixed(2)}`} />
        <StatCell label="VWAP" value={`$${c.indicators.vwap.toFixed(2)}`} color="text-scout-amber" />
        <StatCell label="EMA20" value={`$${c.indicators.ema20.toFixed(2)}`} color="text-scout-blue" />
        <StatCell label="RSI(14)" value={c.indicators.rsi14.toFixed(1)} color={
          c.indicators.rsi14 > 70 ? 'text-scout-red' : c.indicators.rsi14 < 30 ? 'text-scout-green' : 'text-scout-text'
        } />
        <StatCell label="VOLUME" value={formatLargeNumber(c.volume)} />
        <StatCell label="VOL RATIO" value={`${c.volumeRatio.toFixed(1)}x`} color="text-scout-amber" />
        <StatCell label="MKT CAP" value={c.marketCap ? formatLargeNumber(c.marketCap) : 'N/A'} />
        <StatCell label="52W HIGH" value={c.week52High ? `$${c.week52High.toFixed(2)}` : 'N/A'} />
        <StatCell label="52W LOW" value={c.week52Low ? `$${c.week52Low.toFixed(2)}` : 'N/A'} />
      </div>

      {/* AI Analysis */}
      {ai ? (
        <div className="border border-scout-green/30 bg-scout-green/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-scout-green/20 text-scout-green border border-scout-green/40">
              AI ANALYSIS
            </span>
            <span className="text-xs font-mono text-scout-muted">
              Confidence: {ai.confidence}/10
            </span>
            <span className={`px-2 py-0.5 text-xs font-mono ${actionBadge.cls}`}>
              {actionBadge.text}
            </span>
          </div>

          <p className="text-sm text-scout-text leading-relaxed">{ai.summary}</p>

          <div>
            <span className="text-xs font-mono text-scout-amber">CATALYST: </span>
            <span className="text-sm text-scout-text">{ai.catalyst}</span>
          </div>

          <div>
            <span className="text-xs font-mono text-scout-red">RISK FACTORS:</span>
            <ul className="mt-1 space-y-0.5">
              {ai.risk_factors.map((rf, i) => (
                <li key={i} className="text-xs text-scout-muted font-mono pl-3">• {rf}</li>
              ))}
            </ul>
          </div>

          <div className="border-t border-scout-border/50 pt-2">
            <span className="text-xs font-mono text-scout-muted">REASONING: </span>
            <p className="text-xs text-scout-text/80 mt-1 leading-relaxed">{ai.reasoning}</p>
          </div>
        </div>
      ) : (
        <div className="border border-scout-border p-3 text-center">
          <span className="text-xs font-mono text-scout-muted">AI Analysis unavailable</span>
        </div>
      )}

      {/* News Feed */}
      <div className="border border-scout-border">
        <div className="px-3 py-2 border-b border-scout-border">
          <span className="text-xs font-mono text-scout-muted">NEWS — LAST 48H</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {c.news.length === 0 ? (
            <div className="p-3 text-center text-xs font-mono text-scout-muted">No recent news</div>
          ) : (
            c.news.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border-b border-scout-border/50 hover:bg-scout-border/20 transition-colors"
                aria-label={`News: ${article.headline}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`flex-shrink-0 mt-0.5 text-xs px-1 font-mono ${
                    article.sentimentTag === 'positive' ? 'text-scout-green bg-scout-green/10' :
                    article.sentimentTag === 'negative' ? 'text-scout-red bg-scout-red/10' :
                    'text-scout-muted bg-scout-muted/10'
                  }`}>
                    {article.sentimentTag === 'positive' ? '+' : article.sentimentTag === 'negative' ? '−' : '○'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-scout-text leading-snug">{article.headline}</p>
                    <p className="text-xs text-scout-muted mt-0.5">
                      {article.source} · {new Date(article.publishedAt).toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
