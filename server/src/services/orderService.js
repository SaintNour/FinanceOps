import { filterByDate, filterByPlatform, filterBySourceSystem } from '../utils/calculations/financeMetrics.js';
import { parseFlexibleListDates } from '../utils/normalizers/dateRange.js';
import { normalizePlatform } from '../utils/normalizers/platform.js';
import { getFinanceDataset } from './financeDataProvider.js';

function matchesStatus(order, status) {
  if (!status) return true;
  return order.order_status === status;
}

export async function listOrders(query = {}) {
  const platform = normalizePlatform(query.platform);
  const status = query.status ? String(query.status).trim() : null;
  const sourceSystem = query.source_system
    ? String(query.source_system).trim().toLowerCase()
    : null;

  const parsed = parseFlexibleListDates(query);
  if (parsed.error) return { error: parsed.error };
  const { start, end } = parsed;

  const { orders: all } = await getFinanceDataset();
  let rows = filterBySourceSystem(all, sourceSystem);
  rows = filterByPlatform(rows, platform);
  rows = filterByDate(rows, 'order_date', start, end);
  if (status) rows = rows.filter((o) => matchesStatus(o, status));

  rows.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  const limit = Math.min(Number(query.limit) || 100, 500);
  return { orders: rows.slice(0, limit) };
}

