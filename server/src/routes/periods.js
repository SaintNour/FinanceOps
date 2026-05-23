import { Router } from 'express';
import {
  listClosedPeriods,
  closePeriod,
  reopenPeriod,
} from '../services/closedPeriodsService.js';
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
      error: 'Period close requires DATABASE_URL to be set.',
    });
    return true;
  }
  return false;
}

router.get('/', async (_req, res, next) => {
  try {
    if (requireDb(res)) return;
    const rows = await listClosedPeriods();
    res.json({ ok: true, data: { periods: rows } });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await closePeriod({
      year: req.body?.year,
      month: req.body?.month,
      reason: req.body?.reason,
      actor: getActor(req),
    });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, data: { period: result.period } });
  } catch (e) {
    next(e);
  }
});

router.delete('/:year/:month', async (req, res, next) => {
  try {
    if (requireDb(res)) return;
    const result = await reopenPeriod({
      year: req.params.year,
      month: req.params.month,
      reason: req.body?.reason,
      actor: getActor(req),
    });
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
