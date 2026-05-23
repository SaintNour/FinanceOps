import { getPool } from '../db/pool.js';

/**
 * Write a single audit log row.  Accepts an optional pg client so the
 * write participates in an outer transaction (e.g. an import commit).
 * Falls back to the pool for ad-hoc mutations.  Never throws \u2014 audit
 * failures are logged but must not break the caller.
 */
export async function writeAudit(clientOrNull, entry) {
  const runner = clientOrNull || getPool();
  if (!runner) return null;

  const {
    actor,
    action,
    entityType,
    entityId,
    before = null,
    after = null,
    metadata = null,
  } = entry;

  if (!action || !entityType) {
    console.warn('[audit] dropped entry without action/entityType', entry);
    return null;
  }

  try {
    const { rows } = await runner.query(
      `INSERT INTO audit_log (actor, action, entity_type, entity_id, before_json, after_json, metadata_json)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
       RETURNING id, created_at`,
      [
        actor || 'system',
        action,
        entityType,
        entityId != null ? String(entityId) : null,
        before == null ? null : JSON.stringify(before),
        after == null ? null : JSON.stringify(after),
        metadata == null ? null : JSON.stringify(metadata),
      ],
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[audit] failed to write entry', e.message, entry);
    return null;
  }
}

export async function listAuditLog(filters = {}) {
  const pool = getPool();
  if (!pool) return { rows: [], total: 0 };

  const where = [];
  const params = [];
  let i = 1;

  if (filters.entityType) {
    where.push(`entity_type = $${i++}`);
    params.push(String(filters.entityType));
  }
  if (filters.entityId) {
    where.push(`entity_id = $${i++}`);
    params.push(String(filters.entityId));
  }
  if (filters.action) {
    where.push(`action = $${i++}`);
    params.push(String(filters.action));
  }
  if (filters.actor) {
    where.push(`actor = $${i++}`);
    params.push(String(filters.actor));
  }
  if (filters.since) {
    where.push(`created_at >= $${i++}`);
    params.push(new Date(filters.since));
  }
  if (filters.until) {
    where.push(`created_at < $${i++}`);
    params.push(new Date(filters.until));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.max(1, Math.min(Number(filters.limit) || 50, 500));
  const offset = Math.max(0, Number(filters.offset) || 0);

  const [totalRes, rowsRes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM audit_log ${whereSql}`, params),
    pool.query(
      `SELECT id, actor, action, entity_type, entity_id,
              before_json, after_json, metadata_json, created_at
       FROM audit_log ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
  ]);

  return {
    total: totalRes.rows[0]?.n || 0,
    rows: rowsRes.rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      before: r.before_json,
      after: r.after_json,
      metadata: r.metadata_json,
      createdAt: r.created_at instanceof Date
        ? r.created_at.toISOString()
        : r.created_at,
    })),
  };
}
