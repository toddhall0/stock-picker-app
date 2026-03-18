import { ScoutCandidate } from '../types';

interface CandidateCardProps {
  candidate: ScoutCandidate;
  isSelected: boolean;
  onClick: () => void;
  isNew: boolean;
}

export function CandidateCard({ candidate, isSelected, onClick, isNew }: CandidateCardProps) {
  const isPositive = candidate.changePercent >= 0;
  const sentimentIcon = candidate.aiAnalysis?.sentiment === 'bullish' ? '▲' :
    candidate.aiAnalysis?.sentiment === 'bearish' ? '▼' : '●';
  const sentimentColor = candidate.aiAnalysis?.sentiment === 'bullish' ? 'text-scout-green' :
    candidate.aiAnalysis?.sentiment === 'bearish' ? 'text-scout-red' : 'text-scout-amber';

  const topHeadline = candidate.news[0]?.headline || '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border transition-all duration-300 ${
        isSelected
          ? 'border-scout-green bg-scout-green/5'
          : 'border-scout-border bg-scout-panel hover:border-scout-muted'
      } ${isNew ? 'animate-pulse-green' : ''}`}
      aria-label={`View details for ${candidate.ticker}`}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Ticker & Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-scout-text">{candidate.ticker}</span>
            <span className={`text-xs font-mono ${sentimentColor}`}>{sentimentIcon}</span>
          </div>
          <p className="text-xs text-scout-muted truncate">{candidate.name}</p>
        </div>

        {/* Price & Change */}
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm text-scout-text">${candidate.currentPrice.toFixed(2)}</div>
          <div className={`font-mono text-xs ${isPositive ? 'text-scout-green' : 'text-scout-red'}`}>
            {isPositive ? '+' : ''}{candidate.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-3 mt-2">
        {/* Volume Ratio Badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-scout-amber/20 text-scout-amber border border-scout-amber/30">
          {candidate.volumeRatio.toFixed(1)}x VOL
        </span>

        {/* Scout Score Bar */}
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-xs font-mono text-scout-muted">SC</span>
          <div className="flex-1 h-1.5 bg-scout-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={candidate.scoutScore} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full transition-all duration-500 ${
                candidate.scoutScore >= 70 ? 'bg-scout-green' :
                candidate.scoutScore >= 40 ? 'bg-scout-amber' : 'bg-scout-red'
              }`}
              style={{ width: `${candidate.scoutScore}%` }}
            />
          </div>
          <span className="text-xs font-mono text-scout-text w-6 text-right">{candidate.scoutScore}</span>
        </div>
      </div>

      {/* Headline Preview */}
      {topHeadline && (
        <p className="mt-1.5 text-xs text-scout-muted truncate italic">
          {topHeadline}
        </p>
      )}
    </button>
  );
}
