/**
 * Restore backups/mongo-atlas into local MongoDB.
 * Usage: node scripts/restore-local-mongo.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const mongorestore =
  process.env.MONGORESTORE ||
  'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongorestore.exe';
const dumpDir = path.join(__dirname, '..', '..', 'backups', 'mongo-atlas');

console.log('Restoring Mongo dump into localhost:27017/space_habitats_rag ...');
const result = spawnSync(
  mongorestore,
  [
    '--uri',
    'mongodb://localhost:27017',
    '--gzip',
    '--drop',
    '--nsInclude',
    'space_habitats_rag.*',
    dumpDir,
  ],
  { stdio: 'inherit', windowsHide: true }
);

process.exit(result.status === null ? 1 : result.status);
