/**
 * Dump Railway pgvector via CLI variables. Does not print connection strings.
 * Usage: node scripts/dump-railway-pgvector.js
 * Requires: railway login + linked RAG-Space-Habitats project.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outFile = path.join(__dirname, '..', '..', 'backups', 'pgvector.dump');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const raw = execSync('railway variable list --service pgvector --json', {
  encoding: 'utf8',
});
const vars = JSON.parse(raw);
const url = vars.DATABASE_PUBLIC_URL || vars.DATABASE_URL;

if (!url) {
  console.error(
    'No DATABASE_PUBLIC_URL or DATABASE_URL on the pgvector service.'
  );
  process.exit(1);
}

if (url.includes('railway.internal')) {
  console.error(
    'Only the private DATABASE_URL is set. Enable a TCP proxy on pgvector or use railway connect --tunnel-only.'
  );
  process.exit(1);
}

const dumpUrl = url.includes('sslmode=')
  ? url
  : `${url}${url.includes('?') ? '&' : '?'}sslmode=disable`;

const pgDump = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
console.log('Dumping Railway pgvector to backups/pgvector.dump ...');

const result = spawnSync(
  pgDump,
  [
    dumpUrl,
    '--format=custom',
    '--no-owner',
    '--no-acl',
    '--file',
    outFile,
  ],
  { stdio: 'inherit', windowsHide: true }
);

if (result.status === 0) {
  const stat = fs.statSync(outFile);
  console.log(`Dump complete (${stat.size} bytes)`);
}

process.exit(result.status === null ? 1 : result.status);
