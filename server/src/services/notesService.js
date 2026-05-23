import { getPool } from '../db/pool.js';
import { writeAudit } from './auditService.js';

const ALLOWED_ENTITY_TYPES = new Set(['order', 'payment', 'refund', 'fee']);

function mapRow(r) {
  return {
    id: r.id,
    entityType: r.entity_type,
    sourceSystem: r.source_system,
    sourceId: r.source_id,
    body: r.body,
    author: r.author,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

export async function listNotes({ entityType, sourceSystem, sourceId } = {}) {
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
    `SELECT * FROM entity_notes ${whereSql} ORDER BY created_at DESC, id DESC`,
    params,
  );
  return rows.map(mapRow);
}

export async function countNotesByEntity(entityType, _keys = []) {
  const pool = getPool();
  if (!pool) return new Map();
  const { rows } = await pool.query(
    `SELECT source_system, source_id, COUNT(*)::int AS n
     FROM entity_notes
     WHERE entity_type = $1
     GROUP BY source_system, source_id`,
    [entityType],
  );
  const out = new Map();
  for (const r of rows) {
    out.set(`${r.source_system}::${r.source_id}`, r.n);
  }
  return out;
}

export async function createNote({ entityType, sourceSystem, sourceId, body, actor }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  if (!ALLOWED_ENTITY_TYPES.has(String(entityType))) {
    return { error: "entity_type must be one of 'order', 'payment', 'refund', 'fee'" };
  }
  if (!sourceSystem) return { error: 'source_system is required' };
  if (!sourceId) return { error: 'source_id is required' };
  const text = String(body || '').trim();
  if (!text) return { error: 'body is required' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO entity_notes (entity_type, source_system, source_id, body, author)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [entityType, sourceSystem, sourceId, text, actor || 'system'],
    );
    const row = mapRow(rows[0]);
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'note.create',
      entityType,
      entityId: `${sourceSystem}::${sourceId}`,
      after: row,
    });
    await client.query('COMMIT');
    return { note: row };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to create note' };
  } finally {
    client.release();
  }
}

export async function deleteNote({ id, actor }) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured' };
  if (!id) return { error: 'id is required' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `DELETE FROM entity_notes WHERE id = $1 RETURNING *`,
      [id],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'Note not found' };
    }
    const prev = mapRow(rows[0]);
    await writeAudit(client, {
      actor: actor || 'system',
      action: 'note.delete',
      entityType: prev.entityType,
      entityId: `${prev.sourceSystem}::${prev.sourceId}`,
      before: prev,
    });
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    return { error: e.message || 'Failed to delete note' };
  } finally {
    client.release();
  }
}
