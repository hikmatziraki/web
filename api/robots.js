module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const sitemap = host ? `${protocol}://${host}/sitemap.xml` : '/sitemap.xml';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send([
    'User-agent: *',
    'Allow: /',
    'Allow: /api/articles',
    'Disallow: /api/create',
    'Disallow: /api/contact',
    `Sitemap: ${sitemap}`,
    ''
  ].join('\n'));
};
