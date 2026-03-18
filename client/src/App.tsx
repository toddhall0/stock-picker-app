import { useState, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { CandidateList } from './components/CandidateList';
import { DetailPanel } from './components/DetailPanel';
import { AlertBanner } from './components/AlertBanner';
import { Disclaimer } from './components/Disclaimer';
import { useCandidates } from './hooks/useApi';
import { useSSE } from './hooks/useSSE';
import { ScoutCandidate, MarketStatus } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [sseCandidates, setSseCandidates] = useState<ScoutCandidate[] | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [newTickers, setNewTickers] = useState<Set<string>>(new Set());
  const prevTickersRef = useRef<Set<string>>(new Set());

  const { data, isLoading } = useCandidates();

  // Handle SSE updates
  useSSE(useCallback((msg) => {
    if (msg.candidates) {
      setSseCandidates(msg.candidates);

      // Detect new tickers
      const currentTickers = new Set(msg.candidates.map((c) => c.ticker));
      const newOnes = new Set<string>();
      for (const t of currentTickers) {
        if (prevTickersRef.current.size > 0 && !prevTickersRef.current.has(t)) {
          newOnes.add(t);
        }
      }
      if (newOnes.size > 0) {
        setNewTickers(newOnes);
        setAlertMessage(`New candidate${newOnes.size > 1 ? 's' : ''}: ${[...newOnes].join(', ')}`);
        setTimeout(() => setNewTickers(new Set()), 5000);
      }
      prevTickersRef.current = currentTickers;
    }
    if (msg.marketStatus) setMarketStatus(msg.marketStatus);
    if (msg.lastUpdated || msg.timestamp) setLastUpdated(msg.lastUpdated || msg.timestamp || null);
  }, []));

  const candidates = sseCandidates || data?.candidates || [];
  const mktStatus = marketStatus || data?.marketStatus || null;
  const updated = lastUpdated || data?.lastUpdated || null;

  const selectedCandidate = candidates.find((c) => c.ticker === selectedTicker) || null;

  return (
    <div className="min-h-screen bg-scout-bg text-scout-text flex flex-col scanline-bg">
      <Navbar
        marketStatus={mktStatus}
        lastUpdated={updated}
        isRefreshing={isLoading}
      />

      <AlertBanner message={alertMessage} />

      {/* Main Content */}
      <main className="flex-1 pt-12 flex flex-col lg:flex-row">
        {/* Candidate List */}
        <aside className="w-full lg:w-96 xl:w-[420px] border-r border-scout-border flex-shrink-0 flex flex-col lg:h-[calc(100vh-48px)]" aria-label="Candidate list">
          {candidates.length === 0 && !isLoading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center font-mono text-scout-muted">
                <div className="text-3xl mb-3">◎</div>
                <div className="text-sm">Scanning for candidates...</div>
                <div className="text-xs mt-1">Data loads automatically during market hours</div>
              </div>
            </div>
          ) : (
            <CandidateList
              candidates={candidates}
              selectedTicker={selectedTicker}
              onSelect={setSelectedTicker}
              newTickers={newTickers}
            />
          )}
        </aside>

        {/* Detail Panel */}
        <section className="flex-1 lg:h-[calc(100vh-48px)] overflow-hidden" aria-label="Candidate details">
          <DetailPanel candidate={selectedCandidate} />
        </section>
      </main>

      <Disclaimer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
