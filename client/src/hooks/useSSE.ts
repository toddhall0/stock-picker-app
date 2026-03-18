import { useEffect, useRef, useCallback } from 'react';
import { ScoutCandidate, MarketStatus } from '../types';

interface SSEMessage {
  type: string;
  candidates?: ScoutCandidate[];
  marketStatus?: MarketStatus;
  lastUpdated?: string;
  timestamp?: string;
}

export function useSSE(onUpdate: (data: SSEMessage) => void): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const connect = useCallback(() => {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
    const eventSource = new EventSource(`${baseUrl}/api/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEMessage;
        onUpdateRef.current(data);
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    return eventSource;
  }, []);

  useEffect(() => {
    const eventSource = connect();
    return () => eventSource.close();
  }, [connect]);
}
