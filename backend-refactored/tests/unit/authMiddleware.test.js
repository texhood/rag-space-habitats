const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { requireEnterprise } = require('../../middleware/enterpriseAuth');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('isAuthenticated', () => {
  it('returns 401 when there is no session', () => {
    const req = { isAuthenticated: () => false };
    const res = mockRes();
    let nextCalled = false;
    isAuthenticated(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it('calls next when the session is authenticated', () => {
    const req = { isAuthenticated: () => true, user: { username: 'robin' } };
    const res = mockRes();
    let nextCalled = false;
    isAuthenticated(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });
});

describe('isAdmin', () => {
  it('returns 403 for a signed-in non-admin', () => {
    const req = { isAuthenticated: () => true, user: { role: 'user' } };
    const res = mockRes();
    isAdmin(req, res, () => {});
    assert.equal(res.statusCode, 403);
  });
});

describe('requireEnterprise', () => {
  it('returns 401 when there is no session', () => {
    const req = { isAuthenticated: () => false };
    const res = mockRes();
    let nextCalled = false;
    requireEnterprise(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it('allows an enterprise subscriber', () => {
    const req = {
      isAuthenticated: () => true,
      user: { role: 'user', subscription_tier: 'enterprise' }
    };
    const res = mockRes();
    let nextCalled = false;
    requireEnterprise(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it('allows an admin without an enterprise tier', () => {
    const req = {
      isAuthenticated: () => true,
      user: { role: 'admin', subscription_tier: 'free' }
    };
    const res = mockRes();
    let nextCalled = false;
    requireEnterprise(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  it('rejects a paying enterprise user if subscription_tier is missing from the session', () => {
    const req = {
      isAuthenticated: () => true,
      user: { role: 'user' }
    };
    const res = mockRes();
    let nextCalled = false;
    requireEnterprise(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});
