'use client';

// Lightweight chart components built on Recharts. This module is dynamically
// imported (ssr:false) so Recharts is split into its own async chunk and never
// blocks the initial page bundle.

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SparkProps {
  data: number[];
  color?: string;
  height?: number;
}

/* Tiny inline sparkline — no axes, no tooltip. For KPI cards. */
export function Sparkline({ data, color = '#00ff88', height = 22 }: SparkProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace('#', '')}`;
  return (
    <div style={{ width: 60, height }} className="kpi-spark">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface HistoryProps {
  data: { x: string | number; y: number }[];
  color?: string;
  height?: number;
  fmt?: (n: number) => string;
}

/* Small area chart with tooltip — for 14-day metric history. */
export function MiniHistory({
  data,
  color = '#00ff88',
  height = 90,
  fmt,
}: HistoryProps) {
  const id = `hist-${color.replace('#', '')}`;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, bottom: 2, left: 2, right: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.3 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0].payload as { x: string | number; y: number };
              return (
                <div
                  style={{
                    background: 'var(--panel-3)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                  }}
                >
                  <div style={{ color: 'var(--muted)' }}>{String(p.x)}</div>
                  <div style={{ fontWeight: 700, color }}>
                    {fmt ? fmt(p.y) : p.y}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
