import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatDate } from '../lib/format.js';
import {
  fetchPayoutDetail,
  fetchReconciliationBanks,
  fetchReconciliationMatches,
  fetchReconciliationPayouts,
  fetchReconciliationRuns,
  fetchReconciliationSummary,
  manualReconciliationMatch,
  manualReconciliationUnmatch,
  markReconciliationReview,
  runReconciliation,
} from '../api/reconciliationApi.js';
import {
  exportReconciliationBankCsv,
  exportReconciliationMatchesCsv,
  exportReconciliationPayoutsCsv,
} from '../api/exportApi.js';
import { ENABLE_RECONCILIATION } from '../lib/features.js';

const TABS = [
  { id: 'payouts', label: 'Payouts' },
  { id: 'bank', label: 'Bank transactions' },
  { id: 'matches', label: 'Matches' },
  { id: 'runs', label: 'Run history' },
];

function badgeClass(status) {
  if (!status) return 'border-slate-600/50 bg-slate-900 text-slate-300';
  const s = String(status).toLowerCase();
  if (s === 'matched') return 'border-emerald-500/35 bg-emerald-950/45 text-emerald-100';
  if (s === 'partial') return 'border-amber-500/35 bg-amber-950/40 text-amber-100';
  if (s === 'needs_review') return 'border-rose-500/35 bg-rose-950/45 text-rose-100';
  if (s === 'unmatched') return 'border-slate-500/40 bg-slate-900 text-slate-300';
  return 'border-slate-600/50 bg-slate-900 text-slate-300';
}

