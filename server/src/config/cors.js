import cors from 'cors';

/**
 * CORS for SPA + separate API deployments.
 * - Development: reflect any origin (local Vite on various ports).
 * - Production: allowlist from CORS_ORIGINS (comma-separated), e.g. Firebase Hosting URLs.
 */
export function createCorsMiddleware() {
  const allowList = [
    ...new Set(
      (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  const isDev = process.env.NODE_ENV !== 'production';

  return cors({
    origin(origin, callback) {
      if (isDev) {
        return callback(null, true);
      }
      if (!origin) {
        return callback(null, true);
      }
      if (allowList.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });
}
