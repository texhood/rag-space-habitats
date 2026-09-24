const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_HITS,
  checkDemoRateLimit,
  recordDemoHit,
  consumeDemoHit,
  demoRateLimitMiddleware,
  _hitsByIp
} = require('../../services/demoRateLimit');

function reqFor(ip) {
  return { headers: { 'x-forwarded-for': ip }, ip };
}

describe('demoRateLimit', () => {
  beforeEach(() => {
    _hitsByIp.clear();
  });

  it('allows the first questions from an IP', () => {
    const req = reqFor('203.0.113.9');
    const now = 1_000_000;
    assert.equal(checkDemoRateLimit(req, now).allowed, true);
    recordDemoHit(req, now);
    assert.equal(checkDemoRateLimit(req, now).remaining, MAX_HITS - 1);
  });

  it('blocks an IP after the demo cap', () => {
    const req = reqFor('203.0.113.10');
    const now = 2_000_000;
    for (let i = 0; i < MAX_HITS; i += 1) {
      recordDemoHit(req, now);
    }
    const blocked = checkDemoRateLimit(req, now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });

  it('counts a demo hit before the handler runs', () => {
    const req = reqFor('203.0.113.13');
    const res = {
      statusCode: 200,
      body: null,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
      set(name, value) { this.headers[name] = value; }
    };
    let nextCalled = false;
    demoRateLimitMiddleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(checkDemoRateLimit(req, Date.now()).remaining, MAX_HITS - 1);
    const blockedAt = consumeDemoHit(req, Date.now());
    assert.equal(blockedAt.allowed, true);
  });

  it('tracks IPs separately', () => {
    const now = 3_000_000;
    const a = reqFor('203.0.113.11');
    for (let i = 0; i < MAX_HITS; i += 1) {
      recordDemoHit(a, now);
    }
    assert.equal(checkDemoRateLimit(reqFor('203.0.113.12'), now).allowed, true);
  });
});
