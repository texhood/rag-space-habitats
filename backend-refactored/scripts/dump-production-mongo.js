/**
 * Dump production MongoDB (Atlas URI in .env comments) without printing secrets.
 * Usage: node scripts/dump-production-mongo.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const match = envText.match(/#\s*MONGODB_URI=(mongodb\+srv:\/\/\S+)/);

if (!match) {
  console.error('No commented production MONGODB_URI found in .env');
  process.exit(1);
}

const uri = match[1].trim();
const mongodump =
  process.env.MONGODUMP ||
  'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
const outDir = path.join(__dirname, '..', '..', 'backups', 'mongo-atlas');

fs.mkdirSync(outDir, { recursive: true });

console.log('Dumping production MongoDB to backups/mongo-atlas ...');
const result = spawnSync(mongodump, ['--uri', uri, '--out', outDir, '--gzip'], {
  stdio: 'inherit',
  windowsHide: true,
});

process.exit(result.status === null ? 1 : result.status);
