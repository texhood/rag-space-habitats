/**
 * Who may read a MongoDB submission, and which rows may be copied into PostgreSQL chunks.
 * Private licenses stay out of the public corpus.
 */
const CREATIVE_COMMONS_LICENSES = ['cc-by', 'cc-by-sa', 'cc-by-nc'];
const CRAWLER_PUBLIC_LICENSES = [
  'Public Domain (U.S. Government Work)',
  'Public Domain',
  'arXiv Non-exclusive License',
  'arXiv Non-exclusive',
  'CC-BY'
];
const PUBLIC_LICENSES = [
  ...CREATIVE_COMMONS_LICENSES,
  ...CRAWLER_PUBLIC_LICENSES
];
const DEFAULT_LICENSE = 'private';

/**
 * Whether this license may appear in the public library and corpus.
 * @param {*} raw
 * @returns {boolean}
 */
function isPublicLicense(raw) {
  return PUBLIC_LICENSES.includes(raw);
}

/**
 * Known license, or the private default.
 * @param {*} raw
 * @returns {*}
 */
function resolveLicense(raw) {
  if (raw === 'private' || isPublicLicense(raw)) {
    return raw;
  }
  return DEFAULT_LICENSE;
}

/**
 * Whether a Mongo submission is approved and publicly licensed.
 * @param {object} submission
 * @returns {boolean}
 */
function isPublicLibraryItem(submission) {
  return Boolean(
    submission &&
    submission.status === 'processed' &&
    isPublicLicense(submission.license)
  );
}

/**
 * Whether the user role is admin.
 * @param {object} user
 * @returns {boolean}
 */
function isAdmin(user) {
  return Boolean(user && user.role === 'admin');
}

/**
 * Whether this user submitted the document.
 * @param {object} submission
 * @param {object} user
 * @returns {boolean}
 */
function isOwner(submission, user) {
  if (!user || submission?.submitted_by == null || user.id == null) {
    return false;
  }
  return String(submission.submitted_by) === String(user.id);
}

/**
 * Owner, admin, or a public library item may read it.
 * @param {object} submission
 * @param {object} user
 * @returns {boolean}
 */
function canReadSubmission(submission, user) {
  if (!submission) {
    return false;
  }
  if (isPublicLibraryItem(submission)) {
    return true;
  }
  if (isAdmin(user) || isOwner(submission, user)) {
    return true;
  }
  return false;
}

/**
 * Mongo filter for the submissions an admin or owner may list.
 * @param {object} user
 * @param {object} fields
 * @returns {*}
 */
function listSubmissionsFilter(user, { status } = {}) {
  if (!user) {
    return null;
  }

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (!isAdmin(user)) {
    filter.submitted_by = user.id;
  }
  return filter;
}

/**
 * Mongo filter for the public browse list.
 * @param {*} license
 * @param {*} source
 * @returns {*}
 */
function publicBrowseFilter(license, source) {
  const filter = {
    status: 'processed',
    license: { $in: PUBLIC_LICENSES }
  };

  if (license && license !== 'all' && isPublicLicense(license)) {
    filter.license = license;
  }

  if (source === 'ntrs' || source === 'arxiv') {
    filter.source = source;
  } else if (source === 'community') {
    filter.source = { $nin: ['ntrs', 'arxiv'] };
  }

  return filter;
}

/**
 * Approved public submissions may be copied into PostgreSQL chunks.
 * @param {object} submission
 * @returns {boolean}
 */
function canIngestIntoCorpus(submission) {
  if (!submission) {
    return {
      ok: false,
      error: 'Submission not found',
      code: 'NOT_FOUND'
    };
  }

  if (submission.status !== 'approved') {
    return {
      ok: false,
      error: 'Only approved submissions can be processed',
      code: 'NOT_APPROVED'
    };
  }

  if (resolveLicense(submission.license) === 'private') {
    return {
      ok: false,
      error: 'Private submissions cannot be added to the shared library',
      code: 'INGEST_FORBIDDEN'
    };
  }

  return { ok: true };
}

/**
 * Mongo filter for submissions the crawler may ingest.
 * @returns {*}
 */
function approvedIngestFilter() {
  return {
    status: 'approved',
    license: { $in: PUBLIC_LICENSES }
  };
}

/**
 * Throw when a project read has no user id.
 * @param {number} userId
 * @returns {*}
 */
function requireProjectUserId(userId) {
  if (userId === null || userId === undefined || userId === '') {
    const err = new Error('userId is required to load a project');
    err.code = 'PROJECT_USER_REQUIRED';
    throw err;
  }
  return userId;
}

const CORPUS_EXCLUDES_PRIVATE_SQL = "COALESCE(metadata->>'license', '') <> 'private'";

module.exports = {
  CREATIVE_COMMONS_LICENSES,
  CRAWLER_PUBLIC_LICENSES,
  PUBLIC_LICENSES,
  DEFAULT_LICENSE,
  isPublicLicense,
  resolveLicense,
  isPublicLibraryItem,
  canReadSubmission,
  listSubmissionsFilter,
  publicBrowseFilter,
  canIngestIntoCorpus,
  approvedIngestFilter,
  requireProjectUserId,
  CORPUS_EXCLUDES_PRIVATE_SQL
};
