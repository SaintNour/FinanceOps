import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const phase3Path = path.join(__dirname, 'schema_phase3.sql');
  const phase3 = fs.existsSync(phase3Path)
    ? fs.readFileSync(phase3Path, 'utf8')
    : '';
  const phase4Path = path.join(__dirname, 'schema_phase4.sql');
  const phase4 = fs.existsSync(phase4Path)
    ? fs.readFileSync(phase4Path, 'utf8')
    : '';
  const phase5Path = path.join(__dirname, 'schema_phase5.sql');
  const phase5 = fs.existsSync(phase5Path)
    ? fs.readFileSync(phase5Path, 'utf8')
    : '';
  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query(sql);
    if (phase3) await pool.query(phase3);
    if (phase4) await pool.query(phase4);
    if (phase5) await pool.query(phase5);
    console.log('Migration applied successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
