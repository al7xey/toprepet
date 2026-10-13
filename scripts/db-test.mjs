/* Runs supabase/tests/*.sql against the local database, each file in its own rolled-back transaction.
   Database URL: SUPABASE_DB_URL, default is the `supabase start` one. */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const url = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const dir = new URL('../supabase/tests/', import.meta.url);
const files = readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
let failed = 0;

for (const name of files) {
  const sql = `begin;\n${readFileSync(new URL(name, dir), 'utf8')}\nrollback;\n`;
  try {
    execFileSync('psql', [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: sql, stdio: ['pipe', 'ignore', 'pipe'] });
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}\n${String(error.stderr).trim()}`);
  }
}

if (failed) process.exit(1);
