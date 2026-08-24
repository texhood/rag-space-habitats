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

function isPublicLicense(raw) {
  return PUBLIC_LICENSES.includes(raw);
}

function resolveLicense(raw) {
  if (raw === 'private' || isPublicLicense(raw)) {
    return raw;
  }
  return DEFAULT_LICENSE;
}

function isPublicLibraryItem(submission) {
  return Boolean(
    submission &&
    submission.status === 'processed' &&
    isPublicLicense(submission.license)
  );
}

function isAdmin(user) {
  return Boolean(user && user.role === 'admin');
}

function isOwner(submission, user) {
  if (!user || submission?.submitted_by == null || user.id == null) {
    return false;
  }
  return String(submission.submitted_by) === String(user.id);
}

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

function publicBrowseFilter(license) {
  const filter = {
    status: 'processed',
    license: { $in: PUBLIC_LICENSES }
  };

  if (license && license !== 'all' && isPublicLicense(license)) {
    filter.license = license;
  }

  return filter;
}

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

function approvedIngestFilter() {
  return {
    status: 'approved',
    license: { $in: PUBLIC_LICENSES }
  };
}

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
