import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '../api/phase3Api.js';
import { formatDate } from '../lib/format.js';

const ENTITY_OPTIONS = [
  { id: '', label: 'All entity types' },
  { id: 'order', label: 'Order' },
  { id: 'refund', label: 'Refund' },
  { id: 'payment', label: 'Payment' },
  { id: 'fee', label: 'Fee' },
  { id: 'period', label: 'Period' },
  { id: 'import_job', label: 'Import job' },
];

const ACTION_OPTIONS = [
  { id: '', label: 'All actions' },
  { id: 'adjustment.create', label: 'Adjustment · create' },
  { id: 'adjustment.update', label: 'Adjustment · update' },
  { id: 'adjustment.delete', label: 'Adjustment · delete' },
  { id: 'note.create', label: 'Note · create' },
  { id: 'note.delete', label: 'Note · delete' },
  { id: 'period.close', label: 'Period · close' },
  { id: 'period.reopen', label: 'Period · reopen' },
  { id: 'import.commit', label: 'Import · commit' },
  { id: 'import.blocked', label: 'Import · blocked' },
  { id: 'import.error', label: 'Import · error' },
];

const PAGE_SIZE = 50;

function diffValues(before, after) {
  if (!before && after) {
    return Object.entries(after).map(([k, v]) => ({ key: k, before: undefined, after: v }));
  }
  if (before && !after) {
    return Object.entries(before).map(([k, v]) => ({ key: k, before: v, after: undefined }));
  }
  if (!before && !after) return [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const out = [];
  for (const k of keys) {
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ key: k, before: a, after: b });
    }
  }
  return out;
}

function renderValue(v) {
  if (v === undefined) return <span className="text-[var(--muted)]">—</span>;
  if (v === null) return <span className="text-[var(--muted)]">null</span>;
  if (typeof v === 'object') return <code>{JSON.stringify(v)}</code>;
  return <code>{String(v)}</code>;
}

function DiffView({ before, after }) {
  const changes = diffValues(before, after);
  if (changes.length === 0) {
    return (
      <p className="text-[11px] text-[var(--muted)]">No field-level differences recorded.</p>
    );
  }
  return (
    <table className="w-full text-[11px]">
      <thead className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        <tr>
          <th className="py-1 pr-3 text-left">Field</th>
          <th className="py-1 pr-3 text-left">Before</th>
          <th className="py-1 pr-3 text-left">After</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={c.key} className="border-t border-[var(--border)]">
            <td className="py-1 pr-3 font-mono text-[var(--text)]">{c.key}</td>
            <td className="py-1 pr-3 font-mono text-rose-300">{renderValue(c.before)}</td>
            <td className="py-1 pr-3 font-mono text-emerald-300">{renderValue(c.after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [entityId, setEntityId] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const params = useMemo(() => {
    const q = { limit: PAGE_SIZE, offset };
    if (entityType) q.entity_type = entityType;
    if (action) q.action = action;
    if (actor) q.actor = actor;
    if (entityId) q.entity_id = entityId;
    return q;
  }, [entityType, action, actor, entityId, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAuditLog(params);
      setData(result || { rows: [], total: 0 });
    } catch (e) {
      setData({ rows: [], total: 0 });
      setError(e instanceof Error ? e.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [entityType, action, actor, entityId]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total = data.total || 0;
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
                  Audit log
                </h1>
                <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                  Every adjustment, note, period close, and import commit is recorded. Expand a row
                  to see the JSON diff between the before and after state.
                </p>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {total.toLocaleString('en-US')} total entries
              </p>
            </header>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-sm text-rose-100"
              >
                {error}
              </div>
            )}

            <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Entity type
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]"
                  >
                    {ENTITY_OPTIONS.map((o) => (
                      <option key={o.id || 'all'} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Action
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]"
                  >
                    {ACTION_OPTIONS.map((o) => (
                      <option key={o.id || 'all'} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Actor
                  <input
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    placeholder="e.g. system"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]"
                  />
                </label>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Entity id (exact match)
                  <input
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="shopify_export::ORD-..."
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm text-[var(--text)]"
                  />
                </label>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="w-8 px-2 py-2.5" />
                      <th className="px-3 py-2.5 font-medium">When</th>
                      <th className="px-3 py-2.5 font-medium">Action</th>
                      <th className="px-3 py-2.5 font-medium">Entity</th>
                      <th className="px-3 py-2.5 font-medium">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-[var(--muted)]">
                          Loading…
                        </td>
                      </tr>
                    ) : data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-[var(--muted)]">
                          No audit entries match the current filters.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((r) => {
                        const open = expanded.has(r.id);
                        return (
                          <Fragment key={r.id}>
                            <tr className="hover:bg-[var(--table-row-hover)]">
                              <td className="px-2 py-2.5 align-top">
                                <button
                                  type="button"
                                  onClick={() => toggle(r.id)}
                                  aria-label={open ? 'Collapse' : 'Expand'}
                                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:text-[var(--text)]"
                                >
                                  {open ? '−' : '+'}
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                                {formatDate(r.createdAt)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--text)]">
                                {r.action}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                                <span className="font-mono text-[var(--text)]">{r.entityType}</span>
                                {r.entityId ? (
                                  <span className="ml-2 font-mono text-[var(--muted)]">
                                    {r.entityId}
                                  </span>
                                ) : null}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                                {r.actor}
                              </td>
                            </tr>
                            {open && (
                              <tr>
                                <td colSpan={5} className="px-3 pb-4">
                                  <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-xs">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                        Changes
                                      </p>
                                      <div className="mt-2 overflow-x-auto">
                                        <DiffView before={r.before} after={r.after} />
                                      </div>
                                    </div>
                                    {r.metadata && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                          Metadata
                                        </p>
                                        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-2 text-[11px] text-[var(--text)]">
                                          {JSON.stringify(r.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
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

              {total > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                  <p>
                    Page {currentPage} of {maxPage}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={offset + PAGE_SIZE >= total}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
    </>
  );
}
