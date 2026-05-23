import { useEffect, useMemo, useState } from 'react';
import { fetchDrillDown } from '../api/financeApi.js';
import { toUserFacingApiError } from '../api/userError.js';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatPlatformLabel,
} from '../lib/format.js';

const MONEY_METRICS = new Set([
  'grossRevenue',
  'netRevenue',
  'totalRefundAmount',
  'totalFees',
  'totalTaxCollected',
]);

function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRange(range) {
  if (!range) return '';
  if (!range.start && !range.end) return 'All time';
  const start = range.start ? shortDate(range.start) : '…';
  const end = range.end ? shortDate(range.end) : '…';
  return `${start} - ${end}`;
}

function downloadRowsAsCsv(title, rows) {
  const header =
    'display_id,source_system,source_id,date,platform,status,raw_amount,adjustment_total,adjusted_amount,note_count\n';
  const body = rows
    .map((r) => {
      const parts = [
        r.display_id,
        r.source_system,
        r.source_id,
        r.date,
        r.platform,
        r.status || '',
        Number(r.raw_amount || 0).toFixed(2),
        Number(r.adjustment_total || 0).toFixed(2),
        Number(r.adjusted_amount || r.raw_amount || 0).toFixed(2),
        r.note_count || 0,
      ].map((v) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      return parts.join(',');
    })
    .join('\n');
  const blob = new Blob([header + body + '\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Right-hand drawer that shows the rows backing a KPI / chart bucket.
 * Controlled by the parent: pass `open={true}` and the query params.
 */
export function KpiDrillDownDrawer({ open, onClose, request }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestKey = useMemo(() => (request ? JSON.stringify(request) : null), [request]);

  useEffect(() => {
    if (!open || !request) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const d = await fetchDrillDown(request);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) {
          setError(toUserFacingApiError(e, 'Unable to load details. Please try again.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, requestKey, request]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const metric = request?.metric;
  const isMoney = MONEY_METRICS.has(metric);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/60"
      />
      <aside className="relative flex h-full min-h-0 w-full max-w-[640px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">Details</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">
              {data?.label || 'Loading…'}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {data ? formatRange(data.range) : ''}
              {data?.filters?.platform ? ` · ${formatPlatformLabel(data.filters.platform)}` : ''}
              {data?.filters?.status ? ` · ${data.filters.status}` : ''}
              {data?.filters?.sourceSystem ? ` · ${data.filters.sourceSystem}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            Close
          </button>
        </header>

        {loading && (
          <div className="flex flex-1 items-center justify-center bg-[var(--bg-elevated)] text-sm text-[var(--muted)]">
            Loading rows…
          </div>
        )}

        {error && !loading && (
          <div className="m-5 shrink-0 rounded-xl border border-rose-500/30 bg-rose-950/90 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {data && !loading && !error && (!data.totals || !Array.isArray(data.rows)) && (
          <div className="m-5 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            Details could not be displayed. Please close and try again.
          </div>
        )}

        {data && !loading && !error && data.totals && Array.isArray(data.rows) && (
          <>
            <section className="grid grid-cols-2 gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Rows</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {data.totals.shownCount.toLocaleString('en-US')}
                  {data.totals.shownCount < data.totals.rowCount && (
                    <span className="text-[var(--muted)]">
                      {' '}
                      of {data.totals.rowCount.toLocaleString('en-US')}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Raw {isMoney ? 'total' : 'count'}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {isMoney
                    ? formatCurrency(data.totals.rawAmount)
                    : data.totals.rowCount.toLocaleString('en-US')}
                </p>
              </div>
              {data.totals.adjustmentsSupported ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Adjusted total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {isMoney
                      ? formatCurrency(data.totals.adjustedAmount)
                      : data.totals.rowCount.toLocaleString('en-US')}
                  </p>
                  {data.totals.adjustmentAmount !== 0 && (
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {formatCurrency(data.totals.adjustmentAmount)} in adjustments
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Adjustments
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Requires database mode
                  </p>
                </div>
              )}

              {metric === 'netRevenue' && (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Refunds in window
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {formatCurrency(data.totals.refundsAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Fees in window
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {formatCurrency(data.totals.feesAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Net = payments - refunds - fees
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {formatCurrency(
                        (data.totals.adjustedAmount || data.totals.rawAmount) -
                          (data.totals.refundsAmount || 0) -
                          (data.totals.feesAmount || 0),
                      )}
                    </p>
                  </div>
                </>
              )}

              {metric === 'refundRate' && (
                <>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Completed-like orders
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {(data.totals.completedOrdersCount || 0).toLocaleString('en-US')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Refunded orders
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {(data.totals.refundedOrdersCount || 0).toLocaleString('en-US')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Rate
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {formatPercent((data.totals.rate || 0) * 100, 2)}
                    </p>
                  </div>
                </>
              )}
            </section>

            <p className="bg-[var(--bg-elevated)] px-5 pt-3 text-[11px] text-[var(--muted)]">{data.note}</p>

            <div className="flex items-center justify-between gap-2 bg-[var(--bg-elevated)] px-5 py-3">
              <p className="text-[11px] text-[var(--muted)]">
                Tip: rows include any linked adjustments and note counts when the database is connected.
              </p>
              <button
                type="button"
                onClick={() => downloadRowsAsCsv(`drill-${metric}`, data.rows)}
                disabled={data.rows.length === 0}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[var(--bg-soft)]">
              {data.rows.length === 0 ? (
                <div className="flex h-full min-h-[200px] items-center justify-center bg-[var(--bg-soft)] text-sm text-[var(--muted)]">
                  No rows match this selection.
                </div>
              ) : (
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--bg-soft)] text-[10px] uppercase tracking-wider text-[var(--muted)] shadow-[0_1px_0_var(--border)]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">ID</th>
                      <th className="px-4 py-2 font-medium">Platform</th>
                      <th className="px-4 py-2 text-right font-medium">Raw</th>
                      <th className="px-4 py-2 text-right font-medium">Adj.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {data.rows.map((r) => (
                      <tr
                        key={`${r.source_system}-${r.source_id}`}
                        className="hover:bg-[var(--table-row-hover)]"
                      >
                        <td className="px-4 py-2 align-top text-[var(--muted)]">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <p className="font-mono text-[11px] text-[var(--text)]">{r.display_id}</p>
                          {r.label ? (
                            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{r.label}</p>
                          ) : null}
                          {r.note_count > 0 && (
                            <p className="mt-0.5 text-[10px] text-[var(--primary)]">
                              {r.note_count} note{r.note_count === 1 ? '' : 's'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top text-[var(--text)]">
                          {formatPlatformLabel(r.platform)}
                          {r.status ? (
                            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{r.status}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right align-top font-mono text-[var(--text)]">
                          {formatCurrency(r.raw_amount)}
                        </td>
                        <td className="px-4 py-2 text-right align-top font-mono">
                          {r.adjustment_total ? (
                            <span className="text-[var(--primary)]">
                              {r.adjustment_total > 0 ? '+' : ''}
                              {formatCurrency(r.adjustment_total)}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
