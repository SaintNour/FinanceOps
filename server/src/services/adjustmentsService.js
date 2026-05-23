import { getPool } from '../db/pool.js';
import { writeAudit } from './auditService.js';

const ALLOWED_ENTITY_TYPES = new Set(['order', 'payment', 'refund', 'fee']);

function validateEntity(entityType, sourceSystem, sourceId) {
  if (!ALLOWED_ENTITY_TYPES.has(String(entityType))) {
    return { error: "entity_type must be one of 'order', 'payment', 'refund', 'fee'" };
  }
  if (!sourceSystem) return { error: 'source_system is required' };
  if (!sourceId) return { error: 'source_id is required' };
  return null;
}

function mapRow(r) {
  return {
    id: r.id,
    entityType: r.entity_type,
    sourceSystem: r.source_system,
    sourceId: r.source_id,
    amount: Number(r.amount),
    reason: r.reason,
    memo: r.memo,
    createdBy: r.created_by,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

export async function listAdjustments({ entityType, sourceSystem, sourceId } = {}) {
  const pool = getPool();
  if (!pool) return [];
  const where = [];
  const params = [];
  let i = 1;
  if (entityType) {
    where.push(`entity_type = $${i++}`);
    params.push(String(entityType));
  }
  if (sourceSystem) {
    where.push(`source_system = $${i++}`);
    params.push(String(sourceSystem));
  }
  if (sourceId) {
    where.push(`source_id = $${i++}`);
    params.push(String(sourceId));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM entity_adjustments ${whereSql} ORDER BY created_at DESC, id DESC`,
    params,
  );
  return rows.map(mapRow);
}

/**
 * Group adjustment totals by (entity_type, source_system, source_id).
 * Useful for dashboard drill-down joins.
 */
export async function sumAdjustmentsByEntity(entityType, _keys = []) {
  const pool = getPool();
  if (!pool) return new Map();
  const { rows } = await pool.query(
    `SELECT source_system, source_id, SUM(amount)::numeric AS total, COUNT(*)::int AS count
     FROM entity_adjustments
     WHERE entity_type = $1
     GROUP BY source_system, source_id`,
    [entityType],
  );
  const out = new Map();
  for (const r of rows) {
    out.set(`${r.source_system}::${r.source_id}`, {
      total: Number(r.total) || 0,
      count: r.count,
    });
  }
  return out;
}

export async function createAdjustment({
  entityType,
  sourceSystem,
  sourceId,
  amount,
  reason,
  memo,
  actor,
}) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  const invalid = validateEntity(entityType, sourceSystem, sourceId);
  if (invalid) return invalid;
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return { error: 'amount must be a number' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO entity_adjustments
        (entity_type, source_system, source_id, amount, reason, memo, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [entityType, sourceSystem, sourceId, amt, reason || null, memo || null, actor || 'system'],
    );
    const row = mapRow(rows[0]);
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'adjustment.create',
      entityType,
      entityId: `${sourceSystem}::${sourceId}`,
      after: row,
    });
    await client.query('COMMIT');
    return { adjustment: row };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to create adjustment' };
  } finally {
    client.release();
  }
}

export async function updateAdjustment({ id, amount, reason, memo, actor }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  if (!id) return { error: 'id is required' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      `SELECT * FROM entity_adjustments WHERE id = $1`,
      [id],
    );
    if (existing.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'Adjustment not found' };
    }
    const prev = mapRow(existing[0]);

    const sets = [];
    const params = [id];
    let i = 2;
    if (amount != null) {
      const amt = Number(amount);
      if (!Number.isFinite(amt)) {
        await client.query('ROLLBACK');
        return { error: 'amount must be a number' };
      }
      sets.push(`amount = $${i++}`);
      params.push(amt);
    }
    if (reason !== undefined) {
      sets.push(`reason = $${i++}`);
      params.push(reason || null);
    }
    if (memo !== undefined) {
      sets.push(`memo = $${i++}`);
      params.push(memo || null);
    }
    if (sets.length === 0) {
      await client.query('ROLLBACK');
      return { adjustment: prev };
    }
    sets.push(`updated_at = NOW()`);

    const { rows } = await client.query(
      `UPDATE entity_adjustments SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    const next = mapRow(rows[0]);
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'adjustment.update',
      entityType: prev.entityType,
      entityId: `${prev.sourceSystem}::${prev.sourceId}`,
      before: prev,
      after: next,
    });
    await client.query('COMMIT');
    return { adjustment: next };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to update adjustment' };
  } finally {
    client.release();
  }
}

export async function deleteAdjustment({ id, actor }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  if (!id) return { error: 'id is required' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `DELETE FROM entity_adjustments WHERE id = $1 RETURNING *`,
      [id],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'Adjustment not found' };
    }
    const prev = mapRow(rows[0]);
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'adjustment.delete',
      entityType: prev.entityType,
      entityId: `${prev.sourceSystem}::${prev.sourceId}`,
      before: prev,
    });
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to delete adjustment' };
  } finally {
    client.release();
  }
}
