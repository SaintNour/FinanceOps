import { getPool } from '../db/pool.js';
import { writeAudit } from './auditService.js';

function parseYearMonth(yearMaybe, monthMaybe) {
  const year = Number(yearMaybe);
  const month = Number(monthMaybe);
  if (!Number.isFinite(year) || year < 1970 || year > 9999) {
    return { error: 'year must be a valid integer' };
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { error: 'month must be between 1 and 12' };
  }
  return { year, month };
}

function dateToYearMonth(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export async function listClosedPeriods() {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT year, month, closed_at, closed_by, reason
     FROM closed_periods
     ORDER BY year DESC, month DESC`,
  );
  return rows.map((r) => ({
    year: r.year,
    month: r.month,
    closedAt: r.closed_at instanceof Date ? r.closed_at.toISOString() : r.closed_at,
    closedBy: r.closed_by,
    reason: r.reason,
  }));
}

export async function getClosedPeriodSet() {
  const pool = getPool();
  if (!pool) return new Set();
  const { rows } = await pool.query(`SELECT year, month FROM closed_periods`);
  const set = new Set();
  for (const r of rows) set.add(`${r.year}-${r.month}`);
  return set;
}

/**
 * Return the subset of the given (year, month) pairs that are currently closed.
 * Input: iterable of {year, month}.
 */
export async function findClosedPeriodsForRange(periods) {
  const closed = await getClosedPeriodSet();
  const hits = [];
  const seen = new Set();
  for (const p of periods) {
    if (!p) continue;
    const key = `${p.year}-${p.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (closed.has(key)) hits.push({ year: p.year, month: p.month });
  }
  return hits;
}

export async function isDateInClosedPeriod(value) {
  const ym = dateToYearMonth(value);
  if (!ym) return false;
  const closed = await getClosedPeriodSet();
  return closed.has(`${ym.year}-${ym.month}`);
}

export async function closePeriod({ year, month, actor, reason }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  const parsed = parseYearMonth(year, month);
  if (parsed.error) return parsed;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO closed_periods (year, month, closed_by, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (year, month) DO NOTHING
       RETURNING year, month, closed_at, closed_by, reason`,
      [parsed.year, parsed.month, actor || 'system', reason || null],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: `Period ${parsed.year}-${String(parsed.month).padStart(2, '0')} is already closed` };
    }
    const record = rows[0];
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'period.close',
      entityType: 'period',
      entityId: `${record.year}-${String(record.month).padStart(2, '0')}`,
      after: record,
      metadata: { reason: reason || null },
    });
    await client.query('COMMIT');
    return {
      period: {
        year: record.year,
        month: record.month,
        closedAt: record.closed_at instanceof Date ? record.closed_at.toISOString() : record.closed_at,
        closedBy: record.closed_by,
        reason: record.reason,
      },
    };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to close period' };
  } finally {
    client.release();
  }
}

export async function reopenPeriod({ year, month, actor, reason }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  const parsed = parseYearMonth(year, month);
  if (parsed.error) return parsed;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `DELETE FROM closed_periods
       WHERE year = $1 AND month = $2
       RETURNING year, month, closed_at, closed_by, reason`,
      [parsed.year, parsed.month],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: `Period ${parsed.year}-${String(parsed.month).padStart(2, '0')} is not closed` };
    }
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'period.reopen',
      entityType: 'period',
      entityId: `${rows[0].year}-${String(rows[0].month).padStart(2, '0')}`,
      before: rows[0],
      metadata: { reason: reason || null },
    });
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to reopen period' };
  } finally {
    client.release();
  }
}
