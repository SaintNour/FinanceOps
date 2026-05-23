import { PAYMENT_STATUSES, REFUND_STATUSES } from '../models/entities.js';
import { parseReportingWindow } from '../utils/normalizers/dateRange.js';
import { normalizePlatform } from '../utils/normalizers/platform.js';
import {
  aggregateOrderTaxes,
  computeNetRevenue,
  computeRefundRate,
  filterByDate,
  filterByPlatform,
  filterBySourceSystem,
  taxTotalsByPlatform,
} from '../utils/calculations/financeMetrics.js';
import { feesByPlatform, refundTrendByDay, revenueTrendByDay } from '../utils/calculations/trends.js';
import { getFinanceDataset } from './financeDataProvider.js';

function ordersInWindow(orders, platform, orderStatus, start, end) {
  let rows = [...orders];
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'order_date', start, end);
  if (orderStatus) rows = rows.filter((o) => o.order_status === orderStatus);
  return rows;
}

function orderIdSet(rows) {
  return new Set(rows.map((o) => o.order_id));
}

export function buildSummaryFilters(query, dataset) {
  const parsed = parseReportingWindow(query);
  if (parsed.error) return { error: parsed.error };

  const platform = normalizePlatform(query.platform);
  const orderStatus = query.status ? String(query.status).trim() : null;
  const sourceSystem = query.source_system
    ? String(query.source_system).trim().toLowerCase()
    : null;

  const { start, end } = parsed;

  let orders = filterBySourceSystem(dataset.orders, sourceSystem);

  const allOrdersInWindow = ordersInWindow(orders, platform, null, start, end);
  const ids = orderIdSet(allOrdersInWindow);

  let restrictedIds = ids;
  if (orderStatus) {
    const sub = ordersInWindow(orders, platform, orderStatus, start, end);
    restrictedIds = orderIdSet(sub);
  }

  return {
    start,
    end,
    platform,
    orderStatus,
    sourceSystem,
    allOrdersInWindow,
    restrictedIds,
    orders,
    window: parsed,
  };
}

export async function getFinanceSummary(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };

  const {
    start,
    end,
    platform,
    orderStatus,
    sourceSystem,
    allOrdersInWindow,
    restrictedIds,
    orders: ordersAll,
    window: win,
  } = ctx;

  let payments = filterBySourceSystem(dataset.payments, sourceSystem);
  let refunds = filterBySourceSystem(dataset.refunds, sourceSystem);
  let fees = filterBySourceSystem(dataset.fees, sourceSystem);

  payments = payments.filter((p) => {
    if (p.payment_status !== PAYMENT_STATUSES.SUCCEEDED) return false;
    if (platform && p.platform !== platform) return false;
    if (!filterByDate([p], 'payment_date', start, end).length) return false;
    if (orderStatus && !restrictedIds.has(p.order_id)) return false;
    return true;
  });

  refunds = refunds.filter((r) => {
    if (r.refund_status !== REFUND_STATUSES.SUCCEEDED) return false;
    if (platform && r.platform !== platform) return false;
    if (!filterByDate([r], 'refund_date', start, end).length) return false;
    if (orderStatus && !restrictedIds.has(r.order_id)) return false;
    return true;
  });

  fees = fees.filter((f) => {
    if (platform && f.platform !== platform) return false;
    if (!filterByDate([f], 'fee_date', start, end).length) return false;
    if (orderStatus) {
      if (f.order_id == null) return false;
      if (!restrictedIds.has(f.order_id)) return false;
    }
    return true;
  });

  const grossRevenue = payments.reduce((a, p) => a + p.amount, 0);
  const totalRefundAmount = refunds.reduce((a, r) => a + r.refund_amount, 0);
  const totalFees = fees.reduce((a, f) => a + f.fee_amount, 0);

  const refundsForRate = filterBySourceSystem(dataset.refunds, sourceSystem);

  let rateCtx = computeRefundRate(ordersAll, refundsForRate, {
    start,
    end,
    platform,
  });

  let { refundRate, totalOrders, refundedOrders, completedOrders } = rateCtx;

  if (orderStatus) {
    const subset = allOrdersInWindow.filter((o) => o.order_status === orderStatus);
    totalOrders = subset.length;
    rateCtx = computeRefundRate(subset, refundsForRate, {
      start,
      end,
      platform,
    });
    refundRate = rateCtx.refundRate;
    refundedOrders = rateCtx.refundedOrders;
    completedOrders = rateCtx.completedOrders;
  }

  const netRevenue = computeNetRevenue(grossRevenue, totalRefundAmount, totalFees);

  const taxAgg = aggregateOrderTaxes(allOrdersInWindow);
  const taxByPlatform = taxTotalsByPlatform(allOrdersInWindow);

  return {
    grossRevenue: roundMoney(grossRevenue),
    totalRefundAmount: roundMoney(totalRefundAmount),
    refundRate,
    totalFees: roundMoney(totalFees),
    netRevenue: roundMoney(netRevenue),
    totalOrders,
    refundedOrders,
    completedOrders,
    stateTax: taxAgg.stateTax,
    countyTax: taxAgg.countyTax,
    totalTaxCollected: taxAgg.totalTaxCollected,
    taxByPlatform,
    range: win.mode === 'custom' ? 'custom' : query.range || '30d',
    dateFrom: win.from,
    dateTo: win.to,
    platform: platform || 'all',
    orderStatus: orderStatus || null,
    sourceSystem: sourceSystem || null,
    dataMode: dataset.mode,
  };
}

