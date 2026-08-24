const crypto = require('node:crypto');
const db = require('./_lib/db');
const { json, parseJsonBody, text, isHttpUrl } = require('./_lib/http');

const allowed = new Set(['هوش مصنوعی', 'تکنولوژی', 'علم', 'کسب‌وکار']);

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'روش درخواست پشتیبانی نمی‌شود' });
  }

  const configuredSecret = process.env.API_SECRET;
  if (!configuredSecret || !safeEqual(req.headers['x-api-secret'], configuredSecret)) {
    return json(res, 401, { error: 'دسترسی غیرمجاز' });
  }

  try {
    const body = parseJsonBody(req);
    const title = text(body.title, 300);
    const content = text(body.content, 100000);
    const url = text(body.url, 2048);
    const imageUrl = text(body.image_url, 2048);
    const source = text(body.source, 200);
    const category = text(body.category, 50);
    const excerpt = text(body.excerpt, 320) || content.replace(/\s+/g, ' ').slice(0, 160);

    if (!title || !content || !url || !allowed.has(category)) {
      return json(res, 400, { error: 'فیلدهای ضروری ناقص یا نامعتبر هستند' });
    }

    if (!isHttpUrl(url) || (imageUrl && !isHttpUrl(imageUrl))) {
      return json(res, 400, { error: 'آدرس منبع یا تصویر باید با http یا https شروع شود' });
    }

    const payload = {
      title,
      excerpt,
      content,
      url,
      image_url: imageUrl || null,
      source: source || null,
      category
    };

    const { data, error } = await db.from('articles').insert(payload).select('id').single();
    if (error) {
      if (error.code === '23505') return json(res, 409, { error: 'این خبر قبلاً ثبت شده است' });
      throw error;
    }

    return json(res, 201, { id: data.id });
  } catch (error) {
    console.error(error);
    return json(res, error.status || 500, { error: error.status ? error.message : 'خطا در ثبت خبر' });
  }
};
