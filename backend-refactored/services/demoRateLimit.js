const WINDOW_MS = 30 * 60 * 1000;
const MAX_HITS = 3;

const hitsByIp = new Map();

function clientIp(req) {
  if (req.ip) return req.ip;
  return req.socket?.remoteAddress || 'unknown';
}

function prune(now) {
  for (const [ip, entry] of hitsByIp.entries()) {
    if (entry.resetAt <= now) {
      hitsByIp.delete(ip);
    }
  }
}

function checkDemoRateLimit(req, now = Date.now()) {
  prune(now);
  const ip = clientIp(req);
  const existing = hitsByIp.get(ip);

  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: MAX_HITS, ip };
  }

  if (existing.count >= MAX_HITS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
      ip
    };
  }

  return {
    allowed: true,
    remaining: MAX_HITS - existing.count,
    ip
  };
}

function recordDemoHit(req, now = Date.now()) {
  const ip = clientIp(req);
  const existing = hitsByIp.get(ip);
  if (!existing || existing.resetAt <= now) {
    hitsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { remaining: MAX_HITS - 1, resetAt: now + WINDOW_MS };
  }
  existing.count += 1;
  return { remaining: Math.max(0, MAX_HITS - existing.count), resetAt: existing.resetAt };
}

function consumeDemoHit(req, now = Date.now()) {
  const result = checkDemoRateLimit(req, now);
  if (!result.allowed) return result;
  const recorded = recordDemoHit(req, now);
  return {
    allowed: true,
    remaining: recorded.remaining,
    ip: result.ip
  };
}

function demoRateLimitMiddleware(req, res, next) {
  const result = consumeDemoHit(req);
  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.retryAfterMs || WINDOW_MS) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: 'Demo limit reached. Create a free account to keep asking.',
      retryAfterSeconds: retryAfterSec
    });
  }
  req.demoRate = result;
  next();
}

module.exports = {
  WINDOW_MS,
  MAX_HITS,
  clientIp,
  checkDemoRateLimit,
  recordDemoHit,
  consumeDemoHit,
  demoRateLimitMiddleware,
  _hitsByIp: hitsByIp
};
