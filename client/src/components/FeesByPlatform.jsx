import { memo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from './ui/Card.jsx';
import { formatCurrency, formatPlatformLabel } from '../lib/format.js';

function FeesTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2 text-xs shadow-[var(--shadow)] backdrop-blur">
      <p className="font-medium text-[var(--text)]">{formatPlatformLabel(row.platform)}</p>
      <p className="mt-1 font-semibold text-[var(--text)]">{formatCurrency(row.amount)}</p>
    </div>
  );
}

const ACTIVE_BAR_STYLE = {
  fillOpacity: 1,
  stroke: 'rgba(56, 189, 248, 0.8)',
  strokeWidth: 1.5,
  filter: 'drop-shadow(0px 0px 10px rgba(56, 189, 248, 0.32))',
};

function FeesByPlatformComponent({ data, rangeLabel, onPlatformClick }) {
  const rows = data?.breakdown ?? [];
  const hasData = rows.some((r) => r.amount > 0);

  const handleClick = (_entry, _index, e) => {
    if (!onPlatformClick) return;
    const platform = _entry?.platform;
    if (platform) onPlatformClick(platform);
  };

  return (
    <Card
      title="Fees by platform"
      subtitle={`Processor and platform fee mix · ${rangeLabel}${
        onPlatformClick ? ' · click a bar to drill in' : ''
      }`}
    >
      <div className="h-[300px] w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-strong)] text-sm text-[var(--muted)]">
            No fee activity in this window for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="platform"
                width={126}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatPlatformLabel(v)}
              />
              <Tooltip content={<FeesTooltip />} cursor={false} />
              <Bar
                dataKey="amount"
                radius={[0, 999, 999, 0]}
                barSize={18}
                onClick={handleClick}
                style={onPlatformClick ? { cursor: 'pointer' } : undefined}
                activeBar={ACTIVE_BAR_STYLE}
              >
                {rows.map((entry, index) => (
                  <Cell key={entry.platform} fill={`var(--chart-${(index % 6) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export const FeesByPlatform = memo(FeesByPlatformComponent);

export function FeesByPlatformSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="h-4 w-48 rounded bg-[var(--card-2)]" />
      <div className="mt-6 h-72 rounded-xl bg-[var(--card-strong)]" />
    </div>
  );
}
