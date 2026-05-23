import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFinanceMeta, fetchRefunds } from '../api/financeApi.js';
import { fetchAdjustmentsSummary } from '../api/phase3Api.js';
import { EntityAdjustmentsPanel } from '../components/EntityAdjustmentsPanel.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { formatCurrency, formatDate, formatPlatformLabel } from '../lib/format.js';
import { toUserFacingApiError } from '../api/userError.js';

const PAGE_SIZE = 30;

const RANGE_OPTIONS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

const SOURCE_OPTIONS = [
  { id: '', label: 'All sources' },
  { id: 'mock', label: 'Sample data' },
  { id: 'shopify_export', label: 'Shopify export' },
  { id: 'paypal_export', label: 'PayPal export' },
  { id: 'manual', label: 'Manual' },
];

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
      {status || 'unknown'}
    </span>
  );
}

export default function RefundsPage() {
  const [range, setRange] = useState('30d');
  const [platform, setPlatform] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platformOptions, setPlatformOptions] = useState([]);
  const [databaseEnabled, setDatabaseEnabled] = useState(false);
  const [adjustmentSummary, setAdjustmentSummary] = useState(new Map());
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    fetchFinanceMeta()
      .then((m) => {
        setPlatformOptions(m?.platforms || []);
        setDatabaseEnabled(Boolean(m?.database));
      })
      .catch(() => setPlatformOptions([]));
  }, []);

  const refreshAdjustmentSummary = useCallback(async () => {
    if (!databaseEnabled) {
      setAdjustmentSummary(new Map());
      return;
    }
    try {
      const summary = await fetchAdjustmentsSummary('refund');
      const map = new Map();
      for (const s of summary || []) {
        map.set(`${s.source_system}::${s.source_id}`, s);
      }
      setAdjustmentSummary(map);
    } catch {
      setAdjustmentSummary(new Map());
    }
  }, [databaseEnabled]);

  useEffect(() => {
    refreshAdjustmentSummary();
  }, [refreshAdjustmentSummary]);

  const toggleExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const platformSelectItems = useMemo(
    () => [{ id: '', label: 'All platforms' }, ...platformOptions],
    [platformOptions],
  );

  const query = useMemo(() => {
    const q = { range, limit: 500 };
    if (platform) q.platform = platform;
    if (sourceSystem) q.source_system = sourceSystem;
    return q;
  }, [range, platform, sourceSystem]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRefunds(query);
      setRows(data || []);
    } catch (e) {
      setRows([]);
      setError(toUserFacingApiError(e, 'Unable to load refunds. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, platform, sourceSystem]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visibleRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Refunds</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Full imported refunds dataset with filters and pagination.
            </p>
          </div>
          <p className="text-xs text-[var(--muted)]">Showing {rows.length.toLocaleString()} filtered rows</p>
        </header>

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Reporting window
              <select value={range} onChange={(e) => setRange(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]">
                {RANGE_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Platform
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]">
                {platformSelectItems.map((opt) => <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Source system
              <select value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]">
                {SOURCE_OPTIONS.map((opt) => <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
          {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="w-8 px-2 py-2.5" />
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Refund ID</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Order ID</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Platform</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Date</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Amount</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium text-right">Adjusted</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--muted)]">Loading refunds...</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-[var(--muted)]">No refunds found for the selected filters.</td></tr>
                ) : (
                  visibleRows.map((r) => {
                    const sourceId = r.source_id || r.refund_id;
                    const key = `${r.source_system}::${sourceId}`;
                    const summary = adjustmentSummary.get(key);
                    const adjustmentTotal = summary ? Number(summary.total) : 0;
                    const adjustedAmount = Number(r.refund_amount || 0) + adjustmentTotal;
                    const isOpen = expanded.has(key);
                    return (
                      <Fragment key={key}>
                        <tr className="hover:bg-[var(--table-row-hover)]">
                          <td className="px-2 py-2.5 align-top">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(key)}
                              aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--text)]"
                            >
                              {isOpen ? '−' : '+'}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--text)]">
                            {r.refund_id}
                            {summary?.note_count > 0 && (
                              <span className="ml-2 inline-flex rounded-full border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--text)]">
                                {summary.note_count} note{summary.note_count === 1 ? '' : 's'}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">{r.order_id || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5"><PlatformBadge value={r.platform} /></td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">{formatDate(r.refund_date)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--text)]">{formatCurrency(r.refund_amount)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums">
                            {adjustmentTotal !== 0 ? (
                              <span className="font-semibold text-[var(--primary)]">
                                {formatCurrency(adjustedAmount)}
                                <span className="ml-1 text-[10px] text-[var(--muted)]">
                                  ({adjustmentTotal > 0 ? '+' : ''}
                                  {formatCurrency(adjustmentTotal)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5"><RefundStatusBadge status={r.refund_status} /></td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="px-3 pb-4">
                              <EntityAdjustmentsPanel
                                entityType="refund"
                                sourceSystem={r.source_system}
                                sourceId={sourceId}
                                databaseEnabled={databaseEnabled}
                                onChange={refreshAdjustmentSummary}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={rows.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
    </>
  );
}
