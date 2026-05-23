import { formatDate } from '../lib/format.js';

function badgeClass(mode) {
  if (mode === 'live') {
    return 'border-[var(--primary-ring)] bg-[var(--primary-soft)] text-[var(--text)]';
  }
  if (mode === 'mock') {
    return 'border-[var(--border)] bg-[var(--card-strong)] text-[var(--text)]';
  }
  return 'border-[var(--border)] bg-[var(--card-strong)] text-[var(--muted)]';
}

export function DataFreshness({ meta }) {
  if (!meta) return null;

  const mode = meta.freshness || 'mock';
  const label =
    mode === 'live' ? 'Using your database' : mode === 'mock' ? 'Sample data' : 'No data imported yet';

  const counts = meta.database
    ? [
        meta.rowCounts?.orders != null ? `${meta.rowCounts.orders} orders` : null,
        meta.rowCounts?.payments != null ? `${meta.rowCounts.payments} payments` : null,
        meta.rowCounts?.refunds != null ? `${meta.rowCounts.refunds} refunds` : null,
        meta.rowCounts?.fees != null ? `${meta.rowCounts.fees} fees` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Data coverage</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(mode)}`}
        >
          {label}
        </span>
        {counts ? <span className="text-xs text-[var(--muted)]">{counts}</span> : null}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Last import:{' '}
        <span className="text-[var(--text)]">{meta.lastImportAt ? formatDate(meta.lastImportAt) : '—'}</span>
      </p>
    </div>
  );
}
