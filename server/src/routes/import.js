import { Router } from 'express';
import multer from 'multer';
import { putPending, getPending, takePending } from '../services/pendingUploadStore.js';
import { buildPreview, commitImport, listImportJobs, getImportJob } from '../services/importPipeline.js';
import { getPool } from '../db/pool.js';
import { buildSampleCsv, getSampleCsvFilename } from '../import/importCsvGenerator.js';
import {
  getAllTemplateDefinitionsForApi,
  SHARED_IMPORT_GUIDE,
  TEMPLATE_SLUG_TO_TYPE,
} from '../import/importTemplateDefinitions.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router();

router.get('/template-definitions', (req, res) => {
  try {
    const templates = getAllTemplateDefinitionsForApi();
    return res.json({ ok: true, data: { guide: SHARED_IMPORT_GUIDE, templates } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Failed to load templates' });
  }
});

router.get('/templates/:slug', (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const internal = TEMPLATE_SLUG_TO_TYPE[slug];
    if (!internal) {
      return res.status(404).json({
        ok: false,
        error: 'Unknown template. Use orders, payments, refunds, fees, or bank-transactions.',
      });
    }
    const csv = buildSampleCsv(internal);
    const filename = getSampleCsvFilename(internal) || 'sample.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(csv, 'utf8'));
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Template failed' });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!getPool()) {
      return res.status(400).json({
        ok: false,
        error: 'CSV import requires DATABASE_URL to be configured',
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: 'Missing file field (multipart file)' });
    }
    const import_type = String(req.body.import_type || '').trim();
    const source_system = String(req.body.source_system || '').trim().toLowerCase();
    if (!['orders', 'payments', 'refunds', 'fees', 'bank_transactions'].includes(import_type)) {
      return res.status(400).json({
        ok: false,
        error: 'import_type must be orders|payments|refunds|fees|bank_transactions',
      });
    }
    if (!source_system) {
      return res.status(400).json({ ok: false, error: 'source_system is required' });
    }
    const uploadId = putPending({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      importType: import_type,
      sourceSystem: source_system,
    });
    return res.json({
      ok: true,
      data: { uploadId, filename: req.file.originalname, import_type, source_system },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Upload failed' });
  }
});

router.post('/preview', (req, res) => {
  try {
    const { uploadId, columnMapping } = req.body || {};
    if (!uploadId) return res.status(400).json({ ok: false, error: 'uploadId is required' });
    const pending = getPending(uploadId);
    if (!pending) return res.status(404).json({ ok: false, error: 'Upload expired or not found' });

    const preview = buildPreview({
      buffer: pending.buffer,
      importType: pending.importType,
      sourceSystem: pending.sourceSystem,
      columnMapping,
    });
    if (preview.error) return res.status(400).json({ ok: false, error: preview.error });
    return res.json({ ok: true, data: preview });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Preview failed' });
  }
});

router.post('/commit', async (req, res, next) => {
  try {
    const { uploadId, columnMapping } = req.body || {};
    if (!uploadId) return res.status(400).json({ ok: false, error: 'uploadId is required' });
    const pending = getPending(uploadId);
    if (!pending) return res.status(404).json({ ok: false, error: 'Upload expired or not found' });

    const actor = String(req.header('x-actor') || '').trim() || 'system';

    const result = await commitImport({
      buffer: pending.buffer,
      importType: pending.importType,
      sourceSystem: pending.sourceSystem,
      filename: pending.filename,
      columnMapping,
      actor,
    });

    if (result.error) {
      return res.status(400).json({
        ok: false,
        error: result.error,
        blockedPeriods: result.blockedPeriods,
      });
    }

    takePending(uploadId);
    return res.json({ ok: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await listImportJobs(Number(req.query.limit) || 50);
    return res.json({ ok: true, data: { jobs } });
  } catch (e) {
    next(e);
  }
});

router.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await getImportJob(req.params.id);
    if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
    return res.json({ ok: true, data: { job } });
  } catch (e) {
    next(e);
  }
});

export default router;
