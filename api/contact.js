const db = require('./_lib/db');
const { json, parseJsonBody, text } = require('./_lib/http');

const buckets = new Map();

function limited(ip) {
  const now = Date.now();
  const existing = buckets.get(ip) || [];
  const recent = existing.filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now);
  buckets.set(ip, recent);
  if (buckets.size > 5000) buckets.clear();
  return false;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    return url.host === host;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'روش درخواست پشتیبانی نمی‌شود' });
  }

  if (!sameOrigin(req)) return json(res, 403, { error: 'درخواست نامعتبر است' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) return json(res, 429, { error: 'تعداد درخواست‌ها زیاد است. چند دقیقه بعد دوباره تلاش کنید.' });

  try {
    const body = parseJsonBody(req);
    const name = text(body.name, 120);
    const message = text(body.message, 5000);
    const website = text(body.website, 200);

    if (website) return json(res, 400, { error: 'درخواست رد شد' });
    if (name.length < 2 || message.length < 5) {
      return json(res, 400, { error: 'نام و پیام را به‌درستی وارد کنید' });
    }

    const { error } = await db.from('contact_messages').insert({ name, message });
    if (error) throw error;

    return json(res, 201, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'ارسال پیام ناموفق بود' });
  }
};
