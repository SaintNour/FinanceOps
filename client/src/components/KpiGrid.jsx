import { formatCurrency, formatPercent } from '../lib/format.js';

const items = [
  { key: 'grossRevenue', label: 'Gross revenue', format: 'currency' },
  { key: 'refundRate', label: 'Refund rate', format: 'percent' },
  { key: 'totalRefundAmount', label: 'Total refund amount', format: 'currency' },
  { key: 'totalFees', label: 'Total fees', format: 'currency' },
  { key: 'totalOrders', label: 'Total orders', format: 'number' },
];

function formatValue(format, value) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return formatPercent(value);
  if (format === 'number') return value == null ? '—' : Number(value).toLocaleString('en-US');
  return String(value ?? '—');
}

export function KpiGrid({ summary }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-slate-950 p-6 shadow-[0_18px_50px_rgba(16,185,129,0.18)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-300/10 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/80">Net revenue</p>
        <p className="mt-3 text-4xl font-semibold tracking-tight text-emerald-50 sm:text-5xl">
          {formatCurrency(summary.netRevenue)}
        </p>
        <p className="mt-3 text-xs text-emerald-100/70">
          Primary KPI · reporting window summary (comparison-ready)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const raw = summary[item.key];
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05]"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-100">
                {formatValue(item.format, raw)}
              </p>
              {item.key === 'refundRate' && (
                <p className="mt-2 text-[11px] text-slate-500">
                  {summary.refundedOrders ?? 0} of {summary.completedOrders ?? 0} completed orders
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-2xl border border-emerald-400/20 bg-slate-900/60 p-6">
        <div className="h-3 w-28 rounded bg-slate-800" />
        <div className="mt-4 h-10 w-52 rounded bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="animate-pulse rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-4"
          >
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="mt-3 h-8 w-32 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
