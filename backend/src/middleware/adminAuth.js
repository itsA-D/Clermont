const enabled = () => process.env.ADMIN_AUTH_ENABLED === 'true';

export function adminAuth(req, res, next) {
  if (!enabled()) return next();
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const b64 = auth.split(' ')[1] || '';
  let decoded = '';
  try { decoded = Buffer.from(b64, 'base64').toString('utf8'); } catch (e) {}
  const idx = decoded.indexOf(':');
  const user = idx >= 0 ? decoded.slice(0, idx) : '';
  const pass = idx >= 0 ? decoded.slice(idx + 1) : '';
  if (user === (process.env.ADMIN_USER || 'admin') && pass === (process.env.ADMIN_PASS || 'admin')) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).json({ error: 'Unauthorized' });
}

const rlEnabled = () => process.env.ADMIN_RATE_LIMIT_ENABLED === 'true';
const ipBuckets = new Map();

export function adminRateLimit(req, res, next) {
  if (!rlEnabled()) return next();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  const max = parseInt(process.env.RATE_LIMIT_MAX || '100');
  const now = Date.now();
  const key = req.ip || req.connection?.remoteAddress || 'unknown';
  let b = ipBuckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    ipBuckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    const retryAfter = Math.max(0, Math.ceil((b.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  next();
}
