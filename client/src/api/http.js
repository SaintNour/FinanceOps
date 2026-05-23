/**
 * Shared fetch + JSON parsing for finance API calls.
 * Hardens against HTML error pages (e.g. Firebase SPA), network failures, and malformed JSON.
 */
import { apiUrl } from './apiBase.js';

const isDev = import.meta.env.DEV;
const RETRY_DELAYS_MS = [300, 900, 2200];

function logDev(...args) {
  if (isDev) console.warn('[api]', ...args);
}

/** Always visible in both dev and prod so users can share console output when the banner shows */
function logApiFailure(context, url, error, extras) {
  const detail = {
    context,
    url,
    message: error instanceof Error ? error.message : String(error),
    ...(extras || {}),
  };
  console.error('[api:fail]', detail);
  try {
    const bucket = (window.__apiFailures = window.__apiFailures || []);
    bucket.push({ ...detail, at: new Date().toISOString() });
    if (bucket.length > 50) bucket.shift();
  } catch {
    /* ignore */
  }
}

function friendlyNetworkError(url) {
  const err = new Error('Unable to load data right now. Please try again.');
  err.endpoint = url;
  return err;
}

function friendlyBadApiResponse(url) {
  const err = new Error(
    'Invalid response from the server. Please retry in a moment. If it keeps happening, the API may be temporarily unavailable.',
  );
  err.endpoint = url;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableApiError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Invalid response from the server') ||
    msg.includes('Unable to load data right now') ||
    msg.includes('Unable to reach')
  );
}

async function withRetry(task) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= RETRY_DELAYS_MS.length || !isRetryableApiError(error)) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

/**
 * Parse response body as JSON; detect HTML (wrong host / SPA fallback).
 */
function parseJsonBody(text, url, resOk) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    if (resOk) return { body: {}, error: null };
    return { body: null, error: null };
  }
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html') || /<html[\s>]/i.test(trimmed.slice(0, 80))) {
    logApiFailure('html-response', url, friendlyBadApiResponse(url), {
      preview: trimmed.slice(0, 200),
    });
    return { body: null, error: friendlyBadApiResponse(url) };
  }
  try {
    const body = JSON.parse(trimmed);
    if (body === null || typeof body !== 'object') {
      logApiFailure('non-object-json', url, friendlyBadApiResponse(url), {
        preview: trimmed.slice(0, 200),
      });
      return { body: null, error: friendlyBadApiResponse(url) };
    }
    return { body, error: null };
  } catch (err) {
    logApiFailure('json-parse', url, err, { preview: trimmed.slice(0, 200) });
    return { body: null, error: friendlyBadApiResponse(url) };
  }
}

export async function getJson(path, searchParams) {
  return withRetry(async (attempt) => {
    const qs = searchParams ? `?${new URLSearchParams(searchParams)}` : '';
    const url = `${apiUrl(path)}${qs}`;
    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (e) {
      logApiFailure('fetch-error', url, e, { attempt });
      throw friendlyNetworkError(url);
    }
    const text = await res.text();
    const { body, error: parseError } = parseJsonBody(text, url, res.ok);
    if (parseError) {
      logApiFailure('parse-error', url, parseError, {
        attempt,
        status: res.status,
        contentType: res.headers.get('content-type'),
      });
      throw parseError;
    }
    if (!res.ok) {
      const msg = body?.error || res.statusText || 'Request failed';
      const err = new Error(typeof msg === 'string' ? msg : 'Request failed');
      err.endpoint = url;
      err.status = res.status;
      logApiFailure('http-error', url, err, { attempt, status: res.status });
      throw err;
    }
    if (body && body.ok === false) {
      const msg = typeof body.error === 'string' ? body.error : 'Request failed';
      const err = new Error(msg);
      err.endpoint = url;
      logApiFailure('ok-false', url, err, { attempt });
      throw err;
    }
    logDev('ok', url);
    return body;
  });
}

export async function postJson(path, bodyObj, options = {}) {
  const url = apiUrl(path);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(bodyObj ?? {}),
    });
  } catch (e) {
    logApiFailure('post-fetch-error', url, e);
    throw friendlyNetworkError(url);
  }
  const text = await res.text();
  const { body, error: parseError } = parseJsonBody(text, url, res.ok);
  if (parseError) throw parseError;
  if (!res.ok || (body && body.ok === false)) {
    const msg = body?.error || res.statusText || 'Request failed';
    const err = new Error(typeof msg === 'string' ? msg : 'Request failed');
    err.endpoint = url;
    err.status = res.status;
    throw err;
  }
  return body;
}

/** Multipart upload — still validate JSON error bodies when possible */
export async function postForm(path, formData) {
  const url = apiUrl(path);
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: formData });
  } catch (e) {
    logApiFailure('form-fetch-error', url, e);
    throw friendlyNetworkError(url);
  }
  const text = await res.text();
  const { body, error: parseError } = parseJsonBody(text, url, res.ok);
  if (parseError) throw parseError;
  if (!res.ok) throw new Error(body?.error || 'Upload failed');
  if (body && body.ok === false) throw new Error(body.error || 'Upload failed');
  return body;
}

/**
 * Binary/text download (CSV). Params are flattened query key/values.
 * Returns blob + optional filename from Content-Disposition.
 */
export async function fetchBlob(path, params, accept = 'text/csv') {
  const flat = params && typeof params === 'object' ? params : {};
  const qs = Object.keys(flat).length ? `?${new URLSearchParams(flat)}` : '';
  const url = `${apiUrl(path)}${qs}`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: accept } });
  } catch (e) {
    logApiFailure('blob-fetch-error', url, e);
    throw friendlyNetworkError(url);
  }
  const ct = res.headers.get('Content-Type') || '';
  if (!res.ok) {
    if (ct.includes('application/json')) {
      const text = await res.text();
      const parsed = parseJsonBody(text, url, false);
      throw new Error(parsed.body?.error || res.statusText || 'Export failed');
    }
    throw new Error(res.statusText || 'Export failed');
  }
  if (ct.includes('text/html')) {
    throw friendlyBadApiResponse(url);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  let filename = 'export.csv';
  const m = /filename\*?=(?:UTF-8'')?["']?([^";\n]+)/i.exec(cd);
  if (m) {
    try {
      filename = decodeURIComponent(m[1].replace(/['"]/g, '').trim());
    } catch {
      /* keep default */
    }
  }
  return { blob, filename };
}

/** PATCH / PUT / DELETE with optional JSON body */
export async function sendJson(path, method, body) {
  const url = apiUrl(path);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    logApiFailure('send-fetch-error', url, e);
    throw friendlyNetworkError(url);
  }
  const text = await res.text();
  const { body: parsed, error: parseError } = parseJsonBody(text, url, res.ok);
  if (parseError) throw parseError;
  if (!res.ok || (parsed && parsed.ok === false)) {
    const err = new Error(parsed?.error || res.statusText || 'Request failed');
    err.endpoint = url;
    err.status = res.status;
    throw err;
  }
  return parsed;
}
