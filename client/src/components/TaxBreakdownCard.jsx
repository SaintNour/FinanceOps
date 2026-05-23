import { formatCurrency, formatPlatformLabel } from '../lib/format.js';

export function TaxBreakdownCard({ summary }) {
  if (!summary) return null;

  const rows = summary.taxByPlatform || [];
  const top = rows.slice(0, 6);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
      <h3 className="text-sm font-semibold text-[var(--text)]">Tax breakdown</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        State, county, and total tax follow the same reporting window and filters as revenue.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">State tax</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--text)]">
            {formatCurrency(summary.stateTax)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">County tax</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--text)]">
            {formatCurrency(summary.countyTax)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--primary)]">Total tax</p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums text-[var(--text)]">
            {formatCurrency(summary.totalTaxCollected)}
          </p>
        </div>
      </div>

      {top.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Tax by platform
          </p>
          <ul className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card-strong)]">
            {top.map((row) => (
              <li
                key={row.platform}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="text-[var(--text)]">{formatPlatformLabel(row.platform)}</span>
                <span className="font-semibold tabular-nums text-[var(--text)]">
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
