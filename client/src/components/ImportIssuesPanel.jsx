import { useMemo, useState } from 'react';

/**
 * Reusable collapsible panel that renders import-time issues.
 *
 * Accepts a list of { row, message, severity } where severity is
 * 'error' (default) or 'warning'.  Warnings default to open, errors
 * default to open only when there are <= 20 of them.
 */
export function ImportIssuesPanel({
  title,
  issues = [],
  tone = 'error',
  defaultOpen,
  filenameHint = 'import-issues',
}) {
  const total = issues.length;
  const initiallyOpen = defaultOpen ?? (total > 0 && total <= 20);
  const [open, setOpen] = useState(initiallyOpen);

  const csvBlob = useMemo(() => {
    if (total === 0) return null;
    const header = 'row,severity,message\n';
    const body = issues
      .map((iss) => {
        const row = iss.row == null ? '' : String(iss.row);
        const sev = iss.severity || tone || 'error';
        const msg = String(iss.message || '').replace(/"/g, '""');
        return `${row},${sev},"${msg}"`;
      })
      .join('\n');
    return new Blob([header + body + '\n'], { type: 'text/csv;charset=utf-8' });
  }, [issues, tone, total]);

  if (total === 0) return null;

  const download = () => {
    if (!csvBlob) return;
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameHint}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isError = tone === 'error';
  const containerClass = isError
    ? 'rounded-xl border border-rose-500/25 bg-rose-950/25 text-rose-50'
    : 'rounded-xl border border-amber-500/25 bg-amber-950/20 text-amber-50';
  const accent = isError ? 'text-rose-200' : 'text-amber-200';

  return (
    <div className={`${containerClass} px-4 py-3 text-xs`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 text-left font-semibold"
        >
          <span aria-hidden="true" className="inline-block w-3 text-center">
            {open ? '\u2212' : '+'}
          </span>
          <span className={accent}>{title}</span>
          <span className="text-[var(--muted)]">({total.toLocaleString('en-US')})</span>
        </button>
        <button
          type="button"
          onClick={download}
          className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-[var(--text)] transition hover:brightness-110"
        >
          Download CSV
        </button>
      </div>
      {open && (
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto pr-1 font-mono text-[11px] leading-relaxed">
          {issues.map((iss, idx) => (
            <li key={`${iss.row || idx}-${iss.message}`}>
              {iss.row != null ? (
                <span className="text-[var(--muted)]">Row {iss.row}:</span>
              ) : null}{' '}
              {iss.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Banner shown when the server rejects an import because its rows fall
 * in a month that has already been closed.
 */
export function BlockedPeriodsBanner({ periods = [], onDismiss }) {
  if (!periods || periods.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-semibold text-amber-200">Import blocked by closed period</p>
        <p className="mt-1 text-xs text-amber-100/90">
          Rows fall in {periods.length === 1 ? 'a closed month' : 'closed months'}:{' '}
          <span className="font-mono">{periods.join(', ')}</span>. Reopen the period in{' '}
          <a href="/periods" className="underline hover:brightness-110">
            Periods
          </a>{' '}
          or remove those rows from the CSV before retrying.
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="self-start rounded-md border border-amber-400/40 px-2 py-1 text-[11px] font-medium text-amber-100 transition hover:brightness-110 sm:self-auto"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
