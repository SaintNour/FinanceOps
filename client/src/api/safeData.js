/** Safe extraction from API envelope `{ ok, data }` — never throws */

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function unwrapData(body) {
  if (!body || typeof body !== 'object') return undefined;
  return body.data;
}

export function pickOrders(body) {
  const d = unwrapData(body);
  const orders = d?.orders;
  return asArray(orders);
}

export function pickRefunds(body) {
  const d = unwrapData(body);
  const refunds = d?.refunds;
  return asArray(refunds);
}

export function pickImportJobs(body) {
  const d = unwrapData(body);
  return asArray(d?.jobs);
}
