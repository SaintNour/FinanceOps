import { parse } from 'csv-parse/sync';

export function parseCsvBuffer(buffer, options = {}) {
  const text = buffer.toString('utf8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
    ...options,
  });
}

export function getColumnNames(records) {
  if (!records.length) return [];
  return Object.keys(records[0]);
}
