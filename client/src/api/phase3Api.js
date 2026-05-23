import { postJson, compactParams } from './financeApi.js';
import { getJson, sendJson } from './http.js';

export function listAdjustments(params) {
  return getJson('/api/adjustments', compactParams(params)).then(
    (r) => r?.data?.adjustments ?? [],
  );
}

export function fetchAdjustmentsSummary(entityType) {
  return getJson('/api/adjustments/summary', { entity_type: entityType }).then(
    (r) => r?.data?.summary ?? [],
  );
}

export function createAdjustment(body) {
  return postJson('/api/adjustments', body).then((r) => r?.data?.adjustment);
}

export function updateAdjustment(id, body) {
  return sendJson(`/api/adjustments/${encodeURIComponent(id)}`, 'PATCH', body).then(
    (r) => r?.data?.adjustment,
  );
}

export function deleteAdjustment(id) {
  return sendJson(`/api/adjustments/${encodeURIComponent(id)}`, 'DELETE');
}

export function listNotes(params) {
  return getJson('/api/notes', compactParams(params)).then((r) => r?.data?.notes ?? []);
}

export function createNote(body) {
  return postJson('/api/notes', body).then((r) => r?.data?.note);
}

export function deleteNote(id) {
  return sendJson(`/api/notes/${encodeURIComponent(id)}`, 'DELETE');
}

export function listClosedPeriods() {
  return getJson('/api/periods').then((r) => r?.data?.periods ?? []);
}

export function closePeriod(body) {
  return postJson('/api/periods', body).then((r) => r?.data?.period);
}

export function reopenPeriod(year, month, body) {
  return sendJson(`/api/periods/${year}/${month}`, 'DELETE', body);
}

export function fetchAuditLog(params) {
  return getJson('/api/audit', compactParams(params)).then((r) => r?.data ?? null);
}
