import { compactParams } from './financeApi.js';
import { fetchBlob } from './http.js';

function buildQueryParams(params) {
  const o = compactParams(params);
  return o;
}

/**
 * Downloads CSV via fetch; throws with friendly message on failure.
 */
export async function downloadExportCsv(path, params) {
  const flat = buildQueryParams(params);
  const { blob, filename } = await fetchBlob(path, flat, 'text/csv');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export function exportFinanceSummaryCsv(params) {
  return downloadExportCsv('/api/export/finance/summary', params);
}

export function exportReconciliationPayoutsCsv(params) {
  return downloadExportCsv('/api/export/reconciliation/payouts', params);
}

export function exportReconciliationBankCsv(params) {
  return downloadExportCsv('/api/export/reconciliation/bank-transactions', params);
}

export function exportReconciliationMatchesCsv(params) {
  return downloadExportCsv('/api/export/reconciliation/matches', params);
}
