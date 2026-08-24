const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getLimits, canPerformAction } = require('../../services/usageLimits');

describe('usageLimits', () => {
  it('treats unknown tiers as free', () => {
    assert.equal(getLimits('not-a-tier').queries_per_day, 10);
  });

  it('blocks a free user at the daily query cap', () => {
    const result = canPerformAction('query', 'free', { queries: 10 });
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
    assert.equal(result.limit, 10);
  });

  it('allows a free user under the daily query cap', () => {
    const result = canPerformAction('query', 'free', { queries: 9 });
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 1);
  });

  it('does not cap pro or enterprise queries', () => {
    assert.equal(canPerformAction('query', 'pro', { queries: 100000 }).allowed, true);
    assert.equal(canPerformAction('query', 'enterprise', { queries: 100000 }).allowed, true);
  });

  it('blocks free uploads and allows basic uploads under the monthly cap', () => {
    assert.equal(canPerformAction('upload', 'free', { uploads: 0 }).allowed, false);
    assert.equal(canPerformAction('upload', 'basic', { uploads: 4 }).allowed, true);
    assert.equal(canPerformAction('upload', 'basic', { uploads: 5 }).allowed, false);
  });
});
