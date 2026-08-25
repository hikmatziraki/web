const { json, publicCache } = require('./_lib/http');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'روش درخواست پشتیبانی نمی‌شود' });
  }

  const value = String(process.env.TELEGRAM_URL || '').trim();
  let telegramUrl = '';
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && ['t.me', 'telegram.me'].includes(url.hostname)) telegramUrl = url.href;
  } catch {}

  publicCache(res, 3600);
  return res.status(200).json({ telegram_url: telegramUrl });
};
