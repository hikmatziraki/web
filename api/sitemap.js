const db = require('./_lib/db');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function siteUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? `${protocol}://${host}` : '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const base = siteUrl(req);
    if (!base) return res.status(500).send('Sitemap host is unavailable');

    const staticPages = [
      '/',
      '/about.html',
      '/contact.html',
      '/category/هوش%20مصنوعی',
      '/category/تکنولوژی',
      '/category/علم',
      '/category/کسب‌وکار'
    ];

    const { data, error } = await db
      .from('articles')
      .select('id,created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    const urls = staticPages.map((path) => `<url><loc>${escapeXml(base + path)}</loc></url>`);
    for (const article of data || []) {
      urls.push(`<url><loc>${escapeXml(`${base}/article/${article.id}`)}</loc><lastmod>${new Date(article.created_at).toISOString()}</lastmod></url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Sitemap unavailable');
  }
};