function StatusBadge({ status, label }) {
  const text = label || (status ? String(status).replace(/_/g, ' ') : '—');
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${badgeClass(status)}`}
    >
      {text}
    </span>
  );
}

export default function ReconciliationPage() {
  const [tab, setTab] = useState('payouts');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');
  const [currency, setCurrency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [payoutStatus, setPayoutStatus] = useState('');
  const [bankStatus, setBankStatus] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  const [matchMethod, setMatchMethod] = useState('');

  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [matches, setMatches] = useState([]);
  const [runs, setRuns] = useState([]);

  const [selectedPayoutId, setSelectedPayoutId] = useState(null);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [running, setRunning] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);

  const commonFilters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      source_system: sourceSystem || undefined,
      currency: currency || undefined,
    }),
    [from, to, sourceSystem, currency],
  );

  const exportDisabled = loading || exportBusy || running;

  const runExport = async (fn) => {
    setExportError(null);
    setExportBusy(true);
    try {
      await fn();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportBusy(false);
    }
  };

  const loadSummary = useCallback(async () => {
    try {
      const s = await fetchReconciliationSummary();
      setSummary(s);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, b, m, r] = await Promise.all([
        fetchReconciliationPayouts({
          ...commonFilters,
          status: payoutStatus || undefined,
        }),
        fetchReconciliationBanks({
          ...commonFilters,
          bank_account: bankAccount || undefined,
          status: bankStatus || undefined,
        }),
        fetchReconciliationMatches({
          from: commonFilters.from,
          to: commonFilters.to,
          match_status: matchStatus || undefined,
          match_method: matchMethod || undefined,
        }),
        fetchReconciliationRuns(50),
      ]);
      setPayouts(p || []);
      setBanks(b || []);
      setMatches(m || []);
      setRuns(r || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [commonFilters, payoutStatus, bankAccount, bankStatus, matchStatus, matchMethod]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!selectedPayoutId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const d = await fetchPayoutDetail(selectedPayoutId);
        if (!cancelled) setDetail(d);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPayoutId]);

  const handleRunReconciliation = async () => {
    setRunning(true);
    setActionError(null);
    try {
      await runReconciliation({
        ...commonFilters,
        source_system: sourceSystem || undefined,
        currency: currency || undefined,
      });
      await loadSummary();
      await loadTables();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedPayoutId || !selectedBankId) {
      setActionError('Select a payout row and a bank row first.');
      return;
    }
    setActionError(null);
    try {
      await manualReconciliationMatch({
        payoutRecordId: selectedPayoutId,
        bankTransactionRecordId: selectedBankId,
        notes: manualNotes || undefined,
      });
      setManualNotes('');
      await loadSummary();
      await loadTables();
      if (selectedPayoutId) {
        const d = await fetchPayoutDetail(selectedPayoutId);
        setDetail(d);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Match failed');
    }
  };

  const handleUnmatch = async () => {
    if (!selectedMatchId) {
      setActionError('Select a match in the Matches tab.');
      return;
    }
    setActionError(null);
    try {
      await manualReconciliationUnmatch({ matchId: selectedMatchId });
      setSelectedMatchId(null);
      await loadSummary();
      await loadTables();
      if (selectedPayoutId) {
        try {
          setDetail(await fetchPayoutDetail(selectedPayoutId));
        } catch {
          setDetail(null);
        }
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unmatch failed');
    }
  };

  const handleMarkReview = async () => {
    if (!selectedMatchId) {
      setActionError('Select a match in the Matches tab.');
      return;
    }
    setActionError(null);
    try {
      await markReconciliationReview({ matchId: selectedMatchId, notes: reviewNotes || undefined });
      setReviewNotes('');
      await loadSummary();
      await loadTables();
      if (selectedPayoutId) {
        try {
          setDetail(await fetchPayoutDetail(selectedPayoutId));
        } catch {
          /* keep prior detail */
        }
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const payoutRowClass = (id) =>
    id === selectedPayoutId ? 'bg-sky-950/40 ring-1 ring-sky-500/40' : 'hover:bg-white/[0.03]';

  const bankRowClass = (id) =>
    id === selectedBankId ? 'bg-emerald-950/35 ring-1 ring-emerald-500/35' : 'hover:bg-white/[0.03]';

  const matchRowClass = (id) =>
    id === selectedMatchId ? 'bg-violet-950/35 ring-1 ring-violet-500/35' : 'hover:bg-white/[0.03]';

  return (
    <>
      <header className="border-b border-white/5 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
            Payout &amp; bank reconciliation
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Compare imported payout batches to bank deposits, review composition, and resolve exceptions.
            Conservative auto-matching — ambiguous rows stay in review.
          </p>
          {!ENABLE_RECONCILIATION && (
            <div className="mt-4 inline-flex rounded-full border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100/90">
              Advanced tool
            </div>
          )}
        </header>

        {summary && (
          <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            {[
              ['Total payouts', summary.totalPayouts],
              ['Matched', summary.matchedPayouts],
              ['Partial', summary.partialPayouts],
              ['Unmatched payouts', summary.unmatchedPayouts],
              ['Needs review', summary.needsReview],
              ['Unmatched bank rows', summary.unmatchedBankTransactions],
              ['Matched amount', formatCurrency(summary.matchedAmount)],
            ].map(([label, val]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-900/45 px-4 py-3 shadow-card"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-100">{val}</p>
              </div>
            ))}
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filters</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <label className="block text-xs text-slate-400">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-slate-100"
              />
            </label>
            <label className="block text-xs text-slate-400">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-slate-100"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Source system
              <input
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                placeholder="imported_report"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-slate-100 placeholder:text-slate-600"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Currency
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-slate-100 placeholder:text-slate-600"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Bank account filter
              <input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="name or last4"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-slate-100 placeholder:text-slate-600"
              />
            </label>
            <div className="flex flex-col justify-end gap-2 md:flex-row md:items-end">
              <button
                type="button"
                onClick={() => loadTables()}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/5"
              >
                Refresh data
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              disabled={running}
              onClick={handleRunReconciliation}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:opacity-50"
            >
              {running ? 'Running…' : 'Run reconciliation'}
            </button>
          </div>

          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">CSV exports</p>
            <p className="mt-1 text-xs text-slate-600">
              Exports respect date, source, and currency filters. Add tab-specific status filters (payout /
              bank / match) when those sections are visible.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() =>
                  runExport(() =>
                    exportReconciliationPayoutsCsv({
                      ...commonFilters,
                      status: payoutStatus || undefined,
                    }),
                  )
                }
                className="rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Export payouts CSV'}
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() =>
                  runExport(() =>
                    exportReconciliationBankCsv({
                      ...commonFilters,
                      bank_account: bankAccount || undefined,
                      status: 'unmatched',
                    }),
                  )
                }
                className="rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Export unmatched bank CSV'}
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() =>
                  runExport(() =>
                    exportReconciliationBankCsv({
                      ...commonFilters,
                      bank_account: bankAccount || undefined,
                      status: bankStatus || undefined,
                    }),
                  )
                }
                className="rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Export bank CSV (filtered)'}
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={() =>
                  runExport(() =>
                    exportReconciliationMatchesCsv({
                      ...commonFilters,
                      match_status: matchStatus || undefined,
                      match_method: matchMethod || undefined,
                    }),
                  )
                }
                className="rounded-lg border border-white/12 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Export matches CSV'}
              </button>
            </div>
            {exportError && (
              <p className="mt-2 text-sm text-rose-300" role="alert">
                {exportError}
              </p>
            )}
          </div>

          {actionError && (
            <p className="mt-3 text-sm text-rose-300" role="alert">
              {actionError}
            </p>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manual actions</p>
          <p className="mt-1 text-xs text-slate-500">
            Choose a payout (Payouts tab) and a bank row (Bank tab), then link. For unmatch / review, pick a
            row on Matches.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="text-xs text-slate-400">
              Payout #{selectedPayoutId ?? '—'} · Bank #{selectedBankId ?? '—'} · Match #{selectedMatchId ?? '—'}
            </div>
            <input
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Notes (manual link)"
              className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={handleManualMatch}
              className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-950/60"
            >
              Link payout + bank
            </button>
            <input
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Notes (review)"
              className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={handleMarkReview}
              className="rounded-lg border border-amber-500/40 bg-amber-950/35 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-950/55"
            >
              Mark match for review
            </button>
            <button
              type="button"
              onClick={handleUnmatch}
              className="rounded-lg border border-rose-500/40 bg-rose-950/35 px-4 py-2 text-sm font-semibold text-rose-50 hover:bg-rose-950/55"
            >
              Unmatch
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === t.id
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'payouts' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500">Payout status</span>
            <select
              value={payoutStatus}
              onChange={(e) => setPayoutStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="unmatched">Unmatched</option>
              <option value="matched">Matched</option>
              <option value="partial">Partial</option>
              <option value="needs_review">Needs review</option>
            </select>
          </div>
        )}
        {tab === 'bank' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500">Bank reconciliation status</span>
            <select
              value={bankStatus}
              onChange={(e) => setBankStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="unmatched">Unmatched</option>
              <option value="matched">Matched</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        )}
        {tab === 'matches' && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Match status
              <select
                value={matchStatus}
                onChange={(e) => setMatchStatus(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              >
                <option value="">All</option>
                <option value="matched">Matched</option>
                <option value="partial">Partial</option>
                <option value="needs_review">Needs review</option>
                <option value="unmatched">Unmatched</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Method
              <select
                value={matchMethod}
                onChange={(e) => setMatchMethod(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              >
                <option value="">All</option>
                <option value="auto_exact">auto_exact</option>
                <option value="auto_scored">auto_scored</option>
                <option value="manual">manual</option>
              </select>
            </label>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/35 p-4">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : tab === 'payouts' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">Payout</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Confidence</th>
                      <th className="px-2 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-2 py-10 text-center text-slate-500">
                          No payouts loaded. Import payout data or widen filters.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((p) => (
                        <tr
                          key={`${p.id}-${p.match_id || 'x'}`}
                          className={`cursor-pointer ${payoutRowClass(p.id)}`}
                          onClick={() =>
                            setSelectedPayoutId(p.id === selectedPayoutId ? null : p.id)
                          }
                        >
                          <td className="px-2 py-2 font-mono text-xs text-slate-500">{p.id}</td>
                          <td className="px-2 py-2 font-mono text-xs text-slate-200">
                            {p.payout_id}
                          </td>
                          <td className="px-2 py-2 text-slate-100">{formatCurrency(p.amount)}</td>
                          <td className="px-2 py-2 text-xs text-slate-400">
                            {p.payout_date ? formatDate(p.payout_date) : '—'}
                          </td>
                          <td className="px-2 py-2">
                            <StatusBadge
                              status={p.match_status || (p.match_id ? 'matched' : 'unmatched')}
                            />
                          </td>
                          <td className="px-2 py-2 text-xs text-slate-400">
                            {p.confidence_score != null ? p.confidence_score : '—'}
                          </td>
                          <td className="px-2 py-2 text-xs text-slate-500">{p.source_system}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : tab === 'bank' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-2">ID</th>
                      <th className="px-2 py-2">Posted</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Account</th>
                      <th className="px-2 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {banks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-10 text-center text-slate-500">
                          No bank transactions. Import a bank CSV from Data import.
                        </td>
                      </tr>
                    ) : (
                      banks.map((b) => (
                        <tr
                          key={b.id}
                          className={`cursor-pointer ${bankRowClass(b.id)}`}
                          onClick={() =>
                            setSelectedBankId(b.id === selectedBankId ? null : b.id)
                          }
                        >
                          <td className="px-2 py-2 font-mono text-xs text-slate-500">{b.id}</td>
                          <td className="px-2 py-2 text-xs text-slate-400">
                            {b.posted_date || b.transaction_date || '—'}
                          </td>
                          <td className="px-2 py-2 text-slate-100">{formatCurrency(b.amount)}</td>
                          <td className="px-2 py-2">
                            <StatusBadge status={b.reconciliation_status} />
                          </td>
                          <td className="px-2 py-2 text-xs text-slate-500">
                            {b.bank_account_name || '—'}{' '}
                            {b.bank_account_last4 ? `· ${b.bank_account_last4}` : ''}
                          </td>
                          <td className="max-w-xs truncate px-2 py-2 text-xs text-slate-400">
                            {b.description || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : tab === 'matches' ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Match ID</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Method</th>
                        <th className="px-2 py-2">Payout $</th>
                        <th className="px-2 py-2">Bank $</th>
                        <th className="px-2 py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {matches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-10 text-center text-slate-500">
                            No matches yet. Run reconciliation after payouts and bank data exist.
                          </td>
                        </tr>
                      ) : (
                        matches.map((m) => (
                          <tr
                            key={m.id}
                            className={`cursor-pointer ${matchRowClass(m.id)}`}
                            onClick={() =>
                              setSelectedMatchId(m.id === selectedMatchId ? null : m.id)
                            }
                          >
                            <td className="px-2 py-2 font-mono text-xs text-slate-400">{m.id}</td>
                            <td className="px-2 py-2">
                              <StatusBadge status={m.match_status} />
                            </td>
                            <td className="px-2 py-2 text-xs text-slate-400">{m.match_method}</td>
                            <td className="px-2 py-2 text-xs text-slate-200">
                              {formatCurrency(m.payout_amount)}
                            </td>
                            <td className="px-2 py-2 text-xs text-slate-200">
                              {formatCurrency(m.bank_amount)}
                            </td>
                            <td className="px-2 py-2 text-xs text-slate-400">
                              {m.confidence_score ?? '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Run</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Matched</th>
                      <th className="px-2 py-2">Partial</th>
                      <th className="px-2 py-2">Review</th>
                      <th className="px-2 py-2">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-10 text-center text-slate-500">
                          No runs recorded.
                        </td>
                      </tr>
                    ) : (
                      runs.map((r) => (
                        <tr key={r.id}>
                          <td className="px-2 py-2 font-mono text-xs text-slate-400">{r.id}</td>
                          <td className="px-2 py-2 text-xs text-slate-300">{r.status}</td>
                          <td className="px-2 py-2 text-xs text-slate-400">{r.total_matched}</td>
                          <td className="px-2 py-2 text-xs text-slate-400">{r.total_partial}</td>
                          <td className="px-2 py-2 text-xs text-slate-400">{r.total_needs_review}</td>
                          <td className="px-2 py-2 text-xs text-slate-500">
                            {r.started_at ? formatDate(r.started_at) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-200">Payout detail</h3>
            {!selectedPayoutId && (
              <p className="mt-3 text-sm text-slate-500">Select a payout row to inspect items.</p>
            )}
            {selectedPayoutId && detailLoading && (
              <p className="mt-3 text-sm text-slate-500">Loading detail…</p>
            )}
            {selectedPayoutId && !detailLoading && detail?.payout && (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-slate-500">Payout</p>
                  <p className="font-mono text-slate-100">{detail.payout.payout_id}</p>
                  <p className="mt-1 text-slate-300">
                    {formatCurrency(detail.payout.amount)} {detail.payout.currency}
                  </p>
                  <p className="text-xs text-slate-500">
                    {detail.payout.payout_date ? formatDate(detail.payout.payout_date) : '—'}
                  </p>
                </div>
                {detail.matches?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-slate-500">Bank match</p>
                    {detail.matches.map((m) => (
                      <div key={m.id} className="mt-2 rounded-lg border border-white/10 bg-slate-900/60 p-3 text-xs">
                        <StatusBadge status={m.match_status} />
                        <p className="mt-2 text-slate-300">
                          Bank #{m.bank_id} · {formatCurrency(m.bank_amount)}
                        </p>
                        <p className="text-slate-500">{m.bank_description || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-slate-500">Payout items ({detail.items?.length || 0})</p>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs text-slate-400">
                    {(detail.items || []).map((it) => (
                      <li key={it.id} className="rounded border border-white/5 bg-slate-900/40 px-2 py-1">
                        <span className="text-slate-200">{it.item_type}</span> ·{' '}
                        {formatCurrency(it.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Linked payments</p>
                  <p className="text-xs text-slate-400">{(detail.linkedPayments || []).length} rows</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Linked refunds</p>
                  <p className="text-xs text-slate-400">{(detail.linkedRefunds || []).length} rows</p>
                </div>
              </div>
            )}
          </aside>
        </div>
    </>
  );
}
