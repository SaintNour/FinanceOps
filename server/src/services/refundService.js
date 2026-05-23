import { filterByDate, filterByPlatform, filterBySourceSystem } from '../utils/calculations/financeMetrics.js';
import { parseFlexibleListDates } from '../utils/normalizers/dateRange.js';
import { normalizePlatform } from '../utils/normalizers/platform.js';
import { getFinanceDataset } from './financeDataProvider.js';

export async function listRefunds(query = {}) {
  const platform = normalizePlatform(query.platform);
  const status = query.status ? String(query.status).trim() : null;
  const sourceSystem = query.source_system
    ? String(query.source_system).trim().toLowerCase()
    : null;

  const parsed = parseFlexibleListDates(query);
  if (parsed.error) return { error: parsed.error };
  const { start, end } = parsed;

  const { refunds: all } = await getFinanceDataset();
  let rows = filterBySourceSystem(all, sourceSystem);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'refund_date', start, end);
  if (status) rows = rows.filter((r) => r.refund_status === status);

  rows.sort((a, b) => new Date(b.refund_date) - new Date(a.refund_date));

  const limit = Math.min(Number(query.limit) || 100, 500);
  return { refunds: rows.slice(0, limit) };
}

