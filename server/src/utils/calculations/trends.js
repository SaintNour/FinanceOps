import { PAYMENT_STATUSES, REFUND_STATUSES } from '../../models/entities.js';
import { eachDayInRange, toISODate } from '../normalizers/dateRange.js';

function bucketByDay(rows, dateField, valueField, start, end) {
  const map = new Map();
  for (const row of rows) {
    const d = new Date(row[dateField]);
    if (start && d < start) continue;
    if (end && d > end) continue;
    const key = toISODate(d);
    map.set(key, (map.get(key) || 0) + row[valueField]);
  }
  const days = eachDayInRange(start, end);
  return days.map((day) => ({
    date: day,
    amount: Math.round((map.get(day) || 0) * 100) / 100,
  }));
}

export function revenueTrendByDay(payments, { start, end, platform } = {}) {
  let rows = payments.filter((p) => p.payment_status === PAYMENT_STATUSES.SUCCEEDED);
  if (platform) rows = rows.filter((p) => p.platform === platform);
  return bucketByDay(rows, 'payment_date', 'amount', start, end);
}

export function refundTrendByDay(refunds, { start, end, platform } = {}) {
  let rows = refunds.filter((r) => r.refund_status === REFUND_STATUSES.SUCCEEDED);
  if (platform) rows = rows.filter((r) => r.platform === platform);
  return bucketByDay(rows, 'refund_date', 'refund_amount', start, end);
}

export function feesByPlatform(fees, { start, end } = {}) {
  const map = new Map();
  for (const f of fees) {
    const d = new Date(f.fee_date);
    if (start && d < start) continue;
    if (end && d > end) continue;
    const p = f.platform;
    map.set(p, (map.get(p) || 0) + f.fee_amount);
  }
  return [...map.entries()]
    .map(([platform, amount]) => ({
      platform,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}
