import { IMPORT_TEMPLATE_BLUEPRINTS } from './importTemplateDefinitions.js';

function blueprintToFirstRow(bp) {
  const row = {};
  for (const col of bp.columns) {
    row[col.key] = col.example;
  }
  return row;
}

function escapeCsvCell(val) {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Builds CSV string from the shared blueprint (headers = column order in blueprint).
 */
export function buildSampleCsv(internalType) {
  const bp = IMPORT_TEMPLATE_BLUEPRINTS[internalType];
  if (!bp) return null;

  const keys = bp.columns.map((c) => c.key);
  const rows = [blueprintToFirstRow(bp), ...(bp.extraRows || [])];

  const lines = [keys.join(',')];
  for (const r of rows) {
    lines.push(keys.map((k) => escapeCsvCell(r[k] ?? '')).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function getSampleCsvFilename(internalType) {
  const bp = IMPORT_TEMPLATE_BLUEPRINTS[internalType];
  return bp ? `${bp.fileBase}.csv` : null;
}
