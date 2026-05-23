/** Canonical bank_transactions CSV fields -> header aliases */
export const BANK_TRANSACTION_FIELDS = {
  source_id: ['source_id', 'id', 'transaction id', 'transaction_id', 'fitid'],
  bank_account_name: ['bank_account_name', 'account name', 'account', 'bank account'],
  bank_account_last4: ['bank_account_last4', 'account last4', 'last4', 'account number'],
  transaction_date: ['transaction_date', 'date', 'trans date', 'posting date'],
  posted_date: ['posted_date', 'post date', 'posted', 'value date'],
  amount: ['amount', 'transaction amount', 'amt'],
  debit: ['debit', 'withdrawal', 'dr'],
  credit: ['credit', 'deposit', 'cr'],
  currency: ['currency', 'curr'],
  transaction_type: ['transaction_type', 'type', 'category'],
  description: ['description', 'memo', 'details', 'narrative'],
  reference_number: ['reference_number', 'reference', 'check number', 'trace'],
  external_reference: ['external_reference', 'bank ref', 'confirmation'],
};
