export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 30,
  totalItems = 0,
}) {
  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--muted)]">
        Showing <span className="text-[var(--text)]">{start}</span>-
        <span className="text-[var(--text)]">{end}</span> of{' '}
        <span className="text-[var(--text)]">{totalItems}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="min-w-[84px] text-center text-xs text-[var(--muted)]">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
