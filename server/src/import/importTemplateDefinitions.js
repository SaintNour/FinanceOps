/** URL path segment -> internal import_type */
export const TEMPLATE_SLUG_TO_TYPE = {
  orders: 'orders',
  payments: 'payments',
  refunds: 'refunds',
  fees: 'fees',
  'bank-transactions': 'bank_transactions',
};

export const TEMPLATE_TYPE_TO_SLUG = Object.fromEntries(
  Object.entries(TEMPLATE_SLUG_TO_TYPE).map(([k, v]) => [v, k]),
);

/**
 * Shown once in the import UI; single copy for all types.
 */
export const SHARED_IMPORT_GUIDE = {
  headline:
    'Download a sample CSV to see the correct structure, or upload your own export and map the columns during preview.',
  manualNote: 'Use a sample file when you are preparing data manually—it shows exact column names.',
  exportNote:
    'If your system already exported a CSV, upload it as-is. Column names do not need to match; you will map them in preview.',
};

const COMMON_FORMATTING_NOTES = [
  'Dates: use YYYY-MM-DD when possible (ISO timestamps also work).',
  'Amounts: numeric values; currency symbols and commas are stripped.',
  'One row = one record.',
  'Same source_system + source_id updates an existing row instead of duplicating.',
];

/**
 * Single source: CSV samples, API payloads, and import UI metadata.
 * `columns[].required` follows validation rules in normalizeRow / bankTransactionNormalizer.
 */
export const IMPORT_TEMPLATE_BLUEPRINTS = {
  orders: {
    importType: 'orders',
    label: 'Orders',
    fileBase: 'orders_sample',
    description: 'One row per customer order. Stable order_id values should match your storefront.',
    columns: [
      { key: 'source_id', example: 'shopify_export:ord:100245', required: false },
      { key: 'order_id', example: '100245', required: true },
      { key: 'platform', example: 'shopify', required: false },
      { key: 'order_date', example: '2026-04-11', required: true },
      { key: 'customer_name', example: 'Jordan Lee', required: false },
      { key: 'gross_amount', example: '249.99', required: true },
      { key: 'state_tax', example: '4.20', required: false },
      { key: 'county_tax', example: '1.10', required: false },
      { key: 'total_tax', example: '18.75', required: false },
      { key: 'tax_amount', example: '18.75', required: false },
      { key: 'shipping_amount', example: '12.00', required: false },
      { key: 'order_status', example: 'completed', required: false },
      { key: 'currency', example: 'USD', required: false },
      { key: 'external_reference', example: 'INV-2026-0042', required: false },
    ],
    extraRows: [
      {
        source_id: 'shopify_export:ord:100246',
        order_id: '100246',
        platform: 'shopify',
        order_date: '2026-04-10',
        customer_name: 'Sam Rivera',
        gross_amount: '89.50',
        tax_amount: '6.71',
        shipping_amount: '0',
        order_status: 'pending',
        currency: 'USD',
        external_reference: '',
      },
      {
        source_id: '',
        order_id: '100247',
        platform: 'amazon',
        order_date: '2026-04-09',
        customer_name: 'Alex Chen',
        gross_amount: '1200.00',
        tax_amount: '96.00',
        shipping_amount: '0',
        order_status: 'fulfilled',
        currency: 'USD',
        external_reference: 'AMZ-77821',
      },
    ],
    formattingNotes: [
      ...COMMON_FORMATTING_NOTES,
      'order_status is normalized (e.g. completed, pending, refunded). Empty defaults to completed.',
    ],
  },
  payments: {
    importType: 'payments',
    label: 'Payments',
    fileBase: 'payments_sample',
    description: 'Captured charges or payment records, optionally linked to an order.',
    columns: [
      { key: 'source_id', example: 'paypal_export:pay:txn_100245', required: false },
      { key: 'payment_id', example: 'txn_100245_example_01', required: true },
      { key: 'order_id', example: '100245', required: false },
      { key: 'platform', example: 'shopify', required: false },
      { key: 'payment_processor', example: 'paypal', required: false },
      { key: 'payment_date', example: '2026-04-11T14:22:00Z', required: true },
      { key: 'amount', example: '249.99', required: true },
      { key: 'fee_amount', example: '7.55', required: false },
      { key: 'payment_status', example: 'succeeded', required: false },
      { key: 'currency', example: 'USD', required: false },
      { key: 'external_reference', example: 'pp_capture_100245', required: false },
    ],
    extraRows: [
      {
        source_id: '',
        payment_id: 'txn_100246_example_02',
        order_id: '100246',
        platform: 'shopify',
        payment_processor: 'paypal',
        payment_date: '2026-04-10',
        amount: '89.50',
        fee_amount: '2.90',
        payment_status: 'succeeded',
        currency: 'USD',
        external_reference: '',
      },
    ],
    formattingNotes: [
      ...COMMON_FORMATTING_NOTES,
      'payment_status is normalized (e.g. succeeded, pending, failed). Empty defaults to succeeded.',
    ],
  },
  refunds: {
    importType: 'refunds',
    label: 'Refunds',
    fileBase: 'refunds_sample',
    description: 'One row per refund issued against an order or payment.',
    columns: [
      { key: 'source_id', example: 'paypal_export:refund:rf_100245', required: false },
      { key: 'refund_id', example: 'rf_100245_example_01', required: true },
      { key: 'order_id', example: '100245', required: false },
      { key: 'platform', example: 'shopify', required: false },
      { key: 'refund_date', example: '2026-04-12', required: true },
      { key: 'refund_amount', example: '49.99', required: true },
      { key: 'refund_reason', example: 'requested_by_customer', required: false },
      { key: 'refund_status', example: 'succeeded', required: false },
      { key: 'currency', example: 'USD', required: false },
      { key: 'external_reference', example: 'rfnd_note_8821', required: false },
    ],
    extraRows: [
      {
        source_id: '',
        refund_id: 'rf_100246_example_02',
        order_id: '100246',
        platform: 'shopify',
        refund_date: '2026-04-11',
        refund_amount: '89.50',
        refund_reason: 'duplicate_charge',
        refund_status: 'succeeded',
        currency: 'USD',
        external_reference: '',
      },
      {
        source_id: '',
        refund_id: 're_manual_001',
        order_id: '',
        platform: 'manual',
        refund_date: '2026-04-08',
        refund_amount: '15.00',
        refund_reason: 'goodwill',
        refund_status: 'succeeded',
        currency: 'USD',
        external_reference: '',
      },
    ],
    formattingNotes: [...COMMON_FORMATTING_NOTES, 'refund_status empty defaults to succeeded.'],
  },
  fees: {
    importType: 'fees',
    label: 'Fees',
    fileBase: 'fees_sample',
    description: 'Processor or platform fees, with or without an order id.',
    columns: [
      { key: 'source_id', example: 'paypal_export:fee:fee_01', required: false },
      { key: 'fee_id', example: 'fee_import_01', required: true },
      { key: 'order_id', example: '100245', required: false },
      { key: 'platform', example: 'shopify', required: false },
      { key: 'fee_type', example: 'processing', required: false },
      { key: 'fee_amount', example: '7.55', required: true },
      { key: 'fee_date', example: '2026-04-11', required: true },
      { key: 'source', example: 'paypal', required: false },
      { key: 'currency', example: 'USD', required: false },
      { key: 'external_reference', example: 'baltxn_abc123', required: false },
    ],
    extraRows: [
      {
        source_id: '',
        fee_id: 'fee_import_02',
        order_id: '',
        platform: 'amazon',
        fee_type: 'referral',
        fee_amount: '12.40',
        fee_date: '2026-04-09',
        source: 'amazon',
        currency: 'USD',
        external_reference: '',
      },
    ],
    formattingNotes: [...COMMON_FORMATTING_NOTES],
  },
  bank_transactions: {
    importType: 'bank_transactions',
    label: 'Bank transactions',
    fileBase: 'bank_transactions_sample',
    description: 'Bank deposits and withdrawals. Use amount, or separate debit/credit columns.',
    columns: [
      { key: 'source_id', example: 'chase_export:txn:20260411001', required: false },
      { key: 'bank_account_name', example: 'Operating · Chase', required: false },
      { key: 'bank_account_last4', example: '4821', required: false },
      { key: 'transaction_date', example: '2026-04-11', required: false },
      { key: 'posted_date', example: '2026-04-12', required: false },
      { key: 'amount', example: '4520.37', required: false },
      { key: 'debit', example: '', required: false },
      { key: 'credit', example: '', required: false },
      { key: 'currency', example: 'USD', required: false },
      { key: 'transaction_type', example: 'credit', required: false },
      { key: 'description', example: 'STRIPE PAYOUT PO_1ABC', required: true },
      { key: 'reference_number', example: 'REF-778821', required: false },
      { key: 'external_reference', example: 'FITID-00921', required: false },
    ],
    extraRows: [
      {
        source_id: '',
        bank_account_name: 'Operating · Chase',
        bank_account_last4: '4821',
        transaction_date: '2026-04-10',
        posted_date: '2026-04-10',
        amount: '',
        debit: '15.00',
        credit: '',
        currency: 'USD',
        transaction_type: 'fee',
        description: 'Monthly service fee',
        reference_number: '',
        external_reference: '',
      },
      {
        source_id: '',
        bank_account_name: 'Savings · KeyNavigator',
        bank_account_last4: '9012',
        transaction_date: '2026-04-09',
        posted_date: '',
        amount: '250.00',
        debit: '',
        credit: '',
        currency: 'USD',
        transaction_type: 'transfer',
        description: 'Internal transfer in',
        reference_number: 'TR-44102',
        external_reference: '',
      },
    ],
    formattingNotes: [
      ...COMMON_FORMATTING_NOTES,
      'Provide transaction_date and/or posted_date (at least one).',
      'Provide amount, or use debit and/or credit columns (credit − debit).',
      'description should identify the line for reconciliation.',
    ],
  },
};

