import {
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  ORDER_STATUSES,
} from '../models/entities.js';
import {
  filterByDate,
  filterByPlatform,
  filterBySourceSystem,
} from '../utils/calculations/financeMetrics.js';
import { parseRangeParam, parseReportingWindow } from '../utils/normalizers/dateRange.js';
import { normalizePlatform } from '../utils/normalizers/platform.js';
import { getFinanceDataset } from './financeDataProvider.js';
import { sumAdjustmentsByEntity } from './adjustmentsService.js';
import { countNotesByEntity } from './notesService.js';

const METRIC_DEFS = {
  grossRevenue: {
    label: 'Gross revenue',
    entityType: 'payment',
    note: 'Succeeded payments (amount) in the selected range.',
  },
  netRevenue: {
    label: 'Net revenue',
    entityType: 'payment',
    note:
      'Shown as succeeded payments below. Net = payments - refunds - fees for the same range (see totals).',
  },
  totalRefundAmount: {
    label: 'Total refund amount',
    entityType: 'refund',
    note: 'Succeeded refunds in the selected range.',
  },
  totalFees: {
    label: 'Total fees',
    entityType: 'fee',
    note: 'All fee records (processor + platform) in the selected range.',
  },
  totalTaxCollected: {
    label: 'Total tax collected',
    entityType: 'order',
    note: 'Sum of order total_tax for orders in the selected range.',
  },
  totalOrders: {
    label: 'Total orders',
    entityType: 'order',
    note: 'Orders created in the selected range.',
  },
  refundRate: {
    label: 'Refund rate',
    entityType: 'refund',
    note:
      'Succeeded refunds in the selected range (rate = refunded orders / completed-like orders).',
  },
};

function normalizeDateRange(query) {
  const { range, bucketStart, bucketEnd, from, to } = query;
  if (bucketStart || bucketEnd) {
    const start = bucketStart ? new Date(bucketStart) : null;
    const end = bucketEnd ? new Date(bucketEnd) : null;
    if (bucketStart && Number.isNaN(start.getTime())) {
      return { error: 'Invalid bucketStart' };
    }
    if (bucketEnd && Number.isNaN(end.getTime())) {
      return { error: 'Invalid bucketEnd' };
    }
    if (start) start.setUTCHours(0, 0, 0, 0);
    if (end) end.setUTCHours(23, 59, 59, 999);
    return { start, end, key: 'custom' };
  }
  if (from || to) {
    const w = parseReportingWindow({ from, to });
    if (w.error) return { error: w.error };
    return { start: w.start, end: w.end, key: 'custom' };
  }
  const parsed = parseRangeParam(range || '30d');
  if (parsed.error) return { error: parsed.error };
  return { start: parsed.start, end: parsed.end, key: parsed.key };
}

function makeKey(sourceSystem, sourceId) {
  return `${sourceSystem || ''}::${sourceId || ''}`;
}

function decorateRows(rows, extract, adjMap, noteMap) {
  return rows.map((r) => {
    const extracted = extract(r);
    const key = makeKey(extracted.source_system, extracted.source_id);
    const adj = adjMap.get(key);
    const notes = noteMap.get(key) || 0;
    const adjustmentTotal = adj ? adj.total : 0;
    const adjustmentCount = adj ? adj.count : 0;
    return {
      ...extracted,
      adjustment_total: adjustmentTotal,
      adjustment_count: adjustmentCount,
      note_count: notes,
      adjusted_amount: Number((extracted.raw_amount + adjustmentTotal).toFixed(4)),
    };
  });
}

function sumRaw(rows) {
  return rows.reduce((acc, r) => acc + Number(r.raw_amount || 0), 0);
}

function sumAdj(rows) {
  return rows.reduce((acc, r) => acc + Number(r.adjustment_total || 0), 0);
}

function applyCommonFilters(rows, dateField, { start, end, platform, sourceSystem }) {
  let out = filterBySourceSystem(rows, sourceSystem);
  out = filterByPlatform(out, platform);
  out = filterByDate(out, dateField, start, end);
  return out;
}

