function json(res, status, body, headers = {}) {
  return res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('X-Content-Type-Options', 'nosniff').setHeader('Cache-Control', 'no-store').setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'").setHeader('Referrer-Policy', 'no-referrer').setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()').set(headers).json(body);
}

function publicCache(res, seconds = 60) {
  res.setHeader('Cache-Control', `public, s-maxage=${seconds}, stale-while-revalidate=${Math.max(seconds * 5, 300)}`);
  res.setHeader('Vary', 'Accept-Encoding');
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    const error = new Error('JSON نامعتبر است');
    error.status = 400;
    throw error;
  }
}

function text(value, max = 10000) {
  return String(value ?? '').trim().slice(0, max);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = { json, publicCache, parseJsonBody, text, isHttpUrl };
