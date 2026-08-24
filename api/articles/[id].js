const db = require('../_lib/db');
const { json, publicCache } = require('../_lib/http');

function readingTime(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'روش درخواست پشتیبانی نمی‌شود' });
  }

  const id = Number.parseInt(req.query.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return json(res, 400, { error: 'شناسه نامعتبر است' });
  }

  try {
    const { data, error } = await db
      .from('articles')
      .select('id,title,excerpt,content,url,image_url,source,category,created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json(res, 404, { error: 'خبر پیدا نشد' });

    data.excerpt = data.excerpt || String(data.content || '').replace(/\s+/g, ' ').slice(0, 160);
    data.reading_time = readingTime(data.content);

    publicCache(res, 300);
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'خطا در دریافت خبر' });
  }
};
