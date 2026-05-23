import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listClosedPeriods,
  closePeriod,
  reopenPeriod,
} from '../api/phase3Api.js';
import { formatDate } from '../lib/format.js';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildLast24Months() {
  const out = [];
  const now = new Date();
  const baseYear = now.getUTCFullYear();
  const baseMonth = now.getUTCMonth() + 1;
  for (let i = 0; i < 24; i += 1) {
    let month = baseMonth - i;
    let year = baseYear;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    out.push({ year, month });
  }
  return out;
}

function keyFor(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClosedPeriods();
      setPeriods(data || []);
    } catch (e) {
      setPeriods([]);
      setError(e instanceof Error ? e.message : 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closedMap = useMemo(() => {
    const m = new Map();
    for (const p of periods) m.set(keyFor(p.year, p.month), p);
    return m;
  }, [periods]);

  const months = useMemo(() => buildLast24Months(), []);

  const handleClose = async (year, month) => {
    setBusy(keyFor(year, month));
    setError(null);
    try {
      await closePeriod({ year, month, reason });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close period');
    } finally {
      setBusy(null);
    }
  };

  const handleReopen = async (year, month) => {
    setBusy(keyFor(year, month));
    setError(null);
    try {
      await reopenPeriod(year, month, { reason });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reopen period');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
                  Period close
                </h1>
                <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                  Close a month to block new CSV imports that fall inside it. Reopen a period to
                  receive late data. Every close / reopen is recorded in the audit log.
                </p>
              </div>
            </header>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-sm text-rose-100"
              >
                {error}
              </div>
            )}

            <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Reason (optional, attached to the audit entry)
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. quarterly close"
                  className="mt-2 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
            </section>

            <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
              {loading ? (
                <p className="text-sm text-[var(--muted)]">Loading periods…</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="min-w-full divide-y divide-[var(--border)] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Month</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Closed at</th>
                        <th className="px-3 py-2.5 font-medium">Closed by</th>
                        <th className="px-3 py-2.5 font-medium">Reason</th>
                        <th className="px-3 py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {months.map(({ year, month }) => {
                        const key = keyFor(year, month);
                        const closed = closedMap.get(key);
                        return (
                          <tr key={key} className="hover:bg-[var(--table-row-hover)]">
                            <td className="whitespace-nowrap px-3 py-2.5 font-medium text-[var(--text)]">
                              {MONTH_LABELS[month - 1]} {year}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5">
                              {closed ? (
                                <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                                  Closed
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                                  Open
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                              {closed ? formatDate(closed.closedAt) : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                              {closed ? closed.closedBy : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-[var(--muted)]">
                              {closed?.reason || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right">
                              {closed ? (
                                <button
                                  type="button"
                                  disabled={busy === key}
                                  onClick={() => handleReopen(year, month)}
                                  className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
                                >
                                  {busy === key ? '…' : 'Reopen'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy === key}
                                  onClick={() => handleClose(year, month)}
                                  className="rounded-md border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--text)] transition hover:brightness-110 disabled:opacity-40"
                                >
                                  {busy === key ? '…' : 'Close'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
    </>
  );
}
