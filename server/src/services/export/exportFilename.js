/**
 * Safe ASCII filename for Content-Disposition (prefix = logical export type).
 */
export function makeExportFilename(prefix) {
  const safe = String(prefix || 'export').replace(/[^\w.-]+/g, '_');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${safe}_${ts}.csv`;
}
