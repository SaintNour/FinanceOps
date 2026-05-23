import { getPool } from '../db/pool.js';

export async function getReconciliationSummary() {
  const pool = getPool();
  if (!pool) {
    return {
      database: false,
      totalPayouts: 0,
      matchedPayouts: 0,
      partialPayouts: 0,
      unmatchedPayouts: 0,
      unmatchedBankTransactions: 0,
      needsReview: 0,
      matchedAmount: 0,
      unmatchedPayoutAmount: 0,
      unmatchedBankAmount: 0,
      lastRunAt: null,
    };
  }

  const { rows: pRows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM reconciliation_matches m
        WHERE m.payout_record_id = payouts.id AND m.active AND m.match_status = 'matched'
      ))::int AS matched,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM reconciliation_matches m
        WHERE m.payout_record_id = payouts.id AND m.active AND m.match_status = 'partial'
      ))::int AS partial,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM reconciliation_matches m
        WHERE m.payout_record_id = payouts.id AND m.active
      ))::int AS unmatched,
      COALESCE(SUM(amount) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM reconciliation_matches m
        WHERE m.payout_record_id = payouts.id AND m.active
      )), 0)::numeric AS unmatched_amt
    FROM payouts
  `);

  const { rows: bRows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE reconciliation_status = 'unmatched')::int AS unmatched_bank,
      COALESCE(SUM(ABS(amount)) FILTER (WHERE reconciliation_status = 'unmatched'), 0)::numeric AS unmatched_bank_amt
    FROM bank_transactions
  `);

  const { rows: rRows } = await pool.query(`
    SELECT COUNT(*)::int AS needs_review
    FROM reconciliation_matches
    WHERE active AND match_status = 'needs_review'
  `);

  const { rows: mRows } = await pool.query(`
    SELECT COALESCE(SUM(p.amount), 0)::numeric AS matched_amt
    FROM reconciliation_matches m
    JOIN payouts p ON p.id = m.payout_record_id
    WHERE m.active AND m.match_status IN ('matched','partial')
  `);

  const { rows: runRows } = await pool.query(`
    SELECT completed_at FROM reconciliation_runs
    WHERE status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1
  `);

  const p = pRows[0];
  const b = bRows[0];
  const r = rRows[0];
  const m = mRows[0];

  return {
    database: true,
    totalPayouts: p.total,
    matchedPayouts: p.matched,
    partialPayouts: p.partial,
    unmatchedPayouts: p.unmatched,
    unmatchedBankTransactions: b.unmatched_bank,
    needsReview: r.needs_review,
    matchedAmount: Number(m.matched_amt || 0),
    unmatchedPayoutAmount: Number(p.unmatched_amt || 0),
    unmatchedBankAmount: Number(b.unmatched_bank_amt || 0),
    lastRunAt: runRows[0]?.completed_at
      ? new Date(runRows[0].completed_at).toISOString()
      : null,
  };
}

