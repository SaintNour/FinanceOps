import { Router } from 'express';
import { listAuditLog } from '../services/auditService.js';
import { getPool } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    if (!getPool()) {
      return res.status(503).json({
        ok: false,
        error: 'Audit log requires DATABASE_URL to be set.',
      });
    }
    const result = await listAuditLog({
      entityType: req.query.entity_type,
      entityId: req.query.entity_id,
      action: req.query.action,
      actor: req.query.actor,
      since: req.query.since,
      until: req.query.until,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ ok: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
