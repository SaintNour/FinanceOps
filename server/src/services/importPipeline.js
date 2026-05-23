import { parseCsvBuffer, getColumnNames } from '../utils/csv/parseCsv.js';
import { applyColumnMapping, guessColumnMapping } from '../import/columnMapper.js';
import {
  normalizeFeeRow,
  normalizeOrderRow,
  normalizePaymentRow,
  normalizeRefundRow,
} from '../import/normalizeRow.js';
import { normalizeBankTransactionRow } from '../import/bankTransactionNormalizer.js';
import { getPool } from '../db/pool.js';
import * as upsert from '../db/entityUpserts.js';
import { findClosedPeriodsForRange } from './closedPeriodsService.js';
import { writeAudit } from './auditService.js';

const ROW_DATE_FIELD = {
  orders: 'order_date',
  payments: 'payment_date',
  refunds: 'refund_date',
  fees: 'fee_date',
  bank_transactions: 'transaction_date',
};

function extractYearMonth(row, importType) {
  const field = ROW_DATE_FIELD[importType];
  if (!field) return null;
  const v = row[field];
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function formatPeriod(p) {
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

function normalizeRowByType(importType, mapped, sourceSystem, raw) {
  switch (importType) {
    case 'orders':
      return normalizeOrderRow(mapped, sourceSystem, raw);
    case 'payments':
      return normalizePaymentRow(mapped, sourceSystem, raw);
    case 'refunds':
      return normalizeRefundRow(mapped, sourceSystem, raw);
    case 'fees':
      return normalizeFeeRow(mapped, sourceSystem, raw);
    case 'bank_transactions':
      return normalizeBankTransactionRow(mapped, sourceSystem, raw);
    default:
      return { error: 'Unknown import type' };
  }
}

export function buildPreview({ buffer, importType, sourceSystem, columnMapping }) {
  let records;
  try {
    records = parseCsvBuffer(buffer);
  } catch (e) {
    return { error: `CSV parse failed: ${e.message}` };
  }

  if (!records.length) {
    return { error: 'CSV has no data rows' };
  }

  const headers = getColumnNames(records);
  const mapping =
    columnMapping && Object.keys(columnMapping).length > 0
      ? columnMapping
      : guessColumnMapping(headers, importType);

  const warnings = [];
  const seen = new Map();
  const sampleMapped = [];
  const validationErrors = [];

  for (let i = 0; i < records.length; i += 1) {
    const raw = records[i];
    const mapped = applyColumnMapping(raw, mapping);
    const norm = normalizeRowByType(importType, mapped, sourceSystem, raw);
    if (norm.error) {
      if (validationErrors.length < 200) {
        validationErrors.push({ row: i + 1, message: norm.error });
      }
      continue;
    }
    const sid = norm.row.source_id;
    if (seen.has(sid)) {
      warnings.push(`Duplicate source_id "${sid}" in file (rows ${seen.get(sid)} and ${i + 1})`);
    } else {
      seen.set(sid, i + 1);
    }
    if (sampleMapped.length < 8) {
      sampleMapped.push({ rowNumber: i + 1, mapped: norm.row });
    }
  }

  if (records.length > 0 && validationErrors.length === records.length) {
    warnings.push(
      'No rows passed validation — check column mapping, required fields, dates, and numeric amounts.',
    );
  }

  return {
    headers,
    suggestedMapping: guessColumnMapping(headers, importType),
    activeMapping: mapping,
    totalRows: records.length,
    validationErrors: validationErrors.slice(0, 50),
    validationErrorCount: validationErrors.length,
    warnings,
    sampleMapped,
  };
}

async function createImportJob(client, fields) {
  const { rows } = await client.query(
    `INSERT INTO import_jobs (import_type, filename, source_system, status, total_rows)
     VALUES ($1,$2,$3,'processing',$4)
     RETURNING id`,
    [fields.import_type, fields.filename, fields.source_system, fields.total_rows],
  );
  return rows[0].id;
}

async function finalizeImportJob(client, id, payload) {
  await client.query(
    `UPDATE import_jobs SET
      status = $2,
      imported_rows = $3,
      updated_rows = $4,
      skipped_rows = $5,
      failed_rows = $6,
      error_summary = $7,
      completed_at = NOW()
     WHERE id = $1`,
    [
      id,
      payload.status,
      payload.imported_rows,
      payload.updated_rows,
      payload.skipped_rows,
      payload.failed_rows,
      payload.error_summary,
    ],
  );
}

export async function commitImport({
  buffer,
  importType,
  sourceSystem,
  filename,
  columnMapping,
  actor,
}) {
  const pool = getPool();
  if (!pool) return { error: 'Database not configured (DATABASE_URL)' };

  let records;
  try {
    records = parseCsvBuffer(buffer);
  } catch (e) {
    return { error: `CSV parse failed: ${e.message}` };
  }

  if (!records.length) return { error: 'CSV has no data rows' };

  const headers = getColumnNames(records);
  const mapping =
    columnMapping && Object.keys(columnMapping).length > 0
      ? columnMapping
      : guessColumnMapping(headers, importType);

  // First pass: normalize everything in memory so we can detect closed-period
  // conflicts BEFORE we touch any table.  Rows that fail normalization are
  // still collected so counts stay consistent with the current behaviour.
  const prepared = [];
  const periodsSeen = [];
  for (let i = 0; i < records.length; i += 1) {
    const raw = records[i];
    const mapped = applyColumnMapping(raw, mapping);
    const norm = normalizeRowByType(importType, mapped, sourceSystem, raw);
    prepared.push({ rowNumber: i + 1, norm });
    if (!norm.error && norm.row) {
      const ym = extractYearMonth(norm.row, importType);
      if (ym) periodsSeen.push(ym);
    }
  }

  const blockedPeriods = await findClosedPeriodsForRange(periodsSeen);
  if (blockedPeriods.length > 0) {
    const formatted = blockedPeriods.map(formatPeriod);
    await writeAudit(null, {
      actor: actor || 'system',
      action: 'import.blocked',
      entityType: 'import_job',
      entityId: null,
      metadata: {
        import_type: importType,
        filename,
        source_system: sourceSystem,
        total_rows: records.length,
        blocked_periods: formatted,
      },
    });
    return {
      error: `Import blocked: rows fall in closed period(s) ${formatted.join(', ')}. Reopen the period first or remove those rows.`,
      blockedPeriods: formatted,
    };
  }

  const client = await pool.connect();
  let jobId;

  try {
    await client.query('BEGIN');

    jobId = await createImportJob(client, {
      import_type: importType,
      filename,
      source_system: sourceSystem,
      total_rows: records.length,
    });

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const failures = [];

    for (const { rowNumber, norm } of prepared) {
      if (norm.error) {
        skipped += 1;
        failures.push(`Row ${rowNumber}: ${norm.error}`);
        continue;
      }

      let action;
      try {
        if (importType === 'orders') action = await upsert.upsertOrder(client, norm.row);
        else if (importType === 'payments') action = await upsert.upsertPayment(client, norm.row);
        else if (importType === 'refunds') action = await upsert.upsertRefund(client, norm.row);
        else if (importType === 'fees') action = await upsert.upsertFee(client, norm.row);
        else if (importType === 'bank_transactions') {
          action = await upsert.upsertBankTransaction(client, norm.row);
        } else throw new Error('Unknown import type');
      } catch (e) {
        skipped += 1;
        failures.push(`Row ${rowNumber}: ${e.message}`);
        continue;
      }

      if (action === 'inserted') inserted += 1;
      else updated += 1;
    }

    const summaryText =
      failures.length > 0 ? failures.slice(0, 40).join('\n') : null;

    const finalStatus = failures.length === records.length ? 'failed' : 'completed';

    await finalizeImportJob(client, jobId, {
      status: finalStatus,
      imported_rows: inserted + updated,
      updated_rows: updated,
      skipped_rows: skipped,
      failed_rows: failures.length,
      error_summary: summaryText,
    });

    await writeAudit(client, {
      actor: actor || 'system',
      action: 'import.commit',
      entityType: 'import_job',
      entityId: String(jobId),
      metadata: {
        import_type: importType,
        filename,
        source_system: sourceSystem,
        status: finalStatus,
        total_rows: records.length,
        inserted_rows: inserted,
        updated_rows: updated,
        skipped_rows: skipped,
        failed_rows: failures.length,
      },
    });

    await client.query('COMMIT');

    return {
      ok: true,
      jobId,
      totalRows: records.length,
      importedRows: inserted + updated,
      insertedRows: inserted,
      updatedRows: updated,
      skippedRows: skipped,
      failedRows: failures.length,
      failures: failures.slice(0, 50),
    };
  } catch (e) {
    await client.query('ROLLBACK');
    if (jobId) {
      try {
        await client.query(
          `UPDATE import_jobs SET status = 'failed', error_summary = $2, completed_at = NOW() WHERE id = $1`,
          [jobId, e.message],
        );
      } catch (_) {
        /* ignore */
      }
    }
    await writeAudit(null, {
      actor: actor || 'system',
      action: 'import.error',
      entityType: 'import_job',
      entityId: jobId ? String(jobId) : null,
      metadata: {
        import_type: importType,
        filename,
        source_system: sourceSystem,
        error: e.message,
      },
    });
    return { error: e.message || 'Import failed' };
  } finally {
    client.release();
  }
}

export async function listImportJobs(limit = 50) {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function getImportJob(id) {
  const pool = getPool();
  if (!pool) return null;
  const { rows } = await pool.query(`SELECT * FROM import_jobs WHERE id = $1`, [id]);
  return rows[0] || null;
}
