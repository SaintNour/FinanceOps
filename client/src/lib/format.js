const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return USD.format(Number(value));
}

export function formatPercent(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Matches server `formatPlatformDisplay` for consistent labels (eBay, WooCommerce, …). */
const PLATFORM_BRANDS = {
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
};

export function formatPlatformLabel(id) {
  if (!id || id === 'all') return 'All platforms';
  const key = String(id).trim().toLowerCase().replace(/\s+/g, '_');
  if (PLATFORM_BRANDS[key]) return PLATFORM_BRANDS[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Total tax for a dashboard/API order row (prefers explicit total_tax). */
export function formatOrderTaxTotal(o) {
  if (!o) return null;
  const st = Number(o.state_tax) || 0;
  const ct = Number(o.county_tax) || 0;
  let tt = Number(o.total_tax);
  if (Number.isNaN(tt) || tt === 0) {
    if (st || ct) tt = st + ct;
    else tt = Number(o.tax_amount) || 0;
  }
  return tt;
}
