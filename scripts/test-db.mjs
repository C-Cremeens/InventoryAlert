// Local disposable database only. CI uses native PostgreSQL to verify real lock contention.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
const db = await PGlite.create();
const port = Number(process.env.TEST_DB_PORT ?? 55432);
const server = new PGLiteSocketServer({ db, host: '127.0.0.1', port, maxConnections: 20 });
await server.start();
const url = `postgresql://postgres:postgres@127.0.0.1:${port}/inventoryalert_test`;
const env = { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' };
const run = (cmd, args) => new Promise((resolve, reject) => { const child = spawn(cmd, args, { env, stdio: 'inherit' }); child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
try {
  let code = await run('npx', ['prisma', 'migrate', 'deploy']);
  if (code === 0) code = await run('npm', ['test']);
  process.exitCode = code;
} finally { await server.stop(); await db.close(); }
