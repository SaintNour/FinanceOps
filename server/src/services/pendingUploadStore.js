import { randomUUID } from 'crypto';

const TTL_MS = 60 * 60 * 1000;
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [id, v] of store.entries()) {
    if (now - v.createdAt > TTL_MS) store.delete(id);
  }
}

export function putPending({ buffer, filename, importType, sourceSystem }) {
  prune();
  const id = randomUUID();
  store.set(id, {
    buffer,
    filename,
    importType,
    sourceSystem,
    createdAt: Date.now(),
  });
  return id;
}

export function getPending(id) {
  prune();
  const v = store.get(id);
  if (!v) return null;
  if (Date.now() - v.createdAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return v;
}

export function takePending(id) {
  const v = getPending(id);
  if (v) store.delete(id);
  return v;
}
