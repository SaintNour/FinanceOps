import { Card } from './ui/Card.jsx';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatOrderTaxTotal, formatPlatformLabel } from '../lib/format.js';

function PlatformBadge({ value }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
      {formatPlatformLabel(value)}
    </span>
  );
}

export function OrdersTable({ orders, maxRows = 12 }) {
  const rows = orders ?? [];
  const visibleRows = rows.slice(0, maxRows);

  return (
    <Card title="Recent orders" subtitle={`Newest ${maxRows} rows · filters applied`}>
      <div className="min-h-[286px] overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Order ID</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Platform</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Date</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Amount</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted)]">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((o) => (
                <tr key={o.order_id} className="transition-colors hover:bg-[var(--table-row-hover)]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--text)]">
                    {o.order_id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <PlatformBadge value={o.platform} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                    {formatDate(o.order_date)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-[var(--text)]">
                    {formatCurrency(o.gross_amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-[var(--muted)]">
                    {formatCurrency(formatOrderTaxTotal(o))}
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
            to="/orders"
            className="text-xs font-semibold text-[var(--primary)] transition hover:brightness-110"
            title="Open full orders page"
          >
            View all orders →
          </Link>
        </div>
      )}
    </Card>
  );
}
