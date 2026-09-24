/**
 * Read the session signing secret. The process must not start with a fallback.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
function requireSessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is required');
  }
  return secret;
}

module.exports = { requireSessionSecret };
