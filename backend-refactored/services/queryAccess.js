/**
 * Query quota helpers.
 * checkQueryQuota and recordQuery run from POST /api/rag/ask and
 * POST /api/projects/:id/query. Counts are stored in PostgreSQL daily_usage.
 */

/**
 * Tier used for a query quota check. Admins follow the enterprise limits.
 * @param {{ role?: string, subscription_tier?: string }} user
 * @returns {string}
 */
function tierForQuery(user) {
  if (user?.role === 'admin') return 'enterprise';
  return user?.subscription_tier || 'free';
}

/**
 * Decide whether this user may run another query today.
 * @param {{ id: number, role?: string, subscription_tier?: string }} user
 * @returns {Promise<{ allowed: boolean, used?: number, limit?: number, remaining?: number }>}
 */
async function checkQueryQuota(user) {
  const UsageService = require('./usageService');
  return UsageService.canPerformAction(user.id, 'query', tierForQuery(user));
}

/**
 * Body for a 429 when the daily query cap is already used.
 * @param {{ used?: number, limit?: number }} quota
 * @returns {{ error: string, used?: number, limit?: number }}
 */
function quotaErrorBody(quota) {
  return {
    error: 'Daily query limit reached.',
    used: quota.used,
    limit: quota.limit
  };
}

/**
 * Count a successful query toward today's usage.
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function recordQuery(userId) {
  const UsageService = require('./usageService');
  try {
    await UsageService.logUsage(userId, 'query');
  } catch (err) {
    console.error('[Usage] Failed to record query:', err.message);
  }
}

/**
 * Prior turns for the model. Only stored role and content are kept.
 * @param {Array<{ role?: string, content?: string }>|undefined} messages
 * @returns {Array<{ role: string, content: string }>}
 */
function historyForPrompt(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => (
      message
      && (message.role === 'user' || message.role === 'assistant')
      && typeof message.content === 'string'
    ))
    .map((message) => ({ role: message.role, content: message.content }));
}

module.exports = {
  tierForQuery,
  checkQueryQuota,
  quotaErrorBody,
  recordQuery,
  historyForPrompt
};
