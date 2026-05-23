/**
 * API origin for fetch calls.
 * - Local dev: leave `VITE_API_BASE_URL` unset so requests go to same origin and Vite proxies `/api`.
 * - Production (Firebase Hosting): set `VITE_API_BASE_URL` to the Express API base (https://…, no trailing slash).
 */
export function apiUrl(path) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}