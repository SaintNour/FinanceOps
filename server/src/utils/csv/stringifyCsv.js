/** Shared CSV serialization for exports (RFC-style quoting). */

export function escapeCsvCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {{ key: string, header: string }[]} columns
 * @param {Record<string, unknown>[]} rows
 */
export function buildCsvFromColumns(columns, rows) {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const lines = [headerLine];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvCell(row[c.key])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function fmtIsoDate(val) {
  if (val == null || val === '') return '';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(val);
  }
}

export function fmtIsoDateTime(val) {
  if (val == null || val === '') return '';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toISOString();
  } catch {
    return String(val);
  }
}

export function fmtMoney(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n.toFixed(2);
}

export function fmtPercent(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return `${n.toFixed(2)}%`;
}