function rangeFieldFromQuery(query, win) {
  if (win.mode === 'custom') return 'custom';
  return query.range || '30d';
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

export async function getFeesByPlatform(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };

  const { start, end, platform, orderStatus, restrictedIds, sourceSystem } = ctx;

  let rows = filterBySourceSystem(dataset.fees, sourceSystem);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'fee_date', start, end);
  if (orderStatus) {
    rows = rows.filter(
      (f) => f.order_id != null && restrictedIds.has(f.order_id),
    );
  }

  return { breakdown: feesByPlatform(rows, { start, end }) };
}

function filterPaymentsForContext(dataset, ctx) {
  const { start, end, platform, orderStatus, restrictedIds, sourceSystem } = ctx;
  return filterBySourceSystem(dataset.payments, sourceSystem).filter((p) => {
    if (p.payment_status !== PAYMENT_STATUSES.SUCCEEDED) return false;
    if (platform && p.platform !== platform) return false;
    if (!filterByDate([p], 'payment_date', start, end).length) return false;
    if (orderStatus && !restrictedIds.has(p.order_id)) return false;
    return true;
  });
}

function filterRefundsForContext(dataset, ctx) {
  const { start, end, platform, orderStatus, restrictedIds, sourceSystem } = ctx;
  return filterBySourceSystem(dataset.refunds, sourceSystem).filter((r) => {
    if (r.refund_status !== REFUND_STATUSES.SUCCEEDED) return false;
    if (platform && r.platform !== platform) return false;
    if (!filterByDate([r], 'refund_date', start, end).length) return false;
    if (orderStatus && !restrictedIds.has(r.order_id)) return false;
    return true;
  });
}

export async function getRevenueTrend(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };
  const { start, end, window: win } = ctx;
  const payments = filterPaymentsForContext(dataset, ctx);
  return {
    range: rangeFieldFromQuery(query, win),
    dateFrom: win.from,
    dateTo: win.to,
    points: revenueTrendByDay(payments, { start, end, platform: null }),
  };
}

export async function getRefundReasons(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };

  const refunds = filterRefundsForContext(dataset, ctx);
  const totals = new Map();
  for (const r of refunds) {
    const reason = (r.refund_reason || '').trim() || 'Unspecified';
    const prev = totals.get(reason) || { reason, amount: 0, count: 0 };
    prev.amount += Number(r.refund_amount) || 0;
    prev.count += 1;
    totals.set(reason, prev);
  }
  const breakdown = Array.from(totals.values())
    .map((row) => ({
      reason: row.reason,
      amount: roundMoney(row.amount),
      count: row.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return {
    range: rangeFieldFromQuery(query, ctx.window),
    dateFrom: ctx.window.from,
    dateTo: ctx.window.to,
    breakdown,
    total: roundMoney(breakdown.reduce((a, r) => a + r.amount, 0)),
  };
}

export async function getFeesByType(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };

  const { start, end, platform, orderStatus, restrictedIds, sourceSystem } = ctx;
  let rows = filterBySourceSystem(dataset.fees, sourceSystem);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'fee_date', start, end);
  if (orderStatus) {
    rows = rows.filter(
      (f) => f.order_id != null && restrictedIds.has(f.order_id),
    );
  }

  const totals = new Map();
  for (const f of rows) {
    const type = (f.fee_type || '').trim() || 'other';
    const prev = totals.get(type) || { type, amount: 0, count: 0 };
    prev.amount += Number(f.fee_amount) || 0;
    prev.count += 1;
    totals.set(type, prev);
  }
  const breakdown = Array.from(totals.values())
    .map((row) => ({
      type: row.type,
      amount: roundMoney(row.amount),
      count: row.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    range: rangeFieldFromQuery(query, ctx.window),
    dateFrom: ctx.window.from,
    dateTo: ctx.window.to,
    breakdown,
    total: roundMoney(breakdown.reduce((a, r) => a + r.amount, 0)),
  };
}

export async function getRefundTrend(query = {}) {
  const dataset = await getFinanceDataset();
  const ctx = buildSummaryFilters(query, dataset);
  if (ctx.error) return { error: ctx.error };
  const { start, end, window: win } = ctx;
  const refunds = filterRefundsForContext(dataset, ctx);
  return {
    range: rangeFieldFromQuery(query, win),
    dateFrom: win.from,
    dateTo: win.to,
    points: refundTrendByDay(refunds, { start, end, platform: null }),
  };
}
