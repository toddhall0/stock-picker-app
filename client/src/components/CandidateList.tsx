import { useState } from 'react';
import { ScoutCandidate, SortField, ActionFilter } from '../types';
import { CandidateCard } from './CandidateCard';

interface CandidateListProps {
  candidates: ScoutCandidate[];
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  newTickers: Set<string>;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'scoutScore', label: 'Scout Score' },
  { value: 'volumeRatio', label: 'Volume Ratio' },
  { value: 'changePercent', label: '% Change' },
  { value: 'aiConfidence', label: 'AI Confidence' },
];

const FILTER_OPTIONS: { value: ActionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'consider long', label: 'Long' },
  { value: 'consider short', label: 'Short' },
  { value: 'watch', label: 'Watch' },
];

export function CandidateList({ candidates, selectedTicker, onSelect, newTickers }: CandidateListProps) {
  const [sortBy, setSortBy] = useState<SortField>('scoutScore');
  const [filterAction, setFilterAction] = useState<ActionFilter>('all');

  const filtered = candidates.filter((c) => {
    if (filterAction === 'all') return true;
    return c.aiAnalysis?.suggested_action === filterAction;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'scoutScore': return b.scoutScore - a.scoutScore;
      case 'volumeRatio': return b.volumeRatio - a.volumeRatio;
      case 'changePercent': return Math.abs(b.changePercent) - Math.abs(a.changePercent);
      case 'aiConfidence': return (b.aiAnalysis?.confidence || 0) - (a.aiAnalysis?.confidence || 0);
      default: return 0;
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-3 border-b border-scout-border space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-scout-muted" htmlFor="sort-select">SORT</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="flex-1 bg-scout-bg border border-scout-border text-scout-text text-xs font-mono px-2 py-1 focus:border-scout-green focus:outline-none"
            aria-label="Sort candidates by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1" role="radiogroup" aria-label="Filter by action">
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilterAction(o.value)}
              className={`flex-1 text-xs font-mono py-1 px-2 border transition-colors ${
                filterAction === o.value
                  ? 'border-scout-green text-scout-green bg-scout-green/10'
                  : 'border-scout-border text-scout-muted hover:border-scout-muted'
              }`}
              role="radio"
              aria-checked={filterAction === o.value}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Cards */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2" role="list" aria-label="Stock candidates">
        {sorted.length === 0 && (
          <div className="text-center py-8 text-scout-muted font-mono text-sm">
            No candidates match current filters
          </div>
        )}
        {sorted.map((c) => (
          <div key={c.ticker} role="listitem">
            <CandidateCard
              candidate={c}
              isSelected={selectedTicker === c.ticker}
              onClick={() => onSelect(c.ticker)}
              isNew={newTickers.has(c.ticker)}
            />
          </div>
        ))}
      </div>

      {/* Count */}
      <div className="p-2 border-t border-scout-border">
        <span className="text-xs font-mono text-scout-muted">
          {sorted.length} / {candidates.length} candidates
        </span>
      </div>
    </div>
  );
}
