import { Router } from 'express';
import { listNotes, createNote, deleteNote } from '../services/notesService.js';
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
      error: 'Notes require DATABASE_URL to be set.',
    });
    return true;
  }
  return false;
}

router.get('/', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const rows = await listNotes({
      entityType: req.query.entity_type,
      sourceSystem: req.query.source_system,
      sourceId: req.query.source_id,
    });
    res.json({ ok: true, data: { notes: rows } });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await createNote({
      entityType: req.body?.entity_type,
      sourceSystem: req.body?.source_system,
      sourceId: req.body?.source_id,
      body: req.body?.body,
      actor: getActor(req),
    });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: { note: result.note } });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await deleteNote({ id: req.params.id, actor: getActor(req) });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
