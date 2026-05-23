import { query, getPool } from './pool.js';
import { canonicalPlatformKey } from '../utils/normalizers/platform.js';

function num(v) {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function ts(v) {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function dateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export function mapOrderRow(r) {
  const pk = canonicalPlatformKey(r.platform) || 'unknown';
  return {
    order_id: r.order_id,
    source_id: r.source_id,
    platform: pk,
    order_date: ts(r.order_date),
    customer_name: r.customer_name,
    gross_amount: num(r.gross_amount),
    tax_amount: num(r.tax_amount),
    state_tax: num(r.state_tax),
    county_tax: num(r.county_tax),
    total_tax: num(r.total_tax),
    shipping_amount: num(r.shipping_amount),
    order_status: r.order_status,
    source_system: r.source_system,
    currency: r.currency || 'USD',
  };
}

export function mapPaymentRow(r) {
  return {
    payment_id: r.payment_id,
    source_id: r.source_id,
    order_id: r.order_id,
    platform: canonicalPlatformKey(r.platform) || 'unknown',
    payment_processor: r.payment_processor,
    payment_date: ts(r.payment_date),
    amount: num(r.amount),
    fee_amount: num(r.fee_amount),
    payment_status: r.payment_status,
    source_system: r.source_system,
    currency: r.currency || 'USD',
  };
}

export function mapRefundRow(r) {
  return {
    refund_id: r.refund_id,
    source_id: r.source_id,
    order_id: r.order_id,
    platform: canonicalPlatformKey(r.platform) || 'unknown',
    refund_date: ts(r.refund_date),
    refund_amount: num(r.refund_amount),
    refund_reason: r.refund_reason || '',
    refund_status: r.refund_status,
    source_system: r.source_system,
    currency: r.currency || 'USD',
  };
}

export function mapFeeRow(r) {
  return {
    fee_id: r.fee_id,
    source_id: r.source_id,
    order_id: r.order_id,
    platform: canonicalPlatformKey(r.platform) || 'unknown',
    fee_type: r.fee_type,
    fee_amount: num(r.fee_amount),
    fee_date: dateOnly(r.fee_date),
    source: r.source,
    source_system: r.source_system,
    currency: r.currency || 'USD',
  };
}

export async function hasFinanceRows() {
  const p = getPool();
  if (!p) return false;
  const { rows } = await query(
    `SELECT
      (SELECT COUNT(*)::int FROM orders) AS oc,
      (SELECT COUNT(*)::int FROM payments) AS pc,
      (SELECT COUNT(*)::int FROM refunds) AS rc,
      (SELECT COUNT(*)::int FROM fees) AS fc`,
  );
  const r = rows[0];
  return r.oc + r.pc + r.rc + r.fc > 0;
}

export async function loadOrdersForFinance() {
  const { rows } = await query(`SELECT * FROM orders`, []);
  return rows.map(mapOrderRow);
}

export async function loadPaymentsForFinance() {
  const { rows } = await query(`SELECT * FROM payments`, []);
  return rows.map(mapPaymentRow);
}

export async function loadRefundsForFinance() {
  const { rows } = await query(`SELECT * FROM refunds`, []);
  return rows.map(mapRefundRow);
}

export async function loadFeesForFinance() {
  const { rows } = await query(`SELECT * FROM fees`, []);
  return rows.map(mapFeeRow);
}

export async function getFinanceDataset() {
  const [orders, payments, refunds, fees] = await Promise.all([
    loadOrdersForFinance(),
    loadPaymentsForFinance(),
    loadRefundsForFinance(),
    loadFeesForFinance(),
  ]);
  return { orders, payments, refunds, fees };
}

/**
 * Distinct platform slugs present in stored finance tables (canonicalized).
 */
export async function loadDistinctPlatformKeys() {
  const p = getPool();
  if (!p) return [];
  const { rows } = await query(
    `SELECT platform FROM (
       SELECT DISTINCT platform FROM orders WHERE platform IS NOT NULL AND platform <> ''
       UNION
       SELECT DISTINCT platform FROM payments WHERE platform IS NOT NULL AND platform <> ''
       UNION
       SELECT DISTINCT platform FROM refunds WHERE platform IS NOT NULL AND platform <> ''
       UNION
       SELECT DISTINCT platform FROM fees WHERE platform IS NOT NULL AND platform <> ''
     ) u`,
    [],
  );
  const set = new Set();
  for (const { platform } of rows) {
    const k = canonicalPlatformKey(platform);
    if (k) set.add(k);
  }
  return [...set];
}

export async function getDashboardMeta() {
  const p = getPool();
  if (!p) {
    return {
      database: false,
      hasRows: false,
      freshness: 'mock',
      lastImportAt: null,
      rowCounts: { orders: 0, payments: 0, refunds: 0, fees: 0 },
    };
  }

  const { rows: countRows } = await query(
    `SELECT
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM payments) AS payments,
      (SELECT COUNT(*)::int FROM refunds) AS refunds,
      (SELECT COUNT(*)::int FROM fees) AS fees`,
  );

  const { rows: importRows } = await query(
    `SELECT MAX(completed_at) AS last_import
     FROM import_jobs
     WHERE status = 'completed'`,
  );

  const counts = countRows[0];
  const hasRows =
    counts.orders + counts.payments + counts.refunds + counts.fees > 0;

  return {
    database: true,
    hasRows,
    freshness: hasRows ? 'live' : 'empty',
    lastImportAt: importRows[0]?.last_import
      ? new Date(importRows[0].last_import).toISOString()
      : null,
    rowCounts: counts,
  };
}
