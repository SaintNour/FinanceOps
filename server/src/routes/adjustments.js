import { Router } from 'express';
import {
  listAdjustments,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment,
  sumAdjustmentsByEntity,
} from '../services/adjustmentsService.js';
import { countNotesByEntity } from '../services/notesService.js';
import { getPool } from '../db/pool.js';

const router = Router();

function getActor(req) {
  const v = String(req.header('x-actor') || '').trim();
  return v || 'system';
}

function requireDb(res) {
  if (!getPool()) {
    res.status(503).json({
      ok: false,
      error: 'Adjustments require DATABASE_URL to be set.',
    });
    return true;
  }
  return false;
}

router.get('/summary', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const entityType = String(req.query.entity_type || '').trim();
    if (!entityType) {
      return res.status(400).json({ ok: false, error: 'entity_type is required' });
    }
    const [adjMap, noteMap] = await Promise.all([
      sumAdjustmentsByEntity(entityType),
      countNotesByEntity(entityType),
    ]);
    const merged = new Map();
    for (const [key, value] of adjMap.entries()) {
      const [sourceSystem, sourceId] = key.split('::');
      merged.set(key, {
        source_system: sourceSystem,
        source_id: sourceId,
        total: value.total,
        adjustment_count: value.count,
        note_count: noteMap.get(key) || 0,
      });
    }
    for (const [key, n] of noteMap.entries()) {
      if (!merged.has(key)) {
        const [sourceSystem, sourceId] = key.split('::');
        merged.set(key, {
          source_system: sourceSystem,
          source_id: sourceId,
          total: 0,
          adjustment_count: 0,
          note_count: n,
        });
      }
    }
    res.json({ ok: true, data: { summary: Array.from(merged.values()) } });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const rows = await listAdjustments({
      entityType: req.query.entity_type,
      sourceSystem: req.query.source_system,
      sourceId: req.query.source_id,
    });
    res.json({ ok: true, data: { adjustments: rows } });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await createAdjustment({
      entityType: req.body?.entity_type,
      sourceSystem: req.body?.source_system,
      sourceId: req.body?.source_id,
      amount: req.body?.amount,
      reason: req.body?.reason,
      memo: req.body?.memo,
      actor: getActor(req),
    });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: { adjustment: result.adjustment } });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await updateAdjustment({
      id: req.params.id,
      amount: req.body?.amount,
      reason: req.body?.reason,
      memo: req.body?.memo,
      actor: getActor(req),
    });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: { adjustment: result.adjustment } });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await deleteAdjustment({ id: req.params.id, actor: getActor(req) });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
