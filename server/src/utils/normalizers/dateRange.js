const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Start of UTC calendar day for a YYYY-MM-DD string. */
export function utcStartOfIsoDate(iso) {
  const s = String(iso || '').trim();
  if (!ISO_DATE.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** End of UTC calendar day for a YYYY-MM-DD string. */
export function utcEndOfIsoDate(iso) {
  const s = String(iso || '').trim();
  if (!ISO_DATE.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function coerceListStart(raw) {
  const iso = utcStartOfIsoDate(raw);
  if (iso) return iso;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function coerceListEnd(raw) {
  const iso = utcEndOfIsoDate(raw);
  if (iso) return iso;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function parseRangeParam(range) {
  const key = String(range || '30d').toLowerCase();
  const days = RANGE_DAYS[key];
  if (!days) return { error: 'Invalid range. Use 7d, 30d, or 90d.' };
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { start, end, days, key };
}

/**
 * Reporting window for finance APIs: rolling presets (7d/30d/90d) or custom UTC calendar dates (from/to).
 * When `from` or `to` is present, both are required (YYYY-MM-DD). `range` is ignored in that case.
 */
export function parseReportingWindow(query) {
  const fromRaw = query.from != null && query.from !== '' ? String(query.from).trim() : '';
  const toRaw = query.to != null && query.to !== '' ? String(query.to).trim() : '';

  if (fromRaw || toRaw) {
    if (!fromRaw || !toRaw) {
      return {
        error: 'Custom range requires both from and to as YYYY-MM-DD (UTC calendar days).',
      };
    }
    const start = utcStartOfIsoDate(fromRaw);
    const end = utcEndOfIsoDate(toRaw);
    if (!start) return { error: 'Invalid from date' };
    if (!end) return { error: 'Invalid to date' };
    if (start > end) return { error: 'from must be on or before to' };
    const spanDays = Math.floor((end - start) / 86400000) + 1;
    const maxDays = 800;
    if (spanDays > maxDays) return { error: `Range too large (max ${maxDays} days).` };
    return {
      start,
      end,
      key: 'custom',
      mode: 'custom',
      days: spanDays,
      from: fromRaw,
      to: toRaw,
    };
  }

  const rangeParam = query.range != null && query.range !== '' ? String(query.range) : '30d';
  const parsed = parseRangeParam(rangeParam);
  if (parsed.error) return parsed;
  return {
    start: parsed.start,
    end: parsed.end,
    key: parsed.key,
    mode: 'preset',
    days: parsed.days,
    from: null,
    to: null,
  };
}

/**
 * List endpoints: optional rolling range, optional partial from/to (YYYY-MM-DD, UTC day bounds).
 * If neither range nor dates are set, both bounds are null (no date filter).
 */
export function parseFlexibleListDates(query) {
  const fromRaw = query.from != null && query.from !== '' ? String(query.from).trim() : '';
  const toRaw = query.to != null && query.to !== '' ? String(query.to).trim() : '';

  if (fromRaw || toRaw) {
    const start = fromRaw ? coerceListStart(fromRaw) : null;
    const end = toRaw ? coerceListEnd(toRaw) : null;
    if (fromRaw && !start) {
      return { error: 'Invalid from date' };
    }
    if (toRaw && !end) {
      return { error: 'Invalid to date' };
    }
    if (start && end && start > end) {
      return { error: 'from must be on or before to' };
    }
    return { start, end };
  }

  if (query.range && !fromRaw && !toRaw) {
    const r = parseRangeParam(query.range);
    if (r.error) return { error: r.error };
    return { start: r.start, end: r.end };
  }

  return { start: null, end: null };
}

export function parseOptionalDates(query) {
  const { from, to } = query;
  if (!from && !to) return { start: null, end: null };
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if (from && Number.isNaN(start.getTime())) return { error: 'Invalid from date' };
  if (to && Number.isNaN(end.getTime())) return { error: 'Invalid to date' };
  if (start && end && start > end) return { error: 'from must be before to' };
  return { start, end };
}

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export function eachDayInRange(start, end) {
  const days = [];
  const cur = new Date(start);
  cur.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}
