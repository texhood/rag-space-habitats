const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

describe('password hashing', () => {
  it('verifies a bcryptjs hash created with the same API as registration', async () => {
    const hash = await bcrypt.hash('secret1', 10);
    assert.equal(await bcrypt.compare('secret1', hash), true);
    assert.equal(await bcrypt.compare('wrong', hash), false);
  });
});
