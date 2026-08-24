const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration } = require('../../services/authValidation');

describe('validateRegistration', () => {
  it('requires username and password', () => {
    const result = validateRegistration({ username: '', password: '' });
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.error, 'Missing fields');
  });

  it('rejects passwords shorter than 6 characters', () => {
    const result = validateRegistration({ username: 'robin', password: '12345' });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Invalid password');
  });

  it('rejects a malformed email when one is provided', () => {
    const result = validateRegistration({
      username: 'robin',
      password: 'secret1',
      email: 'not-an-email'
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Invalid email');
  });

  it('accepts a valid username, password, and email', () => {
    const result = validateRegistration({
      username: 'robin',
      password: 'secret1',
      email: 'robin@example.com'
    });
    assert.equal(result.ok, true);
  });
});
