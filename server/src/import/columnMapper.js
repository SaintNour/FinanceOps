import { FIELD_SETS } from './fieldAliases.js';

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @param {string[]} headers
 * @param {'orders'|'payments'|'refunds'|'fees'} importType
 * @returns {Record<string, string>} canonicalField -> csvHeader
 */
export function guessColumnMapping(headers, importType) {
  const fields = FIELD_SETS[importType];
  if (!fields) return {};
  const headerNorm = headers.map((h) => ({ raw: h, n: norm(h) }));
  const mapping = {};
  for (const [canonical, aliases] of Object.entries(fields)) {
    for (const al of aliases) {
      const target = norm(al);
      const hit = headerNorm.find((h) => h.n === target);
      if (hit) {
        mapping[canonical] = hit.raw;
        break;
      }
    }
  }
  return mapping;
}

/**
 * @param {Record<string, string>} row raw CSV row
 * @param {Record<string, string>} mapping canonical -> csv header
 */
export function applyColumnMapping(row, mapping) {
  const out = {};
  for (const [canonical, csvHeader] of Object.entries(mapping)) {
    if (!csvHeader) continue;
    if (Object.prototype.hasOwnProperty.call(row, csvHeader)) {
      out[canonical] = row[csvHeader];
    }
  }
  return out;
}
