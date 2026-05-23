import { Router } from 'express';

const router = Router();

/**
 * Lightweight meta endpoint for ops / future Phase 2 dashboard shell.
 * Finance KPIs live under /api/finance/*.
 */
router.get('/meta', (_req, res) => {
  res.json({
    ok: true,
    data: {
      name: 'ERPS Finance Dashboard',
      phase: 1,
      financeApiBase: '/api/finance',
    },
  });
});

export default router;
