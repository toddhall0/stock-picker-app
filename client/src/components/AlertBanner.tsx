import { useState, useEffect } from 'react';

interface AlertBannerProps {
  message: string | null;
}

export function AlertBanner({ message }: AlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [displayMsg, setDisplayMsg] = useState('');

  useEffect(() => {
    if (message) {
      setDisplayMsg(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-12 left-0 right-0 z-40 bg-scout-amber/10 border-b border-scout-amber/30 px-4 py-2 text-center animate-pulse"
      role="alert"
    >
      <span className="text-xs font-mono text-scout-amber">
        ⚡ {displayMsg}
      </span>
    </div>
  );
}
