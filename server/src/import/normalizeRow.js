import { ORDER_STATUSES, PAYMENT_STATUSES, REFUND_STATUSES } from '../models/entities.js';
import { canonicalPlatformKey } from '../utils/normalizers/platform.js';

const STATUS_MAP = {
  order: {
    completed: ORDER_STATUSES.COMPLETED,
    paid: ORDER_STATUSES.COMPLETED,
    fulfilled: ORDER_STATUSES.COMPLETED,
    pending: ORDER_STATUSES.PENDING,
    processing: ORDER_STATUSES.PROCESSING,
    cancelled: ORDER_STATUSES.CANCELLED,
    canceled: ORDER_STATUSES.CANCELLED,
    refunded: ORDER_STATUSES.REFUNDED,
    partial: ORDER_STATUSES.PARTIALLY_REFUNDED,
    partially_refunded: ORDER_STATUSES.PARTIALLY_REFUNDED,
  },
  payment: {
    succeeded: PAYMENT_STATUSES.SUCCEEDED,
    paid: PAYMENT_STATUSES.SUCCEEDED,
    pending: PAYMENT_STATUSES.PENDING,
    failed: PAYMENT_STATUSES.FAILED,
    refunded: PAYMENT_STATUSES.REFUNDED,
  },
  refund: {
    succeeded: REFUND_STATUSES.SUCCEEDED,
    pending: REFUND_STATUSES.PENDING,
    failed: REFUND_STATUSES.FAILED,
  },
};

export function parseDate(value) {
  if (value == null || value === '') return { error: 'Missing date' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: `Invalid date: ${value}` };
  return { value: d };
}

export function parseMoney(value) {
  if (value == null || value === '') return { error: 'Missing amount' };
  let cleaned = String(value).trim().replace(/[$,\s]/g, '');
  if (/^\(.*\)$/.test(cleaned)) {
    cleaned = `-${cleaned.slice(1, -1).replace(/[$,\s]/g, '')}`;
  }
  const n = Number(cleaned);
  if (Number.isNaN(n)) return { error: `Invalid number: ${value}` };
  return { value: n };
}

function normalizeStatus(raw, kind) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const table = STATUS_MAP[kind];
  return table[key] || raw || '';
}

export function normalizeOrderRow(mapped, sourceSystem, raw) {
  const errs = [];
  const order_id = String(mapped.order_id || '').trim();
  if (!order_id) errs.push('order_id is required');

  const platform = canonicalPlatformKey(mapped.platform) || 'unknown';
  const od = parseDate(mapped.order_date);
  if (od.error) errs.push(od.error);

  const gross = parseMoney(mapped.gross_amount);
  if (gross.error) errs.push(gross.error);

  const stateTax =
    mapped.state_tax != null && mapped.state_tax !== ''
      ? parseMoney(mapped.state_tax)
      : { value: 0 };
  if (stateTax.error) errs.push(stateTax.error);

  const countyTax =
    mapped.county_tax != null && mapped.county_tax !== ''
      ? parseMoney(mapped.county_tax)
      : { value: 0 };
  if (countyTax.error) errs.push(countyTax.error);

  const totalTaxCol =
    mapped.total_tax != null && mapped.total_tax !== ''
      ? parseMoney(mapped.total_tax)
      : null;
  if (totalTaxCol && totalTaxCol.error) errs.push(totalTaxCol.error);

  const legacyTax =
    mapped.tax_amount != null && mapped.tax_amount !== ''
      ? parseMoney(mapped.tax_amount)
      : { value: 0 };
  if (legacyTax.error) errs.push(legacyTax.error);

  let total_tax = totalTaxCol && !totalTaxCol.error ? totalTaxCol.value : 0;
  if (!total_tax && (stateTax.value || countyTax.value)) {
    total_tax = stateTax.value + countyTax.value;
  }
  if (!total_tax && legacyTax.value) {
    total_tax = legacyTax.value;
  }

  const tax_amount = total_tax;

  const ship = mapped.shipping_amount != null && mapped.shipping_amount !== ''
    ? parseMoney(mapped.shipping_amount)
    : { value: 0 };
  if (ship.error) errs.push(ship.error);

  let order_status = normalizeStatus(mapped.order_status, 'order');
  if (!order_status) order_status = ORDER_STATUSES.COMPLETED;

  const source_id = String(mapped.source_id || '').trim() || `${sourceSystem}:order:${order_id}`;

  if (errs.length) return { error: errs.join('; ') };

  return {
    row: {
      source_system: sourceSystem,
      source_id,
      order_id,
      platform,
      order_date: od.value.toISOString(),
      customer_name: mapped.customer_name || null,
      gross_amount: gross.value,
      tax_amount,
      state_tax: stateTax.value,
      county_tax: countyTax.value,
      total_tax,
      shipping_amount: ship.value,
      order_status,
      currency: (mapped.currency || 'USD').toString().toUpperCase().slice(0, 10),
      external_reference: mapped.external_reference || null,
      raw_payload_json: raw ?? mapped,
    },
  };
}

