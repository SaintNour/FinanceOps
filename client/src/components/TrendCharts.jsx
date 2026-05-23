import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from './ui/Card.jsx';
import { formatCurrency } from '../lib/format.js';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function TrendPanel({ title, subtitle, data, color, id, emptyLabel }) {
  const hasData = data?.some((d) => d.amount > 0);

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="h-72 w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40 text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${id})`}
                fillOpacity={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function TrendCharts({ revenue, refunds, rangeLabel }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <TrendPanel
        title="Revenue trend"
        subtitle={`Successful payment volume · ${rangeLabel}`}
        data={revenue?.points}
        color="#34d399"
        id="rev"
        emptyLabel="No revenue in this window for the selected filters."
      />
      <TrendPanel
        title="Refund trend"
        subtitle={`Succeeded refunds · ${rangeLabel}`}
        data={refunds?.points}
        color="#f87171"
        id="ref"
        emptyLabel="No refunds in this window for the selected filters."
      />
    </div>
  );
}

export function TrendChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {[1, 2].map((k) => (
        <div
          key={k}
          className="animate-pulse rounded-2xl border border-white/5 bg-slate-900/50 p-6"
        >
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="mt-6 h-64 rounded-xl bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}
