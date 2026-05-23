import { Router } from 'express';
import {
  getFinanceSummary,
  getFeesByPlatform,
  getFeesByType,
  getRefundReasons,
  getRevenueTrend,
  getRefundTrend,
} from '../services/financeSummaryService.js';
import { listOrders } from '../services/orderService.js';
import { listRefunds } from '../services/refundService.js';
import { getDashboardMeta } from '../services/financeDataProvider.js';
import { getDrillDown } from '../services/drillDownService.js';

const router = Router();

router.get('/meta', async (req, res, next) => {
  try {
    const data = await getDashboardMeta();
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const data = await getFinanceSummary(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/revenue-trend', async (req, res, next) => {
  try {
    const data = await getRevenueTrend(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/refund-trend', async (req, res, next) => {
  try {
    const data = await getRefundTrend(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/fees-by-platform', async (req, res, next) => {
  try {
    const data = await getFeesByPlatform(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/fees-by-type', async (req, res, next) => {
  try {
    const data = await getFeesByType(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/refund-reasons', async (req, res, next) => {
  try {
    const data = await getRefundReasons(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const data = await listOrders(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data: { orders: data.orders } });
  } catch (e) {
    next(e);
  }
});

router.get('/refunds', async (req, res, next) => {
  try {
    const data = await listRefunds(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data: { refunds: data.refunds } });
  } catch (e) {
    next(e);
  }
});

router.get('/drill-down', async (req, res, next) => {
  try {
    const data = await getDrillDown(req.query);
    if (data.error) return res.status(400).json({ ok: false, error: data.error });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

export default router;
