import express from 'express';
import { createCorsMiddleware } from './config/cors.js';

import financeRoutes from './routes/finance.js';
import dashboardRoutes from './routes/dashboard.js';
import importRoutes from './routes/import.js';
import reconciliationRoutes from './routes/reconciliation.js';
import exportRoutes from './routes/export.js';
import adjustmentsRoutes from './routes/adjustments.js';
import notesRoutes from './routes/notes.js';
import periodsRoutes from './routes/periods.js';
import auditRoutes from './routes/audit.js';

export function createApp() {
  const app = express();

  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'erps-finance-server' });
  });

  app.use('/api/finance', financeRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/adjustments', adjustmentsRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/periods', periodsRoutes);
  app.use('/api/audit', auditRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  });

  return app;
}
