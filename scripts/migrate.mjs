import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Try loading from .env.local
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
      if (match) {
        databaseUrl = match[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
}

if (!databaseUrl) {
  console.error('\n❌ ERROR: DATABASE_URL is not set.');
  console.error('Please set DATABASE_URL in your .env.local or pass it as an environment variable.');
  console.error('Format: postgresql://postgres:[YOUR-PASSWORD]@db.ksdekyjycfhrjsbtqrhb.supabase.co:5432/postgres\n');
  process.exit(1);
}

if (databaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('\n❌ ERROR: Please replace [YOUR-PASSWORD] in DATABASE_URL with your actual Supabase database password.\n');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function runMigrations() {
  console.log('\n🚀 Starting Soul Dive Supabase Automated Migration...');
  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL database successfully.\n');

  // 1. Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 2. Read all migrations
  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await client.query('SELECT name FROM _migrations');
  const appliedSet = new Set(appliedRows.map(r => r.name));

  let appliedCount = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  [skip] ${file} (already applied)`);
      continue;
    }

    console.log(`  ▶ Applying: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ Applied:  ${file}`);
      appliedCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`\n❌ Migration failed on ${file}:`, err.message);
      throw err;
    }
  }

  console.log(`\n🎉 Success: ${appliedCount} migration(s) applied. Database schema is 100% up to date!\n`);
}

runMigrations()
  .catch((err) => {
    console.error('Fatal Migration Error:', err);
    process.exit(1);
  })
  .finally(() => client.end());

