/**
 * Map thrown API/network errors to short, user-facing copy (no stack traces in UI).
 */
function endpointSuffix(error) {
  const ep = error && typeof error === 'object' ? error.endpoint : null;
  if (!ep || typeof ep !== 'string') return '';
  try {
    const url = new URL(ep, typeof window !== 'undefined' ? window.location.origin : 'http://x');
    const status = error.status ? ` · ${error.status}` : '';
    return ` (${url.pathname}${status})`;
  } catch {
    return '';
  }
}

export function toUserFacingApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const msg = error instanceof Error ? error.message : String(error);
  const suffix = endpointSuffix(error);
  if (!msg || msg === '[object Object]') return `${fallback}${suffix}`;
  if (msg.includes('VITE_API_BASE_URL')) return msg;
  if (msg.includes('Invalid response from the server')) {
    return `Unable to load data right now. Please retry in a moment.${suffix}`;
  }
  if (msg.includes('Unable to reach') || msg.includes('Unable to load data right now')) {
    return `Unable to reach the server. Check your connection and try again.${suffix}`;
  }
  if (msg.includes('Unexpected response')) {
    return `The server returned an unexpected response. Please try again.${suffix}`;
  }
  if (msg.includes('Request failed') || msg.includes('Failed')) {
    return `${fallback}${suffix}`;
  }
  return (msg.length > 200 ? fallback : msg) + suffix;
}
