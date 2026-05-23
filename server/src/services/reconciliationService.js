import { getPool } from '../db/pool.js';
import { resolveCandidates } from './reconciliationMatchers.js';

async function resetAfterAutoClear(client) {
  await client.query(
    `UPDATE payouts p
     SET linked_bank_transaction_id = NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM reconciliation_matches m
       WHERE m.payout_record_id = p.id AND m.match_method = 'manual' AND m.active
     )`,
  );
  await client.query(
    `UPDATE bank_transactions b
     SET reconciliation_status = 'unmatched'
     WHERE NOT EXISTS (
       SELECT 1 FROM reconciliation_matches m
       WHERE m.bank_transaction_record_id = b.id AND m.match_method = 'manual' AND m.active
     )`,
  );
}

export async function runReconciliationEngine(options = {}) {
  const pool = getPool();
  if (!pool) {
    const err = new Error('DATABASE_URL is not configured');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  const runIdRows = await client.query(
    `INSERT INTO reconciliation_runs (run_type, status, metadata_json)
     VALUES ('auto', 'running', $1::jsonb) RETURNING id`,
    [JSON.stringify(options || {})],
  );
  const runId = runIdRows.rows[0].id;

  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM reconciliation_matches WHERE match_method IN ('auto_exact','auto_scored')`,
    );
    await resetAfterAutoClear(client);

    let payoutFilter = `WHERE 1=1`;
    const params = [];
    if (options.currency) {
      params.push(options.currency);
      payoutFilter += ` AND p.currency = $${params.length}`;
    }
    if (options.source_system) {
      params.push(options.source_system);
      payoutFilter += ` AND p.source_system = $${params.length}`;
    }
    if (options.from) {
      params.push(options.from);
      payoutFilter += ` AND (p.arrival_date::date >= $${params.length}::date OR (p.arrival_date IS NULL AND p.payout_date::date >= $${params.length}::date))`;
    }
    if (options.to) {
      params.push(options.to);
      payoutFilter += ` AND (p.arrival_date::date <= $${params.length}::date OR (p.arrival_date IS NULL AND p.payout_date::date <= $${params.length}::date))`;
    }

    const { rows: payouts } = await client.query(
      `SELECT p.* FROM payouts p
       ${payoutFilter}
       AND NOT EXISTS (
         SELECT 1 FROM reconciliation_matches m
         WHERE m.payout_record_id = p.id AND m.match_method = 'manual' AND m.active
       )
       ORDER BY p.payout_date ASC`,
      params,
    );

    const { rows: banks } = await client.query(
      `SELECT * FROM bank_transactions
       WHERE reconciliation_status = 'unmatched'
       ORDER BY COALESCE(posted_date, transaction_date) ASC`,
    );

    let matched = 0;
    let partial = 0;
    let unmatched = 0;
    let needsReview = 0;
    const usedBankIds = new Set();

    for (const p of payouts) {
      const candidates = banks.filter((b) => !usedBankIds.has(b.id));
      const res = resolveCandidates(p, candidates);

      if (res.decision === 'unmatched' || !res.candidate) {
        if (res.decision === 'review' && res.ambiguous) {
          needsReview += 1;
        } else {
          unmatched += 1;
        }
        continue;
      }

      const { bank, score } = res.candidate;
      if (res.decision === 'review' && score.matchStatus === 'needs_review') {
        await client.query(
          `INSERT INTO reconciliation_matches (
            match_type, payout_record_id, bank_transaction_record_id,
            match_status, match_method, confidence_score, amount_difference,
            date_difference_days, active
          ) VALUES ('payout_to_bank', $1, $2, 'needs_review', $3, $4, $5, $6, TRUE)`,
          [
            p.id,
            bank.id,
            score.matchMethod,
            score.confidence,
            score.amountDifference,
            score.dateDifferenceDays,
          ],
        );
        needsReview += 1;
        continue;
      }

      await client.query(
        `INSERT INTO reconciliation_matches (
          match_type, payout_record_id, bank_transaction_record_id,
          match_status, match_method, confidence_score, amount_difference,
          date_difference_days, active
        ) VALUES ('payout_to_bank', $1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [
          p.id,
          bank.id,
          score.matchStatus,
          score.matchMethod,
          score.confidence,
          score.amountDifference,
          score.dateDifferenceDays,
        ],
      );

      await client.query(`UPDATE payouts SET linked_bank_transaction_id = $2 WHERE id = $1`, [
        p.id,
        bank.id,
      ]);

      const bankStatus = score.matchStatus === 'partial' ? 'partial' : 'matched';
      await client.query(
        `UPDATE bank_transactions SET reconciliation_status = $2 WHERE id = $1`,
        [bank.id, bankStatus],
      );

      usedBankIds.add(bank.id);
      if (score.matchStatus === 'partial') partial += 1;
      else matched += 1;
    }

    const totalCandidates = payouts.length;

    await client.query(
      `UPDATE reconciliation_runs SET
        status = 'completed',
        completed_at = NOW(),
        total_candidates = $2,
        total_matched = $3,
        total_partial = $4,
        total_unmatched = $5,
        total_needs_review = $6
       WHERE id = $1`,
      [runId, totalCandidates, matched, partial, unmatched, needsReview],
    );

    await client.query('COMMIT');

    return {
      runId,
      totalCandidates,
      matched,
      partial,
      unmatched,
      needsReview,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    await pool.query(
      `UPDATE reconciliation_runs SET status = 'failed', completed_at = NOW(), error_summary = $2 WHERE id = $1`,
      [runId, e.message],
    );
    throw e;
  } finally {
    client.release();
  }
}

