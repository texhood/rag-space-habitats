const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { listMigrationFiles, migrationsDir } = require('../../scripts/migrate');

describe('migrations', () => {
  it('uses numbered snake_case SQL files with unique prefixes', () => {
    const files = listMigrationFiles(migrationsDir);
    assert.deepEqual(files, [
      '001_feedback.sql',
      '002_projects.sql',
      '003_project_conversations.sql',
      '004_user_conversations.sql'
    ]);

    const prefixes = new Set();
    for (const file of files) {
      assert.match(file, /^\d{3}_[a-z0-9_]+\.sql$/);
      const prefix = file.slice(0, 3);
      assert.equal(prefixes.has(prefix), false, `duplicate migration number: ${prefix}`);
      prefixes.add(prefix);
    }
  });
});
