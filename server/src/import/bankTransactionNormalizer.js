import { parseDate } from './normalizeRow.js';

function stripAmount(raw) {
  if (raw == null || raw === '') return null;
  return String(raw).replace(/[$,]/g, '').trim();
}

export function deriveAmount(mapped) {
  const direct = stripAmount(mapped.amount);
  if (direct) {
    const n = Number(direct);
    if (!Number.isNaN(n)) return { value: n };
  }
  const debit = stripAmount(mapped.debit);
  const credit = stripAmount(mapped.credit);
  const d = debit ? Number(debit) : 0;
  const c = credit ? Number(credit) : 0;
  if (!debit && !credit) return { error: 'Missing amount/debit/credit' };
  if (Number.isNaN(d) || Number.isNaN(c)) return { error: 'Invalid debit/credit' };
  return { value: c - d };
}

export function normalizeBankTransactionRow(mapped, sourceSystem, raw) {
  const errs = [];

  const dateRaw = mapped.transaction_date || mapped.posted_date;
  if (!dateRaw) errs.push('transaction_date or posted_date is required');

  const td = dateRaw ? parseDate(dateRaw) : null;
  if (td?.error) errs.push(td.error);

  let postedDateStr = null;
  if (mapped.posted_date && mapped.posted_date !== mapped.transaction_date) {
    const pd = parseDate(mapped.posted_date);
    if (pd.error) errs.push(pd.error);
    else postedDateStr = pd.value.toISOString().slice(0, 10);
  }

  const amt = deriveAmount(mapped);
  if (amt.error) errs.push(amt.error);

  if (errs.length) return { error: errs.join('; ') };

  const transactionDate = td.value.toISOString().slice(0, 10);

  const currency = (mapped.currency || 'USD').toString().toUpperCase().slice(0, 10);

  const baseId = String(mapped.source_id || '').trim();
  const stableSourceId = baseId
    ? baseId.slice(0, 500)
    : `${sourceSystem}:${transactionDate}:${amt.value}:${mapped.reference_number || 'na'}`.slice(
        0,
        500,
      );

  return {
    row: {
      source_system: sourceSystem,
      source_id: stableSourceId,
      bank_account_name: mapped.bank_account_name || null,
      bank_account_last4: mapped.bank_account_last4
        ? String(mapped.bank_account_last4).replace(/\D/g, '').slice(-4)
        : null,
      transaction_date: transactionDate,
      posted_date: postedDateStr,
      amount: amt.value,
      currency,
      transaction_type: String(mapped.transaction_type || 'unknown').toLowerCase().slice(0, 64),
      description: mapped.description || '',
      reference_number: mapped.reference_number || null,
      external_reference: mapped.external_reference || null,
      raw_payload_json: raw ?? mapped,
      reconciliation_status: 'unmatched',
    },
  };
}
