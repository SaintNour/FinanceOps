import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

function normalizeHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ];
  return lines.join('\n');
}

export function exportRowsAsCsv(filename, rows) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportRowsAsXlsx(filename, rows, sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export async function parseSpreadsheetFile(file) {
  const lowerName = (file?.name || '').toLowerCase();
  const isCsv = lowerName.endsWith('.csv') || file?.type?.includes('csv');
  const isXlsx =
    lowerName.endsWith('.xlsx') ||
    file?.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (!isCsv && !isXlsx) {
    throw new Error('Unsupported file type. Please upload a CSV or XLSX file.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) throw new Error('The uploaded file has no sheets.');
  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    defval: '',
    raw: false,
  });

  if (!rows.length) {
    throw new Error('The uploaded file is empty.');
  }

  const normalizedRows = rows.map((row) => {
    const out = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeHeader(key) || key;
      out[normalizedKey] = value;
    });
    return out;
  });

  const normalizedCsv = rowsToCsv(normalizedRows);
  const uploadFile = new File([normalizedCsv], `${file.name.replace(/\.[^.]+$/, '')}.csv`, {
    type: 'text/csv;charset=utf-8',
  });

  return {
    parsedRows: normalizedRows,
    normalizedHeaders: Object.keys(normalizedRows[0] || {}),
    uploadFile,
  };
}

export async function downloadSampleAsXlsxFromUrl(url, filename) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(res.statusText || 'Unable to fetch sample.');
  }
  const text = await res.text();
  const workbook = XLSX.read(text, { type: 'string' });
  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export const ORDERS_SAMPLE_ROWS = [
  {
    order_id: 'ORD-1001',
    order_number: '#1001',
    platform: 'shopify',
    status: 'completed',
    created_at: '2026-04-01',
    gross_revenue: 340.5,
    total_fees: 12.42,
    total_refund_amount: 0,
    total_tax_collected: 24.1,
    net_revenue: 303.98,
  },
  {
    order_id: 'ORD-1002',
    order_number: '#1002',
    platform: 'paypal',
    status: 'partially_refunded',
    created_at: '2026-04-03',
    gross_revenue: 189.99,
    total_fees: 8.27,
    total_refund_amount: 20,
    total_tax_collected: 13.3,
    net_revenue: 148.42,
  },
];

export const TRANSACTIONS_SAMPLE_ROWS = [
  {
    transaction_id: 'TRX-9001',
    transaction_date: '2026-04-02',
    transaction_type: 'deposit',
    source: 'shopify_payout',
    amount: 1250.45,
    currency: 'USD',
    reference: 'PAYOUT-4521',
  },
  {
    transaction_id: 'TRX-9002',
    transaction_date: '2026-04-04',
    transaction_type: 'fee',
    source: 'processor_fee',
    amount: -42.31,
    currency: 'USD',
    reference: 'FEE-APR-01',
  },
];
