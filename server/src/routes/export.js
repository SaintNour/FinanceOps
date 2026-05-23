import { Router } from 'express';
import {
  buildReconciliationBankTransactionsExportCsv,
  buildReconciliationMatchesExportCsv,
  buildReconciliationPayoutsExportCsv,
} from '../services/export/reconciliationCsvExportService.js';
import { buildFinanceSummaryExportCsv } from '../services/export/financeSummaryCsvExportService.js';

const router = Router();

function sendCsv(res, { csv, filename }) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(csv, 'utf8'));
}

router.get('/reconciliation/payouts', async (req, res, next) => {
  try {
    const payload = await buildReconciliationPayoutsExportCsv(req.query);
    sendCsv(res, payload);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code === 400) return res.status(400).json({ ok: false, error: e.message || 'Bad request' });
    next(e);
  }
});

router.get('/reconciliation/bank-transactions', async (req, res, next) => {
  try {
    const payload = await buildReconciliationBankTransactionsExportCsv(req.query);
    sendCsv(res, payload);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code === 400) return res.status(400).json({ ok: false, error: e.message || 'Bad request' });
    next(e);
  }
});

router.get('/reconciliation/matches', async (req, res, next) => {
  try {
    const payload = await buildReconciliationMatchesExportCsv(req.query);
    sendCsv(res, payload);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code === 400) return res.status(400).json({ ok: false, error: e.message || 'Bad request' });
    next(e);
  }
});

router.get('/finance/summary', async (req, res, next) => {
  try {
    const payload = await buildFinanceSummaryExportCsv(req.query);
    sendCsv(res, payload);
  } catch (e) {
    const code = e.statusCode || 500;
    if (code === 400) return res.status(400).json({ ok: false, error: e.message || 'Bad request' });
    next(e);
  }
});

export default router;
