const LIMITS = {
  free: {
    queries_per_day: 10,
    uploads_per_month: 0,
    max_file_size: 0,
    llm_access: ['grok']
  },
  basic: {
    queries_per_day: 100,
    uploads_per_month: 5,
    max_file_size: 50 * 1024 * 1024,
    llm_access: ['grok']
  },
  pro: {
    queries_per_day: -1,
    uploads_per_month: 50,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude']
  },
  enterprise: {
    queries_per_day: -1,
    uploads_per_month: -1,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude'],
    priority: true,
    api_access: true
  },
  beta: {
    queries_per_day: -1,
    uploads_per_month: 50,
    max_file_size: 100 * 1024 * 1024,
    llm_access: ['grok', 'claude'],
    price: 0.00,
    label: 'Beta Access - All Pro Features'
  }
};

function getLimits(tier) {
  return LIMITS[tier] || LIMITS.free;
}

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

  return { allowed: true };
}

module.exports = {
  LIMITS,
  getLimits,
  canPerformAction
};