export async function listPayoutsForReport(query = {}, options = {}) {
  const pool = getPool();
  if (!pool) return [];
  const limit = Math.min(Math.max(Number(options.limit) || 500, 1), 50000);
  const params = [];
  let sql = `
    SELECT p.*,
      m.id AS match_id,
      m.match_status,
      m.match_method,
      m.confidence_score,
      m.amount_difference,
      m.date_difference_days,
      m.notes AS match_notes,
      m.bank_transaction_record_id,
      m.active AS match_active,
      b.id AS matched_bank_transaction_id,
      b.description AS matched_bank_description,
      b.reference_number AS matched_bank_reference
    FROM payouts p
    LEFT JOIN LATERAL (
      SELECT * FROM reconciliation_matches mm
      WHERE mm.payout_record_id = p.id AND mm.active
      ORDER BY mm.created_at DESC
      LIMIT 1
    ) m ON TRUE
    LEFT JOIN bank_transactions b ON b.id = m.bank_transaction_record_id
  `;
  const where = [];
  if (query.status === 'unmatched') {
    where.push(
      `NOT EXISTS (SELECT 1 FROM reconciliation_matches mm WHERE mm.payout_record_id = p.id AND mm.active)`,
    );
  } else if (query.status) {
    params.push(query.status);
    where.push(`m.match_status = $${params.length}`);
  }
  if (query.source_system) {
    params.push(query.source_system);
    where.push(`p.source_system = $${params.length}`);
  }
  if (query.platform) {
    params.push(String(query.platform).trim().toLowerCase());
    where.push(`p.platform = $${params.length}`);
  }
  if (query.currency) {
    params.push(query.currency);
    where.push(`p.currency = $${params.length}`);
  }
  if (query.from) {
    params.push(query.from);
    where.push(`p.payout_date::date >= $${params.length}::date`);
  }
  if (query.to) {
    params.push(query.to);
    where.push(`p.payout_date::date <= $${params.length}::date`);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  params.push(limit);
  sql += ` ORDER BY p.payout_date DESC LIMIT $${params.length}`;
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function listBankTransactionsForReport(query = {}, options = {}) {
  const pool = getPool();
  if (!pool) return [];
  const limit = Math.min(Math.max(Number(options.limit) || 500, 1), 50000);
  const params = [];
  const where = [];
  if (query.status) {
    params.push(query.status);
    where.push(`b.reconciliation_status = $${params.length}`);
  }
  if (query.source_system) {
    params.push(query.source_system);
    where.push(`b.source_system = $${params.length}`);
  }
  if (query.bank_account) {
    const q = String(query.bank_account).trim();
    params.push(`%${q}%`);
    const i1 = params.length;
    params.push(q.replace(/\D/g, '').slice(-4));
    where.push(`(b.bank_account_name ILIKE $${i1} OR b.bank_account_last4 = $${i1 + 1})`);
  }
  if (query.from) {
    params.push(query.from);
    where.push(`COALESCE(b.posted_date, b.transaction_date) >= $${params.length}::date`);
  }
  if (query.to) {
    params.push(query.to);
    where.push(`COALESCE(b.posted_date, b.transaction_date) <= $${params.length}::date`);
  }
  let sql = `SELECT b.*,
    m.id AS match_id,
    m.match_status,
    m.match_method,
    m.confidence_score,
    m.payout_record_id,
    m.active AS match_active
    FROM bank_transactions b
    LEFT JOIN LATERAL (
      SELECT * FROM reconciliation_matches mm
      WHERE mm.bank_transaction_record_id = b.id AND mm.active
      ORDER BY mm.created_at DESC
      LIMIT 1
    ) m ON TRUE`;
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  params.push(limit);
  sql += ` ORDER BY COALESCE(b.posted_date, b.transaction_date) DESC LIMIT $${params.length}`;
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function listMatchesForReport(query = {}, options = {}) {
  const pool = getPool();
  if (!pool) return [];
  const limit = Math.min(Math.max(Number(options.limit) || 500, 1), 50000);
  const params = [];
  const where = ['m.active = TRUE'];
  if (query.match_status) {
    params.push(query.match_status);
    where.push(`m.match_status = $${params.length}`);
  }
  if (query.match_method) {
    params.push(query.match_method);
    where.push(`m.match_method = $${params.length}`);
  }
  if (query.source_system) {
    params.push(query.source_system);
    where.push(`p.source_system = $${params.length}`);
  }
  if (query.platform) {
    params.push(String(query.platform).trim().toLowerCase());
    where.push(`p.platform = $${params.length}`);
  }
  if (query.currency) {
    params.push(query.currency);
    where.push(`p.currency = $${params.length}`);
  }
  if (query.from) {
    params.push(query.from);
    where.push(`m.created_at::date >= $${params.length}::date`);
  }
  if (query.to) {
    params.push(query.to);
    where.push(`m.created_at::date <= $${params.length}::date`);
  }
  params.push(limit);
  const sql = `
    SELECT m.*, p.payout_id AS payout_id, p.amount AS payout_amount,
           b.amount AS bank_amount, b.description AS bank_description
    FROM reconciliation_matches m
    LEFT JOIN payouts p ON p.id = m.payout_record_id
    LEFT JOIN bank_transactions b ON b.id = m.bank_transaction_record_id
    WHERE ${where.join(' AND ')}
    ORDER BY m.created_at DESC
    LIMIT $${params.length}
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
}

export async function listReconciliationRuns(limit = 50) {
  const pool = getPool();
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT * FROM reconciliation_runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function getPayoutDetail(id) {
  const pool = getPool();
  if (!pool) return null;
  const { rows: pr } = await pool.query(`SELECT * FROM payouts WHERE id = $1`, [id]);
  const payout = pr[0];
  if (!payout) return null;

  const { rows: items } = await pool.query(
    `SELECT * FROM payout_items WHERE payout_record_id = $1 ORDER BY event_date ASC NULLS LAST`,
    [id],
  );

  const { rows: matchRows } = await pool.query(
    `SELECT m.id, m.match_status, m.match_method, m.confidence_score, m.amount_difference,
            m.date_difference_days, m.notes, m.created_at,
            b.id AS bank_id, b.amount AS bank_amount, b.description AS bank_description,
            b.transaction_date AS bank_transaction_date, b.posted_date AS bank_posted_date
     FROM reconciliation_matches m
     LEFT JOIN bank_transactions b ON b.id = m.bank_transaction_record_id
     WHERE m.payout_record_id = $1 AND m.active
     ORDER BY m.created_at DESC
     LIMIT 5`,
    [id],
  );

  const payIds = items.map((i) => i.linked_payment_source_id).filter(Boolean);
  const refIds = items.map((i) => i.linked_refund_source_id).filter(Boolean);

  let payments = [];
  let refunds = [];
  if (payIds.length) {
    const { rows } = await pool.query(`SELECT * FROM payments WHERE payment_id = ANY($1::text[])`, [
      payIds,
    ]);
    payments = rows;
  }
  if (refIds.length) {
    const { rows } = await pool.query(`SELECT * FROM refunds WHERE refund_id = ANY($1::text[])`, [
      refIds,
    ]);
    refunds = rows;
  }

  return { payout, items, matches: matchRows, linkedPayments: payments, linkedRefunds: refunds };
}
