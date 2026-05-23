import { ORDER_STATUSES, PAYMENT_STATUSES, REFUND_STATUSES } from '../../models/entities.js';

function inDateRange(isoString, start, end) {
  const t = new Date(isoString).getTime();
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

export function filterByDate(items, dateField, start, end) {
  if (!start && !end) return items;
  return items.filter((row) => inDateRange(row[dateField], start, end));
}

export function filterByPlatform(items, platform) {
  if (!platform) return items;
  return items.filter((row) => row.platform === platform);
}

export function filterBySourceSystem(items, sourceSystem) {
  if (!sourceSystem) return items;
  return items.filter((row) => (row.source_system || '') === sourceSystem);
}

/**
 * Gross revenue: sum of successful payment amounts.
 */
export function sumGrossRevenue(payments, { start, end, platform } = {}) {
  let rows = payments.filter((p) => p.payment_status === PAYMENT_STATUSES.SUCCEEDED);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'payment_date', start, end);
  return rows.reduce((acc, p) => acc + p.amount, 0);
}

/**
 * Total refund amount: succeeded refunds.
 */
export function sumRefundAmount(refunds, { start, end, platform } = {}) {
  let rows = refunds.filter((r) => r.refund_status === REFUND_STATUSES.SUCCEEDED);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'refund_date', start, end);
  return rows.reduce((acc, r) => acc + r.refund_amount, 0);
}

/**
 * Total fees: all fee records (processor + platform + standalone).
 */
export function sumTotalFees(fees, { start, end, platform } = {}) {
  let rows = [...fees];
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'fee_date', start, end);
  return rows.reduce((acc, f) => acc + f.fee_amount, 0);
}

const COMPLETED_LIKE = new Set([
  ORDER_STATUSES.COMPLETED,
  ORDER_STATUSES.REFUNDED,
  ORDER_STATUSES.PARTIALLY_REFUNDED,
]);

/**
 * Refund rate: distinct refunded orders / completed-like orders in range (order_date).
 */
export function computeRefundRate(orders, refunds, { start, end, platform } = {}) {
  let oRows = filterByPlatform(orders, platform);
  oRows = filterByDate(oRows, 'order_date', start, end);

  const completedOrders = oRows.filter((o) => COMPLETED_LIKE.has(o.order_status));
  const completedIds = new Set(completedOrders.map((o) => o.order_id));

  let rRows = refunds.filter((r) => r.refund_status === REFUND_STATUSES.SUCCEEDED);
  rRows = filterByPlatform(rRows, platform);
  rRows = filterByDate(rRows, 'refund_date', start, end);

  const refundedOrderIds = new Set();
  for (const r of rRows) {
    if (completedIds.has(r.order_id)) refundedOrderIds.add(r.order_id);
  }

  const denom = completedOrders.length;
  const num = refundedOrderIds.size;
  const ratePct = denom === 0 ? 0 : (num / denom) * 100;
  return {
    refundRate: Math.round(ratePct * 100) / 100,
    totalOrders: oRows.length,
    completedOrders: denom,
    refundedOrders: num,
  };
}

export function computeNetRevenue(gross, refundTotal, feeTotal) {
  return gross - refundTotal - feeTotal;
}

function num(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Resolved total tax for one order row (prefers explicit total_tax, then state+county, then legacy tax_amount).
 */
export function orderTotalTaxAmount(o) {
  const st = num(o.state_tax);
  const ct = num(o.county_tax);
  let tt = num(o.total_tax);
  if (tt === 0 && (st !== 0 || ct !== 0)) tt = st + ct;
  if (tt === 0) tt = num(o.tax_amount);
  return tt;
}

export function aggregateOrderTaxes(orders) {
  let stateTax = 0;
  let countyTax = 0;
  let totalTax = 0;
  for (const o of orders) {
    const st = num(o.state_tax);
    const ct = num(o.county_tax);
    let tt = num(o.total_tax);
    if (tt === 0 && (st !== 0 || ct !== 0)) tt = st + ct;
    if (tt === 0) tt = num(o.tax_amount);
    stateTax += st;
    countyTax += ct;
    totalTax += tt;
  }
  return {
    stateTax: Math.round(stateTax * 100) / 100,
    countyTax: Math.round(countyTax * 100) / 100,
    totalTaxCollected: Math.round(totalTax * 100) / 100,
  };
}

/**
 * Sum of order taxes grouped by platform (uses orderTotalTaxAmount per row).
 */
export function taxTotalsByPlatform(orders) {
  const map = new Map();
  for (const o of orders) {
    const p = o.platform || 'unknown';
    const t = orderTotalTaxAmount(o);
    map.set(p, (map.get(p) || 0) + t);
  }
  return [...map.entries()]
    .map(([platform, amount]) => ({
      platform,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}
