/**
 * Daily and monthly plan caps. A limit of -1 means unlimited.
 * Query enforcement lives in services/queryAccess.js, called from
 * controllers/ragController.js ask() and services/projectQueryService.js.
 * Project creation enforcement lives in controllers/projectController.js createProject().
 */
const LIMITS = {
  free: {
    queries_per_day: 10,
    uploads_per_month: 0,
    max_file_size: 0,
    llm_access: ['grok'],
    projects_per_account: 1
  },
  basic: {
    queries_per_day: 100,
    uploads_per_month: 5,
    max_file_size: 50 * 1024 * 1024,
    llm_access: ['grok'],
    projects_per_account: 3
  },
  pro: {
    queries_per_day: -1,
    uploads_per_month: 50,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude'],
    projects_per_account: 10
  },
  enterprise: {
    queries_per_day: -1,
    uploads_per_month: -1,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude'],
    projects_per_account: -1,
    priority: true,
    api_access: true
  },
  beta: {
    queries_per_day: -1,
    uploads_per_month: 50,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude'],
    projects_per_account: 10,
    price: 0.00,
    label: 'Beta Access - All Pro Features'
  }
};

/**
 * Limits for a tier. Unknown tiers use the free plan.
 * @param {string} tier
 * @returns {object}
 */
function getLimits(tier) {
  return LIMITS[tier] || LIMITS.free;
}

/**
 * Whether this tier can perform the action given current usage counts.
 * Does not read the database. UsageService supplies the counts.
 * @param {'query'|'upload'|'create_project'} action
 * @param {string} tier
 * @param {{ queries?: number, uploads?: number, projects?: number }} [usage]
 * @returns {{ allowed: boolean, used?: number, limit?: number, remaining?: number }}
 */
function canPerformAction(action, tier, usage = {}) {
  const limits = getLimits(tier);

  if (action === 'query') {
    if (limits.queries_per_day === -1) return { allowed: true };

    const used = usage.queries || 0;
    return {
      allowed: used < limits.queries_per_day,
      used,
      limit: limits.queries_per_day,
      remaining: limits.queries_per_day - used
    };
  }

  if (action === 'upload') {
    if (limits.uploads_per_month === -1) return { allowed: true };

    const used = usage.uploads || 0;
    return {
      allowed: used < limits.uploads_per_month,
      used,
      limit: limits.uploads_per_month,
      remaining: limits.uploads_per_month - used
    };
  }

  if (action === 'create_project') {
    if (limits.projects_per_account === -1) {
      return { allowed: true, used: usage.projects || 0, limit: -1 };
    }

    const used = usage.projects || 0;
    return {
      allowed: used < limits.projects_per_account,
      used,
      limit: limits.projects_per_account,
      remaining: limits.projects_per_account - used
    };
  }

  return { allowed: true };
}

/**
 * Whether another project can be created.
 * @param {string} tier
 * @param {number} [currentCount]
 * @returns {{ allowed: boolean, used?: number, limit?: number, remaining?: number }}
 */
function canCreateProject(tier, currentCount = 0) {
  return canPerformAction('create_project', tier, { projects: currentCount });
}

module.exports = {
  LIMITS,
  getLimits,
  canPerformAction,
  canCreateProject
};
