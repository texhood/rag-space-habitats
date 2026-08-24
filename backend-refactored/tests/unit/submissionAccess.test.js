const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_LICENSE,
  resolveLicense,
  canReadSubmission,
  listSubmissionsFilter,
  publicBrowseFilter,
  canIngestIntoCorpus,
  approvedIngestFilter,
  requireProjectUserId,
  CORPUS_EXCLUDES_PRIVATE_SQL
} = require('../../services/submissionAccess');

const owner = { id: 7, role: 'user' };
const otherUser = { id: 8, role: 'user' };
const admin = { id: 1, role: 'admin' };

function submission(overrides) {
  return {
    submitted_by: 7,
    status: 'pending',
    license: 'private',
    content: 'secret habitat notes',
    ...overrides
  };
}

describe('resolveLicense', () => {
  it('defaults missing or unknown licenses to private', () => {
    assert.equal(resolveLicense(undefined), DEFAULT_LICENSE);
    assert.equal(resolveLicense(''), 'private');
    assert.equal(resolveLicense('public-domain'), 'private');
  });

  it('keeps an explicit Creative Commons license', () => {
    assert.equal(resolveLicense('cc-by'), 'cc-by');
    assert.equal(resolveLicense('cc-by-sa'), 'cc-by-sa');
    assert.equal(resolveLicense('cc-by-nc'), 'cc-by-nc');
  });
});

describe('canReadSubmission', () => {
  it('lets anyone read a processed public submission', () => {
    const doc = submission({ status: 'processed', license: 'cc-by' });
    assert.equal(canReadSubmission(doc, null), true);
    assert.equal(canReadSubmission(doc, otherUser), true);
  });

  it('hides pending and private submissions from other users and from anonymous readers', () => {
    const pending = submission({ status: 'pending', license: 'cc-by' });
    const privateProcessed = submission({ status: 'processed', license: 'private' });

    assert.equal(canReadSubmission(pending, null), false);
    assert.equal(canReadSubmission(pending, otherUser), false);
    assert.equal(canReadSubmission(privateProcessed, null), false);
    assert.equal(canReadSubmission(privateProcessed, otherUser), false);
  });

  it('lets the owner and an admin read private or pending work', () => {
    const doc = submission({ status: 'pending', license: 'private' });
    assert.equal(canReadSubmission(doc, owner), true);
    assert.equal(canReadSubmission(doc, admin), true);
    assert.equal(
      canReadSubmission(submission({ submitted_by: '7' }), { id: 7, role: 'user' }),
      true
    );
  });
});

describe('listSubmissionsFilter', () => {
  it('returns null when there is no session', () => {
    assert.equal(listSubmissionsFilter(null), null);
  });

  it('scopes a subscriber to their own rows', () => {
    assert.deepEqual(listSubmissionsFilter(owner, { status: 'pending' }), {
      status: 'pending',
      submitted_by: 7
    });
  });

  it('lets an admin list every submission', () => {
    assert.deepEqual(listSubmissionsFilter(admin, { status: 'pending' }), {
      status: 'pending'
    });
  });
});

describe('publicBrowseFilter', () => {
  it('only includes processed Creative Commons items', () => {
    assert.deepEqual(publicBrowseFilter(), {
      status: 'processed',
      license: { $in: ['cc-by', 'cc-by-sa', 'cc-by-nc'] }
    });
  });

  it('ignores a request to browse private items', () => {
    assert.deepEqual(publicBrowseFilter('private').license, {
      $in: ['cc-by', 'cc-by-sa', 'cc-by-nc']
    });
  });
});

describe('canIngestIntoCorpus', () => {
  it('refuses private submissions even when approved', () => {
    const result = canIngestIntoCorpus(submission({
      status: 'approved',
      license: 'private'
    }));
    assert.equal(result.ok, false);
    assert.equal(result.code, 'INGEST_FORBIDDEN');
  });

  it('treats a missing license as private', () => {
    const result = canIngestIntoCorpus(submission({
      status: 'approved',
      license: undefined
    }));
    assert.equal(result.ok, false);
    assert.equal(result.code, 'INGEST_FORBIDDEN');
  });

  it('allows an approved Creative Commons submission', () => {
    const result = canIngestIntoCorpus(submission({
      status: 'approved',
      license: 'cc-by'
    }));
    assert.equal(result.ok, true);
  });
});

describe('approvedIngestFilter', () => {
  it('excludes private licenses from batch ingest', () => {
    assert.deepEqual(approvedIngestFilter(), {
      status: 'approved',
      license: { $in: ['cc-by', 'cc-by-sa', 'cc-by-nc'] }
    });
  });
});

describe('requireProjectUserId', () => {
  it('refuses a project lookup with no owner', () => {
    assert.throws(() => requireProjectUserId(null), { code: 'PROJECT_USER_REQUIRED' });
  });

  it('returns the owner id when present', () => {
    assert.equal(requireProjectUserId(7), 7);
  });
});

describe('corpus retrieval', () => {
  it('excludes private licenses from the shared index query', () => {
    assert.match(CORPUS_EXCLUDES_PRIVATE_SQL, /license/);
    assert.match(CORPUS_EXCLUDES_PRIVATE_SQL, /private/);
  });
});
