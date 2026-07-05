const DEFAULT_TTL_SECONDS = 30;

const cache = new Map();

function now() {
  return Date.now();
}

function normalizeTtl(ttlSeconds = DEFAULT_TTL_SECONDS) {
  const parsed = Number(ttlSeconds);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}

function hasAuth(req) {
  return Boolean(req.headers.authorization);
}

function getCacheKey(req) {
  return req.originalUrl || req.url;
}

function clearPublicCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function stripConditionalRequestHeaders(req) {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
}

function publicCache(ttlSeconds = DEFAULT_TTL_SECONDS) {
  const ttlMs = normalizeTtl(ttlSeconds) * 1000;
  return (req, res, next) => {
    if (req.method === 'HEAD') return next();
    if (req.method !== 'GET' || hasAuth(req)) return next();

    stripConditionalRequestHeaders(req);

    const key = getCacheKey(req);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Public-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      for (const [header, value] of Object.entries(cached.headers)) {
        if (value !== undefined) res.setHeader(header, value);
      }
      return res.status(cached.statusCode).send(cached.body);
    }
    if (cached) cache.delete(key);

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && !res.getHeader('Set-Cookie')) {
        cache.set(key, {
          statusCode: res.statusCode,
          headers: { 'content-type': res.getHeader('content-type') },
          body,
          expiresAt: now() + ttlMs,
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Public-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      }
      return originalSend(body);
    };

    return next();
  };
}

function slowRequestLogger(thresholdMs = 1000) {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (durationMs > thresholdMs) {
        console.warn('[slow-api]', {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      }
    });
    next();
  };
}

function clearPublicCacheAfterMutation(req, res, next) {
  if (req.method === 'GET') return next();
  if (!String(req.originalUrl || req.url).startsWith('/api/')) return next();
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) clearPublicCache();
  });
  next();
}

module.exports = {
  DEFAULT_TTL_SECONDS,
  publicCache,
  clearPublicCache,
  clearPublicCacheAfterMutation,
  slowRequestLogger,
};
