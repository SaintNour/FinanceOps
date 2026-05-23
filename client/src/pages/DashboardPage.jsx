import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportFinanceSummaryCsv } from '../api/exportApi.js';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard.js';
import { useDrillDown } from '../hooks/useDrillDown.js';
import { listClosedPeriods } from '../api/phase3Api.js';
import { DataFreshness } from '../components/DataFreshness.jsx';
import { FilterBar } from '../components/FilterBar.jsx';
import { FeesByPlatform, FeesByPlatformSkeleton } from '../components/FeesByPlatform.jsx';
import { FeesByTypeCard } from '../components/FeesByTypeCard.jsx';
import { RefundReasonsCard } from '../components/RefundReasonsCard.jsx';
import { OrdersTable } from '../components/OrdersTable.jsx';
import { RefundsTable } from '../components/RefundsTable.jsx';
import { SalesPerformanceCard } from '../components/SalesPerformanceCard.jsx';
import { RevenueTrendCard } from '../components/RevenueTrendCard.jsx';
import { ReconciliationTrustStrip } from '../components/ReconciliationTrustStrip.jsx';
import { TaxBreakdownCard } from '../components/TaxBreakdownCard.jsx';
import { KpiDrillDownDrawer } from '../components/KpiDrillDownDrawer.jsx';
import { ENABLE_RECONCILIATION } from '../lib/features.js';
import { formatCurrency, formatPercent, formatPlatformLabel } from '../lib/format.js';
import { formatCustomRangeLabel, monthKeysTouchingInclusiveRange } from '../lib/dateKit/index.js';

const RANGE_LABELS = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };
const DASHBOARD_TABLE_ROWS = 10;

const SECONDARY_KPIS = [
  { key: 'grossRevenue', label: 'Gross revenue', format: 'currency' },
  { key: 'refundRate', label: 'Refund rate', format: 'percent' },
  { key: 'totalRefundAmount', label: 'Total refund amount', format: 'currency' },
  { key: 'totalFees', label: 'Total fees', format: 'currency' },
  { key: 'totalTaxCollected', label: 'Total tax collected', format: 'currency' },
  { key: 'totalOrders', label: 'Total orders', format: 'number' },
];

function formatKpiValue(format, value) {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return formatPercent(value);
  if (format === 'number') return value == null ? '—' : Number(value).toLocaleString('en-US');
  return String(value ?? '—');
}

