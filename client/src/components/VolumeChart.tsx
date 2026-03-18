import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { OHLCVBar } from '../types';

interface VolumeChartProps {
  bars: OHLCVBar[];
  averageVolume: number;
}

export function VolumeChart({ bars, averageVolume }: VolumeChartProps) {
  if (bars.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-scout-muted font-mono text-sm">
        No volume data available
      </div>
    );
  }

  const data = bars.map((b) => ({
    time: new Date(b.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    volume: b.volume,
  }));

  // Normalize average volume to per-minute for the reference line
  const avgPerMinute = averageVolume / 390; // 390 trading minutes per day

  return (
    <div className="h-32" role="img" aria-label="Intraday volume chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2a3a' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2a3a' }}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #1e2a3a',
              borderRadius: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
            }}
            formatter={(value: number) => [value.toLocaleString(), 'Volume']}
          />
          {avgPerMinute > 0 && (
            <ReferenceLine y={avgPerMinute} stroke="#ffbf00" strokeDasharray="3 3" label={{ value: 'AVG', fill: '#ffbf00', fontSize: 9 }} />
          )}
          <Bar dataKey="volume" fill="#39ff1440" stroke="#39ff14" strokeWidth={0.5} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