export function normalizePaymentRow(mapped, sourceSystem, raw) {
  const errs = [];
  const payment_id = String(mapped.payment_id || '').trim();
  if (!payment_id) errs.push('payment_id is required');

  const order_id = mapped.order_id != null ? String(mapped.order_id).trim() : null;
  const platform = canonicalPlatformKey(mapped.platform) || 'unknown';
  const processor = String(mapped.payment_processor || 'unknown').trim().toLowerCase();
  const pd = parseDate(mapped.payment_date);
  if (pd.error) errs.push(pd.error);

  const amount = parseMoney(mapped.amount);
  if (amount.error) errs.push(amount.error);

  const fee = mapped.fee_amount != null && mapped.fee_amount !== ''
    ? parseMoney(mapped.fee_amount)
    : { value: 0 };
  if (fee.error) errs.push(fee.error);

  let payment_status = normalizeStatus(mapped.payment_status, 'payment');
  if (!payment_status) payment_status = PAYMENT_STATUSES.SUCCEEDED;

  const source_id = String(mapped.source_id || '').trim() || `${sourceSystem}:pay:${payment_id}`;

  if (errs.length) return { error: errs.join('; ') };

  return {
    row: {
      source_system: sourceSystem,
      source_id,
      payment_id,
      order_id,
      platform,
      payment_processor: processor,
      payment_date: pd.value.toISOString(),
      amount: amount.value,
      fee_amount: fee.value,
      payment_status,
      currency: (mapped.currency || 'USD').toString().toUpperCase().slice(0, 10),
      external_reference: mapped.external_reference || null,
      raw_payload_json: raw ?? mapped,
    },
  };
}

export function normalizeRefundRow(mapped, sourceSystem, raw) {
  const errs = [];
  const refund_id = String(mapped.refund_id || '').trim();
  if (!refund_id) errs.push('refund_id is required');

  const order_id = mapped.order_id != null ? String(mapped.order_id).trim() : null;
  const platform = canonicalPlatformKey(mapped.platform) || 'unknown';
  const rd = parseDate(mapped.refund_date);
  if (rd.error) errs.push(rd.error);

  const amt = parseMoney(mapped.refund_amount);
  if (amt.error) errs.push(amt.error);

  let refund_status = normalizeStatus(mapped.refund_status, 'refund');
  if (!refund_status) refund_status = REFUND_STATUSES.SUCCEEDED;

  const source_id = String(mapped.source_id || '').trim() || `${sourceSystem}:ref:${refund_id}`;

  if (errs.length) return { error: errs.join('; ') };

  return {
    row: {
      source_system: sourceSystem,
      source_id,
      refund_id,
      order_id,
      platform,
      refund_date: rd.value.toISOString(),
      refund_amount: amt.value,
      refund_reason: mapped.refund_reason || '',
      refund_status,
      currency: (mapped.currency || 'USD').toString().toUpperCase().slice(0, 10),
      external_reference: mapped.external_reference || null,
      raw_payload_json: raw ?? mapped,
    },
  };
}

export function normalizeFeeRow(mapped, sourceSystem, raw) {
  const errs = [];
  const fee_id = String(mapped.fee_id || '').trim();
  if (!fee_id) errs.push('fee_id is required');

  const platform = canonicalPlatformKey(mapped.platform) || 'unknown';
  const fee_type = String(mapped.fee_type || 'other').trim().toLowerCase();
  const source = String(mapped.source || 'manual').trim().toLowerCase();

  const fd = parseDate(mapped.fee_date);
  if (fd.error) errs.push(fd.error);

  const amt = parseMoney(mapped.fee_amount);
  if (amt.error) errs.push(amt.error);

  const order_id = mapped.order_id != null ? String(mapped.order_id).trim() : null;

  const source_id = String(mapped.source_id || '').trim() || `${sourceSystem}:fee:${fee_id}`;

  if (errs.length) return { error: errs.join('; ') };

  return {
    row: {
      source_system: sourceSystem,
      source_id,
      fee_id,
      order_id: order_id || null,
      platform,
      fee_type,
      fee_amount: amt.value,
      fee_date: fd.value.toISOString().slice(0, 10),
      source,
      currency: (mapped.currency || 'USD').toString().toUpperCase().slice(0, 10),
      external_reference: mapped.external_reference || null,
      raw_payload_json: raw ?? mapped,
    },
  };
}
