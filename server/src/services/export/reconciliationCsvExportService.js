import { getPool } from '../../db/pool.js';
import {
  listBankTransactionsForReport,
  listMatchesForReport,
  listPayoutsForReport,
} from '../reconciliationReportingService.js';
import { makeExportFilename } from './exportFilename.js';
import {
  buildCsvFromColumns,
  fmtIsoDate,
  fmtIsoDateTime,
  fmtMoney,
} from '../../utils/csv/stringifyCsv.js';

function requirePool() {
  if (!getPool()) {
    const e = new Error('CSV exports require DATABASE_URL');
    e.statusCode = 400;
    throw e;
  }
}

function matchedBankLabel(row) {
  const id = row.matched_bank_transaction_id;
  const desc = row.matched_bank_description;
  const ref = row.matched_bank_reference;
  if (!id && !desc && !ref) return '';
  const parts = [];
  if (id != null) parts.push(`bank_tx:${id}`);
  if (ref) parts.push(String(ref));
  if (desc) parts.push(String(desc).replace(/\s+/g, ' ').trim().slice(0, 240));
  return parts.join(' | ');
}

/**
 * Query params align with GET /api/reconciliation/payouts (status, from, to, source_system, currency, platform).
 */
export async function buildReconciliationPayoutsExportCsv(query = {}) {
  requirePool();
  const rows = await listPayoutsForReport(query, { limit: 50000 });
  const data = rows.map((r) => ({
    payout_id: r.payout_id ?? '',
    platform: r.platform ?? '',
    payout_date: fmtIsoDate(r.payout_date),
    arrival_date: fmtIsoDate(r.arrival_date),
    amount: fmtMoney(r.amount),
    currency: r.currency ?? '',
    payout_status: r.payout_status ?? '',
    matched_bank_transaction: matchedBankLabel(r),
    match_status: r.match_status ?? '',
    confidence_score:
      r.confidence_score != null && r.confidence_score !== '' ? String(r.confidence_score) : '',
    amount_difference:
      r.amount_difference != null && r.amount_difference !== '' ? fmtMoney(r.amount_difference) : '',
    date_difference_days:
      r.date_difference_days != null && r.date_difference_days !== ''
        ? String(r.date_difference_days)
        : '',
    notes: r.match_notes ?? '',
  }));

  const columns = [
    { key: 'payout_id', header: 'payout_id' },
    { key: 'platform', header: 'platform' },
    { key: 'payout_date', header: 'payout_date' },
    { key: 'arrival_date', header: 'arrival_date' },
    { key: 'amount', header: 'amount' },
    { key: 'currency', header: 'currency' },
    { key: 'payout_status', header: 'payout_status' },
    { key: 'matched_bank_transaction', header: 'matched_bank_transaction' },
    { key: 'match_status', header: 'match_status' },
    { key: 'confidence_score', header: 'confidence_score' },
    { key: 'amount_difference', header: 'amount_difference' },
    { key: 'date_difference_days', header: 'date_difference_days' },
    { key: 'notes', header: 'notes' },
  ];

  return {
    csv: buildCsvFromColumns(columns, data),
    filename: makeExportFilename('reconciliation-payouts'),
  };
}

/** Same filters as GET /api/reconciliation/bank-transactions */
export async function buildReconciliationBankTransactionsExportCsv(query = {}) {
  requirePool();
  const rows = await listBankTransactionsForReport(query, { limit: 50000 });
  const data = rows.map((r) => ({
    transaction_date: fmtIsoDate(r.transaction_date),
    posted_date: r.posted_date ? fmtIsoDate(r.posted_date) : '',
    amount: fmtMoney(r.amount),
    currency: r.currency ?? '',
    transaction_type: r.transaction_type ?? '',
    description: r.description ?? '',
    reference_number: r.reference_number ?? '',
    bank_account_name: r.bank_account_name ?? '',
    bank_account_last4: r.bank_account_last4 ?? '',
    reconciliation_status: r.reconciliation_status ?? '',
    source_system: r.source_system ?? '',
    id: r.id != null ? String(r.id) : '',
  }));

  const columns = [
    { key: 'id', header: 'bank_transaction_id' },
    { key: 'source_system', header: 'source_system' },
    { key: 'transaction_date', header: 'transaction_date' },
    { key: 'posted_date', header: 'posted_date' },
    { key: 'amount', header: 'amount' },
    { key: 'currency', header: 'currency' },
    { key: 'transaction_type', header: 'transaction_type' },
    { key: 'description', header: 'description' },
    { key: 'reference_number', header: 'reference_number' },
    { key: 'bank_account_name', header: 'bank_account_name' },
    { key: 'bank_account_last4', header: 'bank_account_last4' },
    { key: 'reconciliation_status', header: 'reconciliation_status' },
  ];

  return {
    csv: buildCsvFromColumns(columns, data),
    filename: makeExportFilename('reconciliation-bank-transactions'),
  };
}

/** Filters: match_status, match_method, from, to, source_system, platform, currency */
export async function buildReconciliationMatchesExportCsv(query = {}) {
  requirePool();
  const rows = await listMatchesForReport(query, { limit: 50000 });
  const data = rows.map((r) => ({
    payout_id: r.payout_id ?? '',
    bank_transaction_id:
      r.bank_transaction_record_id != null ? String(r.bank_transaction_record_id) : '',
    match_status: r.match_status ?? '',
    match_method: r.match_method ?? '',
    confidence_score:
      r.confidence_score != null && r.confidence_score !== '' ? String(r.confidence_score) : '',
    amount_difference:
      r.amount_difference != null && r.amount_difference !== '' ? fmtMoney(r.amount_difference) : '',
    date_difference_days:
      r.date_difference_days != null && r.date_difference_days !== ''
        ? String(r.date_difference_days)
        : '',
    notes: r.notes ?? '',
    created_at: fmtIsoDateTime(r.created_at),
    updated_at: fmtIsoDateTime(r.updated_at),
  }));

  const columns = [
    { key: 'payout_id', header: 'payout_id' },
    { key: 'bank_transaction_id', header: 'bank_transaction_id' },
    { key: 'match_status', header: 'match_status' },
    { key: 'match_method', header: 'match_method' },
    { key: 'confidence_score', header: 'confidence_score' },
    { key: 'amount_difference', header: 'amount_difference' },
    { key: 'date_difference_days', header: 'date_difference_days' },
    { key: 'notes', header: 'notes' },
    { key: 'created_at', header: 'created_at' },
    { key: 'updated_at', header: 'updated_at' },
  ];

  return {
    csv: buildCsvFromColumns(columns, data),
    filename: makeExportFilename('reconciliation-matches'),
  };
}
