const db = require('./_lib/db');
const { json, publicCache } = require('./_lib/http');

const allowedCategories = new Set(['هوش مصنوعی', 'تکنولوژی', 'علم', 'کسب‌وکار']);

function integerParam(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function readingTime(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'روش درخواست پشتیبانی نمی‌شود' });
  }

  const limit = integerParam(req.query.limit, 12, 1, 50);
  const offset = integerParam(req.query.offset, 0, 0, 100000);
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

  if (category && !allowedCategories.has(category)) {
    return json(res, 400, { error: 'دسته‌بندی نامعتبر است' });
  }

  try {
    let query = db
      .from('articles')
      .select('id,title,excerpt,url,image_url,source,category,created_at,content', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category', category);

    const { data, count, error } = await query;
    if (error) throw error;

    const items = (data || []).map((article) => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || String(article.content || '').replace(/\s+/g, ' ').slice(0, 160),
      url: article.url,
      image_url: article.image_url,
      source: article.source,
      category: article.category,
      created_at: article.created_at,
      reading_time: readingTime(article.content)
    }));

    publicCache(res, 60);
    return res.status(200).json({ items, total: count || 0, limit, offset });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'خطا در دریافت اخبار' });
  }
};
