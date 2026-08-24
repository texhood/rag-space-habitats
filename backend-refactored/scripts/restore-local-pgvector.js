/**
 * Restore backups/pgvector.dump into local DATABASE_URL.
 * Skips pgvector extension + document_chunks unless SKIP_VECTOR_OBJECTS=0
 * and the vector extension is already installed.
 *
 * Usage: node scripts/restore-local-pgvector.js
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dumpFile = path.join(__dirname, '..', '..', 'backups', 'pgvector.dump');
const listFile = path.join(__dirname, '..', '..', 'backups', 'pgvector.list');
const pgRestore = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe';
const skipVector = process.env.SKIP_VECTOR_OBJECTS !== '0';

const url = new URL(process.env.DATABASE_URL);
process.env.PGPASSWORD = decodeURIComponent(url.password);
const host = url.hostname;
const port = url.port || '5432';
const user = decodeURIComponent(url.username);
const database = url.pathname.replace(/^\//, '');

const list = spawnSync(
  pgRestore,
  ['--list', dumpFile],
  { encoding: 'utf8', windowsHide: true }
);
if (list.status !== 0) {
  console.error(list.stderr || 'pg_restore --list failed');
  process.exit(1);
}

const skipRe =
  /EXTENSION - vector|COMMENT - EXTENSION vector|TABLE public document_chunks|SEQUENCE public document_chunks|SEQUENCE OWNED BY public document_chunks|DEFAULT public document_chunks|TABLE DATA public document_chunks|SEQUENCE SET public document_chunks|CONSTRAINT public document_chunks|INDEX public idx_chunks_|TABLE public project_documents|SEQUENCE public project_documents|SEQUENCE OWNED BY public project_documents|DEFAULT public project_documents|TABLE DATA public project_documents|SEQUENCE SET public project_documents|CONSTRAINT public project_documents|INDEX public idx_project_documents_|FK CONSTRAINT public project_documents/;

const filtered = list.stdout
  .split(/\r?\n/)
  .map((line) => {
    if (!skipVector) return line;
    if (line && !line.startsWith(';') && skipRe.test(line)) {
      return `; ${line}`;
    }
    return line;
  })
  .join('\n');

fs.writeFileSync(listFile, filtered);
console.log(
  skipVector
    ? 'Restoring all tables except document_chunks / vector extension ...'
    : 'Restoring full dump including document_chunks ...'
);

const result = spawnSync(
  pgRestore,
  [
    '-h',
    host,
    '-p',
    port,
    '-U',
    user,
    '-d',
    database,
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '--use-list',
    listFile,
    dumpFile,
  ],
  { stdio: 'inherit', windowsHide: true }
);

process.exit(result.status === null ? 1 : result.status);
