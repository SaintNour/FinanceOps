export function Card({ className = '', children, title, subtitle, action }) {
  return (
    <section
      className={`h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] backdrop-blur-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_16px_32px_rgba(2,6,23,0.45)] ${className}`}
    >
      {(title || subtitle || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div>
            {title && (
              <h2 className="text-[clamp(13px,0.95vw,15px)] font-semibold tracking-wide text-[var(--text)]">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
