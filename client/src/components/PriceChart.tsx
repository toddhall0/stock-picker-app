import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { OHLCVBar } from '../types';

interface PriceChartProps {
  bars: OHLCVBar[];
  vwap: number;
  ema20: number;
}

export function PriceChart({ bars, vwap, ema20 }: PriceChartProps) {
  if (bars.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-scout-muted font-mono text-sm">
        No intraday data available
      </div>
    );
  }

  const data = bars.map((b) => ({
    time: new Date(b.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    price: b.close,
    high: b.high,
    low: b.low,
  }));

  const prices = bars.map((b) => b.close);
  const minPrice = Math.min(...prices) * 0.999;
  const maxPrice = Math.max(...prices) * 1.001;

  return (
    <div className="h-48" role="img" aria-label="Intraday price chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2a3a' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2a3a' }}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #1e2a3a',
              borderRadius: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
            }}
            labelStyle={{ color: '#6b7280' }}
            itemStyle={{ color: '#e5e7eb' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          {vwap > 0 && (
            <ReferenceLine y={vwap} stroke="#ffbf00" strokeDasharray="3 3" label={{ value: 'VWAP', fill: '#ffbf00', fontSize: 9 }} />
          )}
          {ema20 > 0 && (
            <ReferenceLine y={ema20} stroke="#00bfff" strokeDasharray="3 3" label={{ value: 'EMA', fill: '#00bfff', fontSize: 9 }} />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#39ff14"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#39ff14' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
