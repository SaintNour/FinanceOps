import { canonicalPlatformKey, formatPlatformDisplay } from './normalizers/platform.js';

/**
 * Builds sorted `{ id, label }` options from finance row sets (orders, payments, refunds, fees).
 */
export function distinctPlatformOptionsFromRows(rowSets) {
  const set = new Set();
  for (const rows of rowSets) {
    if (!rows) continue;
    for (const row of rows) {
      const k = canonicalPlatformKey(row.platform);
      if (k) set.add(k);
    }
  }
  return [...set]
    .sort((a, b) => formatPlatformDisplay(a).localeCompare(formatPlatformDisplay(b)))
    .map((id) => ({ id, label: formatPlatformDisplay(id) }));
}
