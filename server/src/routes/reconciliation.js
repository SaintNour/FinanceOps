import { Router } from 'express';
import { runReconciliationEngine, manualMatch, manualUnmatch, markReview } from '../services/reconciliationService.js';
import {
  getReconciliationSummary,
  listPayoutsForReport,
  listBankTransactionsForReport,
  listMatchesForReport,
  listReconciliationRuns,
  getPayoutDetail,
} from '../services/reconciliationReportingService.js';

const router = Router();

router.get('/summary', async (req, res, next) => {
  try {
    const data = await getReconciliationSummary();
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/payouts', async (req, res, next) => {
  try {
    const rows = await listPayoutsForReport(req.query);
    return res.json({ ok: true, data: { payouts: rows } });
  } catch (e) {
    next(e);
  }
});

router.get('/bank-transactions', async (req, res, next) => {
  try {
    const rows = await listBankTransactionsForReport(req.query);
    return res.json({ ok: true, data: { bankTransactions: rows } });
  } catch (e) {
    next(e);
  }
});

router.get('/matches', async (req, res, next) => {
  try {
    const rows = await listMatchesForReport(req.query);
    return res.json({ ok: true, data: { matches: rows } });
  } catch (e) {
    next(e);
  }
});

router.post('/run', async (req, res, next) => {
  try {
    const data = await runReconciliationEngine(req.body || {});
    return res.json({ ok: true, data });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ ok: false, error: e.message || 'Reconciliation failed' });
  }
});

router.get('/runs', async (req, res, next) => {
  try {
    const runs = await listReconciliationRuns(Number(req.query.limit) || 50);
    return res.json({ ok: true, data: { runs } });
  } catch (e) {
    next(e);
  }
});

router.get('/payout/:id', async (req, res, next) => {
  try {
    const detail = await getPayoutDetail(req.params.id);
    if (!detail) return res.status(404).json({ ok: false, error: 'Payout not found' });
    return res.json({ ok: true, data: detail });
  } catch (e) {
    next(e);
  }
});

router.post('/match', async (req, res, next) => {
  try {
    const { payoutRecordId, bankTransactionRecordId, notes } = req.body || {};
    if (!payoutRecordId || !bankTransactionRecordId) {
      return res.status(400).json({ ok: false, error: 'payoutRecordId and bankTransactionRecordId required' });
    }
    const data = await manualMatch({
      payoutRecordId: Number(payoutRecordId),
      bankTransactionRecordId: Number(bankTransactionRecordId),
      notes,
    });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.post('/unmatch', async (req, res, next) => {
  try {
    const { matchId } = req.body || {};
    if (!matchId) return res.status(400).json({ ok: false, error: 'matchId required' });
    const data = await manualUnmatch({ matchId: Number(matchId) });
    return res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

router.post('/mark-review', async (req, res, next) => {
  try {
    const { matchId, notes } = req.body || {};
    if (!matchId) return res.status(400).json({ ok: false, error: 'matchId required' });
    const data = await markReview({ matchId: Number(matchId), notes });
    return res.json({ ok: true, data });
  } catch (e) {
    const code = e.statusCode || 500;
    if (code !== 500) {
      return res.status(code).json({ ok: false, error: e.message || 'Request failed' });
    }
    next(e);
  }
});

export default router;
