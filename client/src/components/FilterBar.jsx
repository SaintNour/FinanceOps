import { ReportingWindowPicker } from './ReportingWindowPicker.jsx';

const STATUSES = [
  { id: '', label: 'All statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
  { id: 'partially_refunded', label: 'Partially refunded' },
];

const SOURCE_SYSTEMS = [
  { id: '', label: 'All sources' },
  { id: 'mock', label: 'Sample data' },
  { id: 'shopify_export', label: 'Shopify export' },
  { id: 'paypal_export', label: 'PayPal export' },
  { id: 'manual', label: 'Manual' },
];

export function FilterBar({ range, customFrom, customTo, platform, status, sourceSystem, platformOptions, onChange }) {
  const platformSelectItems = [{ id: '', label: 'All platforms' }, ...(platformOptions || [])];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-full">
        <ReportingWindowPicker
          range={range}
          customFrom={customFrom}
          customTo={customTo}
          onChange={onChange}
        />
      </div>

      <div className="grid w-full flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:max-w-4xl">
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Platform
          </span>
          <select
            value={platform}
            onChange={(e) => onChange({ platform: e.target.value })}
            className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-[clamp(13px,0.88vw,14px)] text-[var(--text)] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--primary-ring)]"
          >
            {platformSelectItems.map((p) => (
              <option key={p.id || 'all'} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Source system
          </span>
          <select
            value={sourceSystem}
            onChange={(e) => onChange({ sourceSystem: e.target.value })}
            className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-[clamp(13px,0.88vw,14px)] text-[var(--text)] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--primary-ring)]"
          >
            {SOURCE_SYSTEMS.map((s) => (
              <option key={s.id || 'all'} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Order status
          </span>
          <select
            value={status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="mt-2 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 text-[clamp(13px,0.88vw,14px)] text-[var(--text)] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--primary-ring)]"
          >
            {STATUSES.map((s) => (
              <option key={s.id || 'all'} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
