import { Card } from './ui/Card.jsx';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatPlatformLabel } from '../lib/format.js';

function PlatformBadge({ value }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
      {formatPlatformLabel(value)}
    </span>
  );
}

function RefundStatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const tone =
    s === 'succeeded'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : s === 'pending'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
        : 'border-rose-400/30 bg-rose-500/10 text-rose-200';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {status}
    </span>
  );
}

export function RefundsTable({ refunds, maxRows = 12 }) {
  const rows = refunds ?? [];
  const visibleRows = rows.slice(0, maxRows);

  return (
    <Card title="Recent refunds" subtitle={`Newest ${maxRows} rows · filters applied`}>
      <div className="min-h-[286px] overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Refund ID</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Platform</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Date</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Amount</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted)]">
                  No refunds match the current filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((r) => (
                <tr key={r.refund_id} className="transition-colors hover:bg-[var(--table-row-hover)]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--text)]">
                    {r.refund_id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <PlatformBadge value={r.platform} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                    {formatDate(r.refund_date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[var(--text)]">
                    {formatCurrency(r.refund_amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <RefundStatusBadge status={r.refund_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <div className="mt-3 border-t border-[var(--border)] pt-3 text-right">
          <Link
            to="/refunds"
            className="text-xs font-semibold text-[var(--primary)] transition hover:brightness-110"
            title="Open full refunds page"
          >
            View all refunds →
          </Link>
        </div>
      )}
    </Card>
  );
}
