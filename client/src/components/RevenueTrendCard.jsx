import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../lib/format.js';

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/85 px-3 py-2 text-xs shadow-[0_14px_40px_rgba(2,6,23,0.55)] backdrop-blur-xl">
      <p className="text-slate-300">{label}</p>
      <p className="mt-1 font-semibold text-[var(--text)]">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function dayBounds(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function RevenueTrendCardComponent({ revenue, rangeLabel, onBucketClick }) {
  const points = revenue?.points ?? [];
  const hasData = points.some((p) => Number(p.amount) > 0);

  const handleClick = (e) => {
    if (!onBucketClick) return;
    const point = e?.activePayload?.[0]?.payload;
    if (!point?.date) return;
    const bounds = dayBounds(point.date);
    if (bounds) onBucketClick(bounds);
  };

  return (
    <section className="flex min-h-[440px] flex-1 flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] transition-all duration-200">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Revenue trend</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Imported payments over {rangeLabel.toLowerCase()}
            {onBucketClick ? ' · click a day to drill in' : ''}
          </p>
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        {!hasData ? (
          <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-strong)] text-sm text-[var(--muted)]">
            No revenue activity in this reporting window.
          </div>
        ) : (
          <div className="relative min-h-[280px] w-full flex-1 basis-0">
            <div className="absolute inset-0 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={points}
                  margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
                  onClick={handleClick}
                  style={onBucketClick ? { cursor: 'pointer' } : undefined}
                >
                  <defs>
                    <linearGradient id="rev-hero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={62}
                    tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={2.2}
                    fill="url(#rev-hero)"
                    fillOpacity={1}
                    activeDot={{
                      r: 4,
                      stroke: 'rgba(56, 189, 248, 0.95)',
                      strokeWidth: 2,
                      fill: '#0f172a',
                    }}
                    isAnimationActive
                    animationDuration={380}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export const RevenueTrendCard = memo(RevenueTrendCardComponent);
