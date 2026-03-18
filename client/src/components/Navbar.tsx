import { useState, useEffect, useCallback } from 'react';
import { MarketStatus } from '../types';
import { triggerRefresh } from '../hooks/useApi';

interface NavbarProps {
  marketStatus: MarketStatus | null;
  lastUpdated: string | null;
  isRefreshing: boolean;
}

export function Navbar({ marketStatus, lastUpdated, isRefreshing }: NavbarProps) {
  const [etTime, setEtTime] = useState('');
  const [refreshMsg, setRefreshMsg] = useState('');

  useEffect(() => {
    const tick = () => {
      setEtTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const result = await triggerRefresh();
      setRefreshMsg(result.message);
      setTimeout(() => setRefreshMsg(''), 3000);
    } catch {
      setRefreshMsg('Refresh failed');
      setTimeout(() => setRefreshMsg(''), 3000);
    }
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-scout-panel border-b border-scout-border px-4 py-2" role="navigation" aria-label="Main navigation">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-scout-green text-lg font-bold tracking-wider">
            INTRADAY<span className="text-scout-amber">SCOUT</span>
          </h1>
          <span className="hidden sm:inline text-scout-muted text-xs font-mono">v1.0</span>
        </div>

        {/* Market Clock */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-scout-muted">ET</span>
            <span className="text-scout-text">{etTime}</span>
          </div>

          {marketStatus && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  marketStatus.isOpen ? 'bg-scout-green animate-pulse' : 'bg-scout-red'
                }`}
                aria-label={marketStatus.isOpen ? 'Market open' : 'Market closed'}
              />
              <span className={marketStatus.isOpen ? 'text-scout-green' : 'text-scout-red'}>
                {marketStatus.isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
              </span>
            </div>
          )}

          {lastUpdated && (
            <span className="hidden md:inline text-scout-muted">
              Last: {new Date(lastUpdated).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Refresh Button */}
        <div className="flex items-center gap-2">
          {refreshMsg && <span className="text-xs text-scout-amber font-mono">{refreshMsg}</span>}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 text-xs font-mono border border-scout-green text-scout-green hover:bg-scout-green hover:text-scout-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh stock data"
          >
            {isRefreshing ? 'RUNNING...' : 'REFRESH'}
          </button>
        </div>
      </div>
    </nav>
  );
}