export async function getDrillDown(query) {
  const metric = String(query.metric || '').trim();
  const def = METRIC_DEFS[metric];
  if (!def) {
    return {
      error: `Unknown metric '${metric}'. Valid: ${Object.keys(METRIC_DEFS).join(', ')}`,
    };
  }

  const range = normalizeDateRange(query);
  if (range.error) return { error: range.error };

  const platform = normalizePlatform(query.platform);
  const status = query.status ? String(query.status).trim() : null;
  const sourceSystem = query.source_system
    ? String(query.source_system).trim().toLowerCase()
    : null;

  const limit = Math.max(1, Math.min(Number(query.limit) || 500, 2000));

  const dataset = await getFinanceDataset();
  const { orders, payments, refunds, fees } = dataset;

  let rows = [];
  let extract;
  let totalsExtras = {};

  if (def.entityType === 'payment') {
    let subset = payments.filter((p) => p.payment_status === PAYMENT_STATUSES.SUCCEEDED);
    subset = applyCommonFilters(subset, 'payment_date', {
      start: range.start,
      end: range.end,
      platform,
      sourceSystem,
    });
    rows = subset;
    extract = (p) => ({
      source_system: p.source_system,
      source_id: p.source_id || p.payment_id,
      display_id: p.payment_id,
      date: p.payment_date,
      platform: p.platform,
      status: p.payment_status,
      secondary_id: p.order_id,
      label: p.payment_processor,
      raw_amount: Number(p.amount || 0),
      currency: p.currency || 'USD',
    });

    if (metric === 'netRevenue') {
      // Include refunds + fees in the totals so the drawer can show Net = X.
      const refundsInRange = applyCommonFilters(
        refunds.filter((r) => r.refund_status === REFUND_STATUSES.SUCCEEDED),
        'refund_date',
        { start: range.start, end: range.end, platform, sourceSystem },
      );
      const feesInRange = applyCommonFilters(
        fees,
        'fee_date',
        { start: range.start, end: range.end, platform, sourceSystem },
      );
      totalsExtras = {
        refundsAmount: refundsInRange.reduce((a, r) => a + Number(r.refund_amount || 0), 0),
        refundsCount: refundsInRange.length,
        feesAmount: feesInRange.reduce((a, f) => a + Number(f.fee_amount || 0), 0),
        feesCount: feesInRange.length,
      };
    }
  } else if (def.entityType === 'refund') {
    let subset = refunds.filter((r) => r.refund_status === REFUND_STATUSES.SUCCEEDED);
    subset = applyCommonFilters(subset, 'refund_date', {
      start: range.start,
      end: range.end,
      platform,
      sourceSystem,
    });
    rows = subset;
    extract = (r) => ({
      source_system: r.source_system,
      source_id: r.source_id || r.refund_id,
      display_id: r.refund_id,
      date: r.refund_date,
      platform: r.platform,
      status: r.refund_status,
      secondary_id: r.order_id,
      label: r.refund_reason || '',
      raw_amount: Number(r.refund_amount || 0),
      currency: r.currency || 'USD',
    });

    if (metric === 'refundRate') {
      const COMPLETED_LIKE = new Set([
        ORDER_STATUSES.COMPLETED,
        ORDER_STATUSES.REFUNDED,
        ORDER_STATUSES.PARTIALLY_REFUNDED,
      ]);
      const completedOrders = applyCommonFilters(
        orders.filter((o) => COMPLETED_LIKE.has(o.order_status)),
        'order_date',
        { start: range.start, end: range.end, platform, sourceSystem },
      );
      const completedIds = new Set(completedOrders.map((o) => o.order_id));
      const refundedOrderIds = new Set();
      for (const r of rows) {
        if (completedIds.has(r.order_id)) refundedOrderIds.add(r.order_id);
      }
      totalsExtras = {
        completedOrdersCount: completedOrders.length,
        refundedOrdersCount: refundedOrderIds.size,
        rate:
          completedOrders.length > 0
            ? refundedOrderIds.size / completedOrders.length
            : 0,
      };
    }
  } else if (def.entityType === 'fee') {
    const subset = applyCommonFilters(fees, 'fee_date', {
      start: range.start,
      end: range.end,
      platform,
      sourceSystem,
    });
    rows = subset;
    extract = (f) => ({
      source_system: f.source_system,
      source_id: f.source_id || f.fee_id,
      display_id: f.fee_id,
      date: f.fee_date,
      platform: f.platform,
      status: f.source,
      secondary_id: f.order_id,
      label: f.fee_type,
      raw_amount: Number(f.fee_amount || 0),
      currency: f.currency || 'USD',
    });
  } else if (def.entityType === 'order') {
    let subset = applyCommonFilters(orders, 'order_date', {
      start: range.start,
      end: range.end,
      platform,
      sourceSystem,
    });
    if (status) subset = subset.filter((o) => o.order_status === status);
    rows = subset;
    const amountField = metric === 'totalTaxCollected' ? 'total_tax' : 'gross_amount';
    extract = (o) => ({
      source_system: o.source_system,
      source_id: o.source_id || o.order_id,
      display_id: o.order_id,
      date: o.order_date,
      platform: o.platform,
      status: o.order_status,
      secondary_id: null,
      label: o.customer_name || '',
      raw_amount: Number(o[amountField] || 0),
      currency: o.currency || 'USD',
    });
  }

  rows.sort((a, b) => {
    const dateA = new Date(extract(a).date).getTime();
    const dateB = new Date(extract(b).date).getTime();
    return dateB - dateA;
  });

  const allExtracted = rows.map(extract);
  const totalRows = allExtracted.length;
  const displayed = allExtracted.slice(0, limit);

  // Only pull adjustment / note aggregates when the DB is available.
  const keys = displayed
    .filter((r) => r.source_system && r.source_id)
    .map((r) => ({ source_system: r.source_system, source_id: r.source_id }));

  let adjMap = new Map();
  let noteMap = new Map();
  if (dataset.mode === 'database' && keys.length > 0) {
    try {
      [adjMap, noteMap] = await Promise.all([
        sumAdjustmentsByEntity(def.entityType, keys),
        countNotesByEntity(def.entityType, keys),
      ]);
    } catch (e) {
      console.error('[drill-down] adjustment/note lookup failed:', e.message);
    }
  }

  const decorated = decorateRows(
    displayed,
    (row) => row,
    adjMap,
    noteMap,
  );

  const rawTotal = sumRaw(decorated);
  const adjTotal = sumAdj(decorated);

  return {
    metric,
    entityType: def.entityType,
    label: def.label,
    note: def.note,
    range: {
      start: range.start ? range.start.toISOString() : null,
      end: range.end ? range.end.toISOString() : null,
      key: range.key,
    },
    filters: {
      platform: platform || null,
      status: status || null,
      sourceSystem: sourceSystem || null,
    },
    totals: {
      rowCount: totalRows,
      shownCount: decorated.length,
      rawAmount: Number(rawTotal.toFixed(4)),
      adjustmentAmount: Number(adjTotal.toFixed(4)),
      adjustedAmount: Number((rawTotal + adjTotal).toFixed(4)),
      adjustmentsSupported: dataset.mode === 'database',
      ...totalsExtras,
    },
    rows: decorated,
  };
}
