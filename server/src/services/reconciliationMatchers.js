const AMOUNT_EPS = 0.005;
const PARTIAL_AMOUNT_MAX = 1.0;

function dayDiff(a, b) {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  if (Number.isNaN(t1) || Number.isNaN(t2)) return Number.NaN;
  return Math.round(Math.abs(t1 - t2) / 86400000);
}

/** @returns {string|null} YYYY-MM-DD or null if missing/invalid */
function toIsoDateOnly(val) {
  if (val == null || val === '') return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function payoutAnchorDate(p) {
  const d = p.arrival_date || p.payout_date;
  return toIsoDateOnly(d);
}

function bankAnchorDate(b) {
  const d = b.posted_date || b.transaction_date;
  return toIsoDateOnly(d);
}

/**
 * Conservative scoring for payout -> bank deposit matching.
 * Returns null if not a plausible candidate.
 */
export function scorePayoutToBank(payout, bankTx) {
  if (!payout || !bankTx) return null;
  if (String(payout.currency || 'USD') !== String(bankTx.currency || 'USD')) {
    return null;
  }

  const pa = Math.abs(Number(payout.amount));
  const ba = Math.abs(Number(bankTx.amount));
  if (!Number.isFinite(pa) || !Number.isFinite(ba)) return null;
  const amountDiff = Math.abs(pa - ba);

  const pDate = payoutAnchorDate(payout);
  const bDate = bankAnchorDate(bankTx);
  if (!pDate || !bDate) return null;
  const dd = dayDiff(pDate, bDate);
  if (Number.isNaN(dd)) return null;

  let referenceHint = false;
  const desc = String(bankTx.description || '').toLowerCase();
  const ref = String(bankTx.reference_number || bankTx.external_reference || '').toLowerCase();
  const pid = String(payout.payout_id || '');
  if (pid && (desc.includes(pid.toLowerCase()) || ref.includes(pid.toLowerCase()))) {
    referenceHint = true;
  }

  const last4Hint =
    payout.destination_last4 &&
    bankTx.bank_account_last4 &&
    String(payout.destination_last4) === String(bankTx.bank_account_last4);

  if (amountDiff <= AMOUNT_EPS) {
    if (dd <= 2) {
      return {
        tier: 'high',
        confidence: referenceHint || last4Hint ? 98 : 92,
        amountDifference: 0,
        dateDifferenceDays: dd,
        matchStatus: 'matched',
        matchMethod: referenceHint || last4Hint ? 'auto_exact' : 'auto_exact',
      };
    }
    if (dd <= 5) {
      return {
        tier: 'medium',
        confidence: 82,
        amountDifference: 0,
        dateDifferenceDays: dd,
        matchStatus: 'matched',
        matchMethod: 'auto_scored',
      };
    }
    return {
      tier: 'low',
      confidence: 40,
      amountDifference: 0,
      dateDifferenceDays: dd,
      matchStatus: 'needs_review',
      matchMethod: 'auto_scored',
    };
  }

  if (amountDiff > 0 && amountDiff <= PARTIAL_AMOUNT_MAX && dd <= 5) {
    return {
      tier: 'partial',
      confidence: 55,
      amountDifference: amountDiff,
      dateDifferenceDays: dd,
      matchStatus: 'partial',
      matchMethod: 'auto_scored',
    };
  }

  return null;
}

/**
 * Picks at most one candidate; flags ambiguity.
 */
export function resolveCandidates(payout, bankRows) {
  const scored = [];
  for (const b of bankRows) {
    const s = scorePayoutToBank(payout, b);
    if (s) scored.push({ bank: b, score: s });
  }

  if (scored.length === 0) {
    return { decision: 'unmatched', candidate: null, ambiguous: false };
  }

  const high = scored.filter((x) => x.score.tier === 'high');
  if (high.length === 1) {
    return { decision: 'auto', candidate: high[0], ambiguous: false };
  }
  if (high.length > 1) {
    return { decision: 'review', candidate: null, ambiguous: true };
  }

  const medium = scored.filter((x) => x.score.tier === 'medium');
  if (medium.length === 1) {
    return { decision: 'auto', candidate: medium[0], ambiguous: false };
  }
  if (medium.length > 1) {
    return { decision: 'review', candidate: null, ambiguous: true };
  }

  const partial = scored.filter((x) => x.score.tier === 'partial');
  if (partial.length === 1) {
    return { decision: 'auto', candidate: partial[0], ambiguous: false };
  }
  if (partial.length > 1) {
    return { decision: 'review', candidate: null, ambiguous: true };
  }

  const review = scored.filter((x) => x.score.matchStatus === 'needs_review');
  if (review.length === 1) {
    return { decision: 'review', candidate: review[0], ambiguous: false };
  }

  return { decision: 'review', candidate: null, ambiguous: scored.length > 1 };
}
