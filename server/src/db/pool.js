import pg from 'pg';

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('Database not configured');
  return p.query(text, params);
}
