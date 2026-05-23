import { getFinanceDataset } from '../financeDataProvider.js';
import { buildSummaryFilters, getFinanceSummary } from '../financeSummaryService.js';
import { getReconciliationSummary } from '../reconciliationReportingService.js';
import { makeExportFilename } from './exportFilename.js';
import { buildCsvFromColumns, fmtMoney, fmtPercent } from '../../utils/csv/stringifyCsv.js';

/**
 * Single-row summary CSV; query params match GET /api/finance/summary (range, platform, status, source_system).
 */
export async function buildFinanceSummaryExportCsv(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) {
    const e = new Error(ctx.error);
    e.statusCode = 400;
    throw e;
  }

  const summary = await getFinanceSummary(query);
  if (summary.error) {
    const e = new Error(summary.error);
    e.statusCode = 400;
    throw e;
  }

  const { start, end, sourceSystem } = ctx;
  const rangeLabel = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;

  let recon = null;
  try {
    recon = await getReconciliationSummary();
  } catch {
    recon = null;
  }

  const totalPayouts = recon?.totalPayouts ?? 0;
  const coveragePct =
    recon?.database && totalPayouts > 0
      ? (((recon.matchedPayouts || 0) + (recon.partialPayouts || 0)) / totalPayouts) * 100
      : null;

  const row = {
    date_range: rangeLabel,
    source_system: summary.sourceSystem ?? '',
    platform: summary.platform ?? '',
    order_status: summary.orderStatus ?? '',
    gross_revenue: fmtMoney(summary.grossRevenue),
    total_refunds: fmtMoney(summary.totalRefundAmount),
    refund_rate: fmtPercent(summary.refundRate),
    total_fees: fmtMoney(summary.totalFees),
    net_revenue: fmtMoney(summary.netRevenue),
    total_orders: String(summary.totalOrders ?? ''),
    refunded_orders: String(summary.refundedOrders ?? ''),
    state_tax: fmtMoney(summary.stateTax),
    county_tax: fmtMoney(summary.countyTax),
    total_tax_collected: fmtMoney(summary.totalTaxCollected),
    data_mode: summary.dataMode ?? '',
    reconciliation_coverage_pct:
      coveragePct != null && !Number.isNaN(coveragePct) ? `${coveragePct.toFixed(1)}%` : '',
    unmatched_payout_amount:
      recon?.database && recon.unmatchedPayoutAmount != null
        ? fmtMoney(recon.unmatchedPayoutAmount)
        : '',
    unmatched_bank_deposit_amount:
      recon?.database && recon.unmatchedBankAmount != null
        ? fmtMoney(recon.unmatchedBankAmount)
        : '',
  };

  const columns = [
    { key: 'date_range', header: 'date_range' },
    { key: 'source_system', header: 'source_system' },
    { key: 'platform', header: 'platform' },
    { key: 'order_status', header: 'order_status' },
    { key: 'gross_revenue', header: 'gross_revenue' },
    { key: 'total_refunds', header: 'total_refunds' },
    { key: 'refund_rate', header: 'refund_rate' },
    { key: 'total_fees', header: 'total_fees' },
    { key: 'net_revenue', header: 'net_revenue' },
    { key: 'total_orders', header: 'total_orders' },
    { key: 'refunded_orders', header: 'refunded_orders' },
    { key: 'state_tax', header: 'state_tax' },
    { key: 'county_tax', header: 'county_tax' },
    { key: 'total_tax_collected', header: 'total_tax_collected' },
    { key: 'data_mode', header: 'data_mode' },
    { key: 'reconciliation_coverage_pct', header: 'reconciliation_coverage_pct' },
    { key: 'unmatched_payout_amount', header: 'unmatched_payout_amount' },
    { key: 'unmatched_bank_deposit_amount', header: 'unmatched_bank_deposit_amount' },
  ];

  const csv = buildCsvFromColumns(columns, [row]);
  return { csv, filename: makeExportFilename('finance-summary') };
}
