/**
 * Civil calendar dates in the user's local timezone (YYYY-MM-DD).
 * Matches server list/finance parsing for typical single-region reporting.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(s) {
  if (!s || typeof s !== 'string') return false;
  if (!ISO.test(s.trim())) return false;
  const d = civilDateFromIso(s.trim());
  return !Number.isNaN(d.getTime());
}

export function civilDateFromIso(iso) {
  const m = ISO.exec(String(iso).trim());
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d);
}

export function civilDateToIso(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Last N calendar days including today (local). */
export function defaultCustomRangeDays(spanDays = 30) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (spanDays - 1));
  return { from: civilDateToIso(start), to: civilDateToIso(end) };
}

export function formatCustomRangeLabel(fromIso, toIso) {
  if (!fromIso || !toIso) return 'Custom range';
  const a = civilDateFromIso(fromIso);
  const b = civilDateFromIso(toIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 'Custom range';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${a.toLocaleDateString('en-US', opts)} – ${b.toLocaleDateString('en-US', opts)}`;
}

/** Month keys `year-month` (month 1–12) touched by every calendar day in [fromIso, toIso] (local). */
export function monthKeysTouchingInclusiveRange(fromIso, toIso) {
  if (!isValidIsoDate(fromIso) || !isValidIsoDate(toIso)) return new Set();
  const start = civilDateFromIso(fromIso);
  const end = civilDateFromIso(toIso);
  if (start > end) return new Set();
  const set = new Set();
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    set.add(`${cur.getFullYear()}-${cur.getMonth() + 1}`);
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}
