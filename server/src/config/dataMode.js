/**
 * When DATABASE_URL is set and USE_MOCK_FINANCE is not 'true', read finance data from PostgreSQL.
 */
export function isDatabaseEnabled() {
  return Boolean(process.env.DATABASE_URL) && process.env.USE_MOCK_FINANCE !== 'true';
}

export function getDataFreshnessMode({ hasDbRows }) {
  if (!isDatabaseEnabled()) return 'mock';
  if (hasDbRows) return 'live';
  return 'empty';
}
