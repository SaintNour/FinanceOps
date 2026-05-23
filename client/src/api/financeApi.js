import { getJson, postForm, postJson } from './http.js';
import { pickImportJobs, pickOrders, pickRefunds } from './safeData.js';

export function compactParams(params) {
  const o = {};
  if (!params) return o;
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') o[k] = String(v);
  }
  return o;
}

function unwrapOrNull(r) {
  return r?.data ?? null;
}

function unwrapRequired(r, label) {
  const d = r?.data;
  if (d == null) {
    throw new Error(label || 'Unexpected response from server.');
  }
  return d;
}

export function fetchFinanceMeta() {
  return getJson('/api/finance/meta').then((r) => unwrapOrNull(r));
}

export function fetchFinanceSummary(params) {
  return getJson('/api/finance/summary', compactParams(params)).then((r) =>
    unwrapRequired(r, 'Unable to load summary.'),
  );
}

export function fetchRevenueTrend(params) {
  return getJson('/api/finance/revenue-trend', compactParams(params)).then((r) =>
    unwrapOrNull(r),
  );
}

export function fetchRefundTrend(params) {
  return getJson('/api/finance/refund-trend', compactParams(params)).then((r) =>
    unwrapOrNull(r),
  );
}

export function fetchFeesByPlatform(params) {
  return getJson('/api/finance/fees-by-platform', compactParams(params)).then((r) =>
    unwrapOrNull(r),
  );
}

export function fetchFeesByType(params) {
  return getJson('/api/finance/fees-by-type', compactParams(params)).then((r) =>
    unwrapOrNull(r),
  );
}

export function fetchRefundReasons(params) {
  return getJson('/api/finance/refund-reasons', compactParams(params)).then((r) =>
    unwrapOrNull(r),
  );
}

export function fetchOrders(params) {
  return getJson('/api/finance/orders', compactParams(params)).then((r) => pickOrders(r));
}

export function fetchRefunds(params) {
  return getJson('/api/finance/refunds', compactParams(params)).then((r) => pickRefunds(r));
}

export function fetchDrillDown(params) {
  return getJson('/api/finance/drill-down', compactParams(params)).then((r) =>
    unwrapRequired(r, 'Unable to load details.'),
  );
}

export { postJson };

export async function uploadImportCsv(formData) {
  const body = await postForm('/api/import/upload', formData);
  return body?.data ?? null;
}

export function previewImport(body) {
  return postJson('/api/import/preview', body).then((r) => unwrapRequired(r, 'Unable to preview import.'));
}

export function commitImport(body) {
  return postJson('/api/import/commit', body).then((r) => unwrapRequired(r, 'Unable to commit import.'));
}

export function fetchImportJobs(limit = 50) {
  return getJson('/api/import/jobs', compactParams({ limit: String(limit) })).then((r) =>
    pickImportJobs(r),
  );
}

/** Returns { guide, templates } from a single server source of truth. */
export function fetchImportTemplateDefinitions() {
  return getJson('/api/import/template-definitions').then((r) =>
    unwrapRequired(r, 'Unable to load import templates.'),
  );
}
