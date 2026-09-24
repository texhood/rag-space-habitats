const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('errorHandler', () => {
  it('returns the message for an intentional client error', () => {
    const err = new Error('Project not found');
    err.status = 404;
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, 'Project not found');
  });

  it('hides PostgreSQL constraint details', () => {
    const err = new Error('duplicate key value violates unique constraint "users_username_key"');
    err.code = '23505';
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Invalid data');
    assert.equal(JSON.stringify(res.body).includes('users_username_key'), false);
  });

  it('returns a generic 500 for unexpected errors', () => {
    const err = new Error('password hash leaked in this message');
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Internal Server Error');
    assert.equal(Object.hasOwn(res.body, 'message'), false);
  });

  it('does not treat a MySQL ER_ code as a special case', () => {
    const err = new Error('ER_DUP_ENTRY details');
    err.code = 'ER_DUP_ENTRY';
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'Internal Server Error');
  });
});

describe('notFoundHandler', () => {
  it('names the missing route', () => {
    const res = mockRes();
    notFoundHandler({ method: 'GET', url: '/missing' }, res);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /GET \/missing/);
  });
});
