/**
 * Internal import_type (multipart + app state) ↔ URL slug for GET /api/import/templates/:slug
 * Must stay aligned with server TEMPLATE_SLUG_TO_TYPE / TEMPLATE_TYPE_TO_SLUG.
 */
export const IMPORT_TYPE_TO_TEMPLATE_SLUG = {
  orders: 'orders',
  payments: 'payments',
  refunds: 'refunds',
  fees: 'fees',
  bank_transactions: 'bank-transactions',
};

export const TEMPLATE_SLUG_TO_IMPORT_TYPE = Object.fromEntries(
  Object.entries(IMPORT_TYPE_TO_TEMPLATE_SLUG).map(([k, v]) => [v, k]),
);

export const KNOWN_IMPORT_TYPES = Object.keys(IMPORT_TYPE_TO_TEMPLATE_SLUG);

export function importTypeToTemplateSlug(importType) {
  return IMPORT_TYPE_TO_TEMPLATE_SLUG[importType] ?? null;
}

export function templateSamplePath(importType) {
  const slug = importTypeToTemplateSlug(importType);
  if (!slug) return null;
  return `/api/import/templates/${slug}`;
}

/**
 * Prefer backend `downloadPath` when present. Never derive URLs from display labels.
 * Fixes a common bug where a label like "Orders" becomes `orders` + `s` => `orderss`.
 */
export function resolveTemplateSampleDownloadUrl(importType, selectedTemplate) {
  const expectedSlug = importTypeToTemplateSlug(importType);
  if (!expectedSlug) return null;

  const fallback = `/api/import/templates/${expectedSlug}`;

  const raw = selectedTemplate?.downloadPath;
  if (typeof raw === 'string' && raw.trim()) {
    let path = raw.trim();
    if (!path.startsWith('/')) path = `/${path}`;

    const m = path.match(/^\/api\/import\/templates\/([^/?#]+)/);
    if (m) {
      let seg = m[1];
      if (seg === `${expectedSlug}s`) {
        seg = expectedSlug;
      }
      return `/api/import/templates/${seg}`;
    }
    return path;
  }

  return fallback;
}

/**
 * Normalize API `templates` (object or array) into a map keyed by internal import_type.
 */
export function normalizeTemplatesMap(raw) {
  const out = {};
  if (!raw) return out;

  const assign = (importType, def) => {
    if (!importType || !def || typeof def !== 'object') return;
    const expected = importTypeToTemplateSlug(importType);
    let slug = def.slug ?? expected;
    if (expected && slug === `${expected}s`) {
      slug = expected;
    }
    let downloadPath = def.downloadPath ?? (slug ? `/api/import/templates/${slug}` : null);
    if (typeof downloadPath === 'string' && expected) {
      const mm = downloadPath.match(/\/api\/import\/templates\/([^/?#]+)/);
      if (mm?.[1] === `${expected}s`) {
        downloadPath = `/api/import/templates/${expected}`;
      }
    }
    out[importType] = { ...def, importType, slug, downloadPath };
  };

  if (Array.isArray(raw)) {
    for (const t of raw) {
      if (t?.importType) assign(t.importType, t);
    }
    return out;
  }

  for (const [key, val] of Object.entries(raw)) {
    if (!val || typeof val !== 'object') continue;
    const fromValue = val.importType;
    const fromSlugKey = TEMPLATE_SLUG_TO_IMPORT_TYPE[key];
    const fromInternalKey = KNOWN_IMPORT_TYPES.includes(key) ? key : null;
    const importType = fromValue ?? fromSlugKey ?? fromInternalKey;
    if (importType) assign(importType, { ...val, importType });
  }

  return out;
}

export function getTemplateForImportType(templateMap, importType) {
  if (!templateMap || !importType) return null;
  const direct = templateMap[importType];
  if (direct) return direct;
  const slug = importTypeToTemplateSlug(importType);
  if (slug && templateMap[slug]) return { ...templateMap[slug], importType, slug };
  return null;
}
