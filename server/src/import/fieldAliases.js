import { BANK_TRANSACTION_FIELDS } from './bankTransactionAliases.js';

/**
 * Canonical field keys -> CSV header aliases (lowercase compared).
 */
export const ORDER_FIELDS = {
  source_id: ['source_id', 'source id', 'export_id', 'id'],
  order_id: ['order_id', 'order id', 'order_number', 'order number', 'order'],
  platform: ['platform', 'channel', 'sales_channel'],
  order_date: ['order_date', 'order date', 'created_at', 'created', 'date'],
  customer_name: ['customer_name', 'customer', 'customer name', 'buyer'],
  gross_amount: ['gross_amount', 'gross', 'total', 'order_total', 'amount'],
  state_tax: ['state_tax', 'state tax', 'statetax'],
  county_tax: ['county_tax', 'county tax', 'countytax'],
  total_tax: ['total_tax', 'total tax', 'tax total', 'tax'],
  tax_amount: ['tax_amount', 'sales_tax', 'order_tax'],
  shipping_amount: ['shipping_amount', 'shipping', 'shipping_total'],
  order_status: ['order_status', 'status', 'financial_status', 'fulfillment_status'],
  currency: ['currency', 'iso_currency'],
  external_reference: ['external_reference', 'reference', 'ref'],
};

export const PAYMENT_FIELDS = {
  source_id: ['source_id', 'source id', 'id', 'payment_id'],
  payment_id: ['payment_id', 'payment id', 'transaction_id', 'charge_id', 'id'],
  order_id: ['order_id', 'order id', 'order_number'],
  platform: ['platform', 'channel'],
  payment_processor: ['payment_processor', 'processor', 'gateway'],
  payment_date: ['payment_date', 'payment date', 'paid_at', 'created_at', 'date'],
  amount: ['amount', 'total', 'payment_amount'],
  fee_amount: ['fee_amount', 'fee', 'processing_fee'],
  payment_status: ['payment_status', 'status'],
  currency: ['currency'],
  external_reference: ['external_reference', 'reference'],
};

export const REFUND_FIELDS = {
  source_id: ['source_id', 'source id', 'id'],
  refund_id: ['refund_id', 'refund id', 'id'],
  order_id: ['order_id', 'order id', 'order_number'],
  platform: ['platform', 'channel'],
  refund_date: ['refund_date', 'refund date', 'created_at', 'date'],
  refund_amount: ['refund_amount', 'refund amount', 'amount', 'total'],
  refund_reason: ['refund_reason', 'reason', 'note'],
  refund_status: ['refund_status', 'status'],
  currency: ['currency'],
  external_reference: ['external_reference', 'reference'],
};

export const FEE_FIELDS = {
  source_id: ['source_id', 'source id', 'id'],
  fee_id: ['fee_id', 'fee id', 'id'],
  order_id: ['order_id', 'order id'],
  platform: ['platform', 'channel'],
  fee_type: ['fee_type', 'type', 'category'],
  fee_amount: ['fee_amount', 'amount', 'fee'],
  fee_date: ['fee_date', 'fee date', 'date', 'created_at'],
  source: ['source', 'fee_source', 'origin'],
  currency: ['currency'],
  external_reference: ['external_reference', 'reference'],
};

export const FIELD_SETS = {
  orders: ORDER_FIELDS,
  payments: PAYMENT_FIELDS,
  refunds: REFUND_FIELDS,
  fees: FEE_FIELDS,
  bank_transactions: BANK_TRANSACTION_FIELDS,
};
