import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../lib/format.js';

function pct(covered, total) {
  if (!total || total <= 0) return '0';
  return ((100 * covered) / total).toFixed(0);
}

export function ReconciliationTrustStrip({ reconciliation, database }) {
  const dbOn = database === true;

  if (!dbOn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/35 px-5 py-4 text-sm text-slate-500">
        Reconciliation needs a connected database. Ask your administrator to enable it to see
        payout and bank matching here.
      </div>
    );
  }

  if (reconciliation == null) {
    return (
      <div
        className="rounded-2xl border border-amber-500/20 bg-amber-950/25 px-5 py-4 text-sm text-amber-100/90"
        role="status"
      >
        Reconciliation summary could not be loaded. Refresh the page or check the API.
      </div>
    );
  }

  const {
    database: reconDb,
    totalPayouts,
    matchedPayouts,
    partialPayouts,
    unmatchedPayouts,
    unmatchedBankTransactions,
    needsReview,
    matchedAmount,
    unmatchedPayoutAmount,
    lastRunAt,
  } = reconciliation;

  if (!reconDb) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/35 px-5 py-4 text-sm text-slate-500">
        Reconciliation data is unavailable (database not reachable).
      </div>
    );
  }

  const coverage =
    totalPayouts > 0 ? pct(matchedPayouts + partialPayouts, totalPayouts) : '—';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reconciliation</p>
          <p className="mt-1 text-sm text-slate-400">
            Coverage{' '}
            <span className="font-semibold text-slate-200">{coverage}%</span> of payouts · Last run{' '}
            <span className="text-slate-300">{lastRunAt ? formatDate(lastRunAt) : '—'}</span>
          </p>
          {totalPayouts === 0 && (
            <p className="mt-2 text-xs text-slate-600">
              No payout batches in the database yet — import payment and bank CSVs before reconciling.
            </p>
          )}
        </div>
        <Link
          to="/reconciliation"
          className="rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-900"
        >
          View reconciliation
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Unmatched payout $
          </p>
          <p className="mt-0.5 text-sm font-medium text-amber-100/90">
            {formatCurrency(unmatchedPayoutAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Unmatched banks
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">{unmatchedBankTransactions}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Needs review
          </p>
          <p className="mt-0.5 text-sm font-medium text-rose-100/90">{needsReview}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Matched $
          </p>
          <p className="mt-0.5 text-sm font-medium text-emerald-100/90">
            {formatCurrency(matchedAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Partial
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">{partialPayouts}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Unmatched payouts
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">{unmatchedPayouts}</p>
        </div>
      </div>
    </div>
  );
}
