import { memo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from './ui/Card.jsx';
import { formatCurrency } from '../lib/format.js';

function humanizeReason(reason) {
  if (!reason) return 'Unspecified';
  return String(reason)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ReasonTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2 text-xs shadow-[var(--shadow)] backdrop-blur">
      <p className="font-medium text-[var(--text)]">{humanizeReason(row.reason)}</p>
      <p className="mt-1 font-semibold text-[var(--text)]">{formatCurrency(row.amount)}</p>
      <p className="mt-0.5 text-[var(--muted)]">
        {row.count.toLocaleString('en-US')} refund{row.count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

const ACTIVE_BAR_STYLE = {
  fillOpacity: 1,
  stroke: 'rgba(56, 189, 248, 0.8)',
  strokeWidth: 1.5,
  filter: 'drop-shadow(0px 0px 10px rgba(56, 189, 248, 0.32))',
};

function RefundReasonsCardComponent({ data, rangeLabel }) {
  const rows = data?.breakdown ?? [];
  const hasData = rows.some((r) => r.amount > 0);

  return (
    <Card
      title="Refund reasons"
      subtitle={`Top refund categories by dollar value · ${rangeLabel}`}
    >
      <div className="h-[300px] w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-strong)] text-sm text-[var(--muted)]">
            No refund activity recorded in this window for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="reason"
                width={150}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={humanizeReason}
              />
              <Tooltip content={<ReasonTooltip />} cursor={false} />
              <Bar dataKey="amount" radius={[0, 999, 999, 0]} barSize={16} activeBar={ACTIVE_BAR_STYLE}>
                {rows.map((entry, index) => (
                  <Cell key={entry.reason} fill={`var(--chart-${(index % 6) + 1})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export const RefundReasonsCard = memo(RefundReasonsCardComponent);
