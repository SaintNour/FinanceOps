/**
 * Normalized finance entities — map imported reports and manual sources into these shapes.
 * Field names are stable API contracts for the CSV-based finance workflow.
 */

/** @typedef {'shopify' | 'amazon' | 'woocommerce' | 'paypal' | 'manual_import' | 'imported_report'} Platform */

/** @typedef {'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'partially_refunded'} OrderStatus */

/**
 * @typedef {Object} NormalizedOrder
 * @property {string} order_id
 * @property {string} platform
 * @property {string} order_date ISO date
 * @property {string|null} customer_name
 * @property {number} gross_amount
 * @property {number} tax_amount
 * @property {number} shipping_amount
 * @property {string} order_status
 */

/**
 * @typedef {Object} NormalizedPayment
 * @property {string} payment_id
 * @property {string} order_id
 * @property {string} platform
 * @property {string} payment_processor paypal | shopify_payments | amazon_pay | braintree | adyen | manual
 * @property {string} payment_date ISO datetime
 * @property {number} amount
 * @property {number} fee_amount
 * @property {string} payment_status succeeded | pending | failed | refunded
 */

/**
 * @typedef {Object} NormalizedRefund
 * @property {string} refund_id
 * @property {string} order_id
 * @property {string} platform
 * @property {string} refund_date ISO datetime
 * @property {number} refund_amount
 * @property {string} refund_reason
 * @property {string} refund_status succeeded | pending | failed
 */

/**
 * @typedef {Object} NormalizedFee
 * @property {string} fee_id
 * @property {string|null} order_id
 * @property {string} platform
 * @property {string} fee_type processor | platform | subscription | currency_conversion | chargeback | other
 * @property {number} fee_amount
 * @property {string} fee_date ISO date
 * @property {string} source payment_processor | marketplace | bank_feed | manual
 */

export const ORDER_STATUSES = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
});

export const PAYMENT_STATUSES = Object.freeze({
  SUCCEEDED: 'succeeded',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const REFUND_STATUSES = Object.freeze({
  SUCCEEDED: 'succeeded',
  PENDING: 'pending',
  FAILED: 'failed',
});