function summarizeFields(columns) {
  const requiredFields = columns.filter((c) => c.required).map((c) => c.key);
  const optionalFields = columns.filter((c) => !c.required).map((c) => c.key);
  return { requiredFields, optionalFields };
}

/**
 * Payload for GET /api/import/template-definitions (per import type).
 */
export function getTemplateDefinitionForApi(internal) {
  const bp = IMPORT_TEMPLATE_BLUEPRINTS[internal];
  if (!bp) return null;

  const { requiredFields, optionalFields } = summarizeFields(bp.columns);
  const slug = TEMPLATE_TYPE_TO_SLUG[internal];

  return {
    importType: internal,
    label: bp.label,
    description: bp.description,
    slug,
    downloadPath: `/api/import/templates/${slug}`,
    requiredFields,
    optionalFields,
    requiredSummary: requiredFields.join(', '),
    optionalSummary: optionalFields.join(', '),
    formattingNotes: bp.formattingNotes || [],
    columns: bp.columns.map((c) => ({
      column: c.key,
      example: c.example,
      required: Boolean(c.required),
    })),
  };
}

export function getAllTemplateDefinitionsForApi() {
  const templates = {};
  for (const key of Object.keys(IMPORT_TEMPLATE_BLUEPRINTS)) {
    templates[key] = getTemplateDefinitionForApi(key);
  }
  return templates;
}

export function getTemplateBlueprint(internalType) {
  return IMPORT_TEMPLATE_BLUEPRINTS[internalType] || null;
}
