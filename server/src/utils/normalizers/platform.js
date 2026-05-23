/**
 * Canonical platform keys are lowercase slugs (e.g. ebay, shopify).
 * Display labels use known brand casing (eBay, Shopify) when available.
 */

const BRAND_LABELS = Object.freeze({
  amazon: 'Amazon',
  braintree: 'Braintree',
  ebay: 'eBay',
  etsy: 'Etsy',
  paypal: 'PayPal',
  shopify: 'Shopify',
  square: 'Square',
  stripe: 'Stripe',
  tiktok: 'TikTok',
  tiktok_shop: 'TikTok Shop',
  woocommerce: 'WooCommerce',
});

/**
 * Stable key for storage, filters, and joins. Collapses whitespace and removes odd characters.
 */
export function canonicalPlatformKey(value) {
  if (value == null || value === '') return null;
  let s = String(value).trim().toLowerCase();
  s = s.replace(/\s+/g, '_');
  s = s.replace(/[^a-z0-9_]/g, '');
  return s || null;
}

/**
 * Human-readable label for UI (dropdowns, charts, badges).
 */
export function formatPlatformDisplay(value) {
  const key = canonicalPlatformKey(value);
  if (!key) return 'Unknown';
  if (BRAND_LABELS[key]) return BRAND_LABELS[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Query param / filter value: same as canonical key.
 */
export function normalizePlatform(query) {
  return canonicalPlatformKey(query);
}