export default function DashboardPage() {
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);

  const dashboard = useFinanceDashboard({
    range,
    customFrom,
    customTo,
    platform,
    status,
    sourceSystem,
  });

  const drillBase = useMemo(
    () => {
      const base = {
        platform: platform || undefined,
        status: status || undefined,
        source_system: sourceSystem || undefined,
      };
      if (range === 'custom' && customFrom && customTo) {
        return { ...base, from: customFrom, to: customTo };
      }
      return { ...base, range };
    },
    [range, customFrom, customTo, platform, status, sourceSystem],
  );
  const drill = useDrillDown(drillBase);

  const [closedPeriods, setClosedPeriods] = useState([]);
  useEffect(() => {
    if (!dashboard.meta?.database) {
      setClosedPeriods([]);
      return;
    }
    listClosedPeriods()
      .then((p) => setClosedPeriods(p || []))
      .catch(() => setClosedPeriods([]));
  }, [dashboard.meta?.database]);

  const rangeLabel =
    range === 'custom' && customFrom && customTo
      ? formatCustomRangeLabel(customFrom, customTo)
      : RANGE_LABELS[range] || 'Selected range';

  const closedPeriodsInRange = useMemo(() => {
    if (!closedPeriods.length) return [];
    let monthKeys;
    if (range === 'custom' && customFrom && customTo) {
      monthKeys = monthKeysTouchingInclusiveRange(customFrom, customTo);
    } else {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[range] || 30;
      const end = new Date();
      const start = new Date();
      start.setUTCDate(end.getUTCDate() - (days - 1));
      monthKeys = new Set();
      const cursor = new Date(start);
      while (cursor <= end) {
        monthKeys.add(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    return closedPeriods.filter((p) => monthKeys.has(`${p.year}-${p.month}`));
  }, [closedPeriods, range, customFrom, customTo]);

  const filterSubtitle = useMemo(() => {
    const p = formatPlatformLabel(platform || 'all');
    const s = status ? status.replace(/_/g, ' ') : 'all statuses';
    const src = sourceSystem || 'all sources';
    return `${p} · ${s} · ${src}`;
  }, [platform, status, sourceSystem]);

  const handleFilterChange = (patch) => {
    if (patch.range != null) setRange(patch.range);
    if (patch.customFrom !== undefined) setCustomFrom(patch.customFrom);
    if (patch.customTo !== undefined) setCustomTo(patch.customTo);
    if (patch.platform != null) setPlatform(patch.platform);
    if (patch.status != null) setStatus(patch.status);
    if (patch.sourceSystem != null) setSourceSystem(patch.sourceSystem);
  };

  const handleExportSummary = async () => {
    setExportError(null);
    setExportBusy(true);
    try {
      await exportFinanceSummaryCsv(
        range === 'custom' && customFrom && customTo
          ? {
              from: customFrom,
              to: customTo,
              platform,
              status,
              source_system: sourceSystem,
            }
          : {
              range,
              platform,
              status,
              source_system: sourceSystem,
            },
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[clamp(1.55rem,2.1vw,2.2rem)] font-semibold tracking-tight text-[var(--text)]">
              Revenue &amp; cash operations
            </h1>
            <p className="mt-2 max-w-2xl text-[clamp(13px,0.92vw,15px)] leading-relaxed text-[var(--muted)]">
              Gross revenue, refunds, fees, and net revenue in one place. Choose a reporting window
              and filters to update every card below.
            </p>
          </div>
          <div className="max-w-xs rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-xs text-[var(--muted)] lg:text-right">
            <p className="font-medium text-[var(--text)]">Useful tips</p>
            <p className="mt-2 leading-relaxed">
              Use <span className="text-[var(--text)]">Data import</span> to upload fresh reports and
              refresh totals.
            </p>
            <p className="mt-2 leading-relaxed">Filters apply to all summary cards.</p>
          </div>
        </header>

        <div className="mt-4 space-y-3.5">
          <DataFreshness meta={dashboard.meta} />

          {ENABLE_RECONCILIATION && (
            <ReconciliationTrustStrip
              reconciliation={dashboard.meta?.reconciliation}
              database={dashboard.meta?.database}
            />
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
            <FilterBar
              range={range}
              customFrom={customFrom}
              customTo={customTo}
              platform={platform}
              status={status}
              sourceSystem={sourceSystem}
              platformOptions={dashboard.meta?.platforms}
              onChange={handleFilterChange}
            />
            <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <p>
                  Reporting window: {rangeLabel} · {filterSubtitle}
                </p>
                {closedPeriodsInRange.length > 0 && (
                  <Link
                    to="/periods"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 transition hover:brightness-110"
                    title={`Closed: ${closedPeriodsInRange
                      .map((p) => `${p.year}-${String(p.month).padStart(2, '0')}`)
                      .join(', ')}`}
                  >
                    <span aria-hidden="true">🔒</span>
                    {closedPeriodsInRange.length} closed month
                    {closedPeriodsInRange.length === 1 ? '' : 's'} in range
                  </Link>
                )}
              </div>
              <button
                type="button"
                disabled={dashboard.loading || exportBusy}
                onClick={handleExportSummary}
                className="shrink-0 rounded-xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] px-4 py-2 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow)] transition-all duration-200 hover:brightness-105 disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Export filtered summary'}
              </button>
            </div>
          </div>
          {exportError && (
            <p className="text-sm text-rose-300" role="alert">
              {exportError}
            </p>
          )}

          {dashboard.error && (
            <div
              className="flex items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-5 py-4 text-sm text-rose-100"
              role="alert"
            >
              <span>{dashboard.error}</span>
              <button
                type="button"
                onClick={() => dashboard.reload()}
                className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-50 hover:bg-rose-500/20"
              >
                Retry
              </button>
            </div>
          )}

          <section
            aria-label="Dashboard insights"
            className="grid grid-cols-1 gap-3.5 lg:gap-4 xl:grid-cols-12 xl:items-stretch"
          >
            <div className="xl:col-span-6">
              {dashboard.loading ? (
                <div className="animate-pulse rounded-2xl border border-[var(--primary-ring)] bg-[var(--card)] p-6">
                  <div className="h-3 w-24 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 h-10 w-52 rounded bg-[var(--card-2)]" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => drill.open('netRevenue')}
                  className="group w-full rounded-2xl border border-[var(--primary-ring)] bg-[var(--primary-soft)] p-5 text-left shadow-[var(--shadow)] transition-all duration-200 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                    Net revenue
                  </p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-[2.8rem]">
                    {formatCurrency(dashboard.summary?.netRevenue)}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {rangeLabel} ·{' '}
                    <span className="text-[var(--primary)] opacity-80 transition group-hover:opacity-100">
                      View rows →
                    </span>
                  </p>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-6 xl:grid-cols-3">
              {dashboard.loading
                ? Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5">
                      <div className="h-3 w-20 rounded bg-[var(--card-2)]" />
                      <div className="mt-3 h-7 w-24 rounded bg-[var(--card-2)]" />
                    </div>
                  ))
                : SECONDARY_KPIS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => drill.open(item.key)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-left shadow-[var(--shadow)] transition-all duration-200 hover:border-[var(--primary-ring)] hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--primary-ring)]"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--text)]">
                        {formatKpiValue(item.format, dashboard.summary?.[item.key])}
                      </p>
                    </button>
                  ))}
            </div>

            <div className="xl:col-span-12">
              {dashboard.loading ? (
                <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="h-4 w-48 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 h-16 rounded-xl bg-[var(--card-strong)]" />
                </div>
              ) : (
                <TaxBreakdownCard summary={dashboard.summary} />
              )}
            </div>

            <div className="flex h-full min-h-[360px] flex-col xl:col-span-6 xl:min-h-[440px]">
              {dashboard.loading ? (
                <div className="flex min-h-[440px] flex-1 animate-pulse flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="h-4 w-40 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 min-h-0 flex-1 rounded-xl bg-[var(--card-strong)]" />
                </div>
              ) : (
                <SalesPerformanceCard summary={dashboard.summary} onDrill={drill.open} />
              )}
            </div>

            <div className="flex h-full min-h-[360px] flex-col xl:col-span-6 xl:min-h-[440px]">
              {dashboard.loading ? (
                <div className="flex min-h-[440px] flex-1 animate-pulse flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="h-4 w-40 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 min-h-0 flex-1 rounded-xl bg-[var(--card-strong)]" />
                </div>
              ) : (
                <RevenueTrendCard
                  revenue={dashboard.revenueTrend}
                  rangeLabel={rangeLabel}
                  onBucketClick={(bucket) =>
                    drill.open('grossRevenue', {
                      bucketStart: bucket.start,
                      bucketEnd: bucket.end,
                    })
                  }
                />
              )}
            </div>

            <div className="xl:col-span-6">
              {dashboard.loading ? (
                <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="h-4 w-40 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 h-56 rounded-xl bg-[var(--card-strong)]" />
                </div>
              ) : (
                <OrdersTable orders={dashboard.orders} maxRows={DASHBOARD_TABLE_ROWS} />
              )}
            </div>

            <div className="xl:col-span-6">
              {dashboard.loading ? (
                <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <div className="h-4 w-40 rounded bg-[var(--card-2)]" />
                  <div className="mt-4 h-56 rounded-xl bg-[var(--card-strong)]" />
                </div>
              ) : (
                <RefundsTable refunds={dashboard.refunds} maxRows={DASHBOARD_TABLE_ROWS} />
              )}
            </div>

            <div className="xl:col-span-6">
              {dashboard.loading ? (
                <FeesByPlatformSkeleton />
              ) : (
                <FeesByPlatform
                  data={dashboard.feesByPlatform}
                  rangeLabel={rangeLabel}
                  onPlatformClick={(platformKey) =>
                    drill.open('totalFees', { platform: platformKey })
                  }
                />
              )}
            </div>

            <div className="xl:col-span-6">
              {dashboard.loading ? (
                <FeesByPlatformSkeleton />
              ) : (
                <FeesByTypeCard data={dashboard.feesByType} rangeLabel={rangeLabel} />
              )}
            </div>

            <div className="xl:col-span-12">
              {dashboard.loading ? (
                <FeesByPlatformSkeleton />
              ) : (
                <RefundReasonsCard data={dashboard.refundReasons} rangeLabel={rangeLabel} />
              )}
            </div>
          </section>
        </div>

      <KpiDrillDownDrawer open={drill.isOpen} onClose={drill.close} request={drill.request} />
    </>
  );
}