export async function manualMatch({ payoutRecordId, bankTransactionRecordId, notes }) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE reconciliation_matches SET active = FALSE
       WHERE active AND (payout_record_id = $1 OR bank_transaction_record_id = $2)`,
      [payoutRecordId, bankTransactionRecordId],
    );

    await client.query(
      `INSERT INTO reconciliation_matches (
        match_type, payout_record_id, bank_transaction_record_id,
        match_status, match_method, confidence_score, amount_difference,
        date_difference_days, notes, active
      ) VALUES ('payout_to_bank', $1, $2, 'matched', 'manual', 100, 0, 0, $3, TRUE)`,
      [payoutRecordId, bankTransactionRecordId, notes || null],
    );

    await client.query(`UPDATE payouts SET linked_bank_transaction_id = $2 WHERE id = $1`, [
      payoutRecordId,
      bankTransactionRecordId,
    ]);

    await client.query(
      `UPDATE bank_transactions SET reconciliation_status = 'matched' WHERE id = $1`,
      [bankTransactionRecordId],
    );

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function manualUnmatch({ matchId }) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM reconciliation_matches WHERE id = $1 AND active = TRUE`,
      [matchId],
    );
    const m = rows[0];
    if (!m) throw new Error('Match not found');

    await client.query(
      `UPDATE reconciliation_matches SET active = FALSE, match_status = 'unmatched', notes = CONCAT(COALESCE(notes,''), ' [voided]') WHERE id = $1`,
      [matchId],
    );

    if (m.payout_record_id) {
      await client.query(`UPDATE payouts SET linked_bank_transaction_id = NULL WHERE id = $1`, [
        m.payout_record_id,
      ]);
    }
    if (m.bank_transaction_record_id) {
      await client.query(
        `UPDATE bank_transactions SET reconciliation_status = 'unmatched' WHERE id = $1`,
        [m.bank_transaction_record_id],
      );
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function markReview({ matchId, notes }) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured');
  const { rowCount } = await pool.query(
    `UPDATE reconciliation_matches
     SET match_status = 'needs_review', notes = COALESCE($2, notes), updated_at = NOW()
     WHERE id = $1 AND active = TRUE`,
    [matchId, notes || null],
  );
  if (rowCount === 0) {
    const err = new Error('No active match found for this id');
    err.statusCode = 404;
    throw err;
  }
  return { ok: true };
}
