/**
 * Local helper: starts an embedded PostgreSQL for development/smoke tests.
 * Not required if you already have PostgreSQL installed.
 *
 * Usage: npx tsx scripts/start-embedded-pg.ts
 * Keep this process running while you develop.
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import path from 'path';

async function main() {
  const databaseDir = path.join(__dirname, '..', 'data', 'db');
  const alreadyInitialised = fs.existsSync(path.join(databaseDir, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    persistent: true,
  });

  if (alreadyInitialised) {
    console.log('Using existing Postgres data directory (skipping initdb)');
  } else {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase('quiz_builder');
    console.log('Created database quiz_builder');
  } catch {
    console.log('Database quiz_builder already exists (ok)');
  }

  console.log('Embedded PostgreSQL running on localhost:5432');
  console.log('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quiz_builder?schema=public');
  console.log('Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
