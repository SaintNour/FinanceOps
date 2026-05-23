import { compactParams } from './financeApi.js';
import { getJson, postJson } from './http.js';

export function fetchReconciliationSummary() {
  return getJson('/api/reconciliation/summary').then((r) => r?.data ?? null);
}

export function fetchReconciliationPayouts(params) {
  return getJson('/api/reconciliation/payouts', compactParams(params)).then(
    (r) => r?.data?.payouts ?? [],
  );
}

export function fetchReconciliationBanks(params) {
  return getJson('/api/reconciliation/bank-transactions', compactParams(params)).then(
    (r) => r?.data?.bankTransactions ?? [],
  );
}

export function fetchReconciliationMatches(params) {
  return getJson('/api/reconciliation/matches', compactParams(params)).then(
    (r) => r?.data?.matches ?? [],
  );
}

export function fetchReconciliationRuns(limit = 40) {
  return getJson('/api/reconciliation/runs', { limit: String(limit) }).then(
    (r) => r?.data?.runs ?? [],
  );
}

export function fetchPayoutDetail(id) {
  return getJson(`/api/reconciliation/payout/${id}`).then((r) => r?.data ?? null);
}

export function runReconciliation(body) {
  return postJson('/api/reconciliation/run', body).then((r) => r?.data ?? null);
}

export function manualReconciliationMatch(body) {
  return postJson('/api/reconciliation/match', body).then((r) => r?.data ?? null);
}

export function manualReconciliationUnmatch(body) {
  return postJson('/api/reconciliation/unmatch', body).then((r) => r?.data ?? null);
}

export function markReconciliationReview(body) {
  return postJson('/api/reconciliation/mark-review', body).then((r) => r?.data ?? null);
}
