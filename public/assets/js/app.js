'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const CATEGORIES = ['هوش مصنوعی', 'تکنولوژی', 'علم', 'کسب‌وکار'];
let siteConfig = { telegram_url: '' };

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      signal: options.signal || controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'پاسخ سرور قابل پردازش نیست.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('زمان پاسخ‌گویی تمام شد. دوباره تلاش کنید.');
    if (error instanceof TypeError) throw new Error('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const normalizeFa = (value) => String(value ?? '')
  .toLocaleLowerCase('fa-IR')
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[\u200c\u200f\u200e]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const dateFa = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاریخ نامشخص';
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

function setMeta(name, content, attribute = 'name') {
  if (!content) return;
  const elements = [...document.head.querySelectorAll(`meta[${attribute}]`)];
  let element = elements.find((item) => item.getAttribute(attribute) === name);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(content).slice(0, 500));
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function setJsonLd(value) {
  let element = $('#articleSchema');
  if (!element) {
    element = document.createElement('script');
    element.id = 'articleSchema';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
}

function configureTelegram(root = document) {
  const href = safeHttpUrl(siteConfig.telegram_url);
  root.querySelectorAll('[data-telegram]').forEach((link) => {
    const area = link.closest('[data-telegram-area]');
    if (href) {
      link.href = href;
      area?.setAttribute('data-configured', 'true');
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      area?.setAttribute('data-configured', 'false');
    }
  });
}

async function loadSiteConfig() {
  try {
    siteConfig = await api('/api/config');
  } catch {
    siteConfig = { telegram_url: '' };
  }
  configureTelegram();
}

function wireCommon() {
  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(new Date().getFullYear());
  });

  $('#headerSearch')?.addEventListener('click', () => { location.href = '/search'; });

  const navToggle = $('#navToggle');
  const nav = $('#primaryNav');
  const closeNav = () => {
    nav?.setAttribute('data-open', 'false');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'باز کردن منو');
    document.body.classList.remove('is-locked');
  };

  navToggle?.addEventListener('click', () => {
    const next = nav?.dataset.open !== 'true';
    nav?.setAttribute('data-open', String(next));
    navToggle.setAttribute('aria-expanded', String(next));
    navToggle.setAttribute('aria-label', next ? 'بستن منو' : 'باز کردن منو');
    document.body.classList.toggle('is-locked', next);
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('[data-telegram][aria-disabled="true"]');
    if (!link) return;
    event.preventDefault();
    const note = link.closest('[data-telegram-area]')?.querySelector('[data-telegram-note]');
    if (note) note.textContent = 'نشانی کانال تلگرام هنوز تنظیم نشده است.';
  });

  loadSiteConfig();
}

function card(article) {
  const imageUrl = safeHttpUrl(article.image_url);
  const image = imageUrl
    ? `<img loading="lazy" decoding="async" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.title)}" width="640" height="400">`
    : '<div class="media-empty" aria-hidden="true">تک‌پالس</div>';
  const excerpt = article.excerpt || 'برای خواندن متن کامل خبر وارد شوید.';

  return `<article class="card">
    <a href="/article/${encodeURIComponent(article.id)}" aria-label="${escapeHtml(article.title)}">
      <div class="card-media">${image}</div>
      <div class="card-body">
        <span class="badge">${escapeHtml(article.category)}</span>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="excerpt">${escapeHtml(excerpt)}</p>
        <div class="meta">
          <span>${dateFa(article.created_at)}</span>
          <span>${Number(article.reading_time) || 1} دقیقه مطالعه</span>
        </div>
      </div>
    </a>
  </article>`;
}

const emptyState = (message, retry = false) => `<div class="state" role="status"><p>${escapeHtml(message)}</p>${retry ? '<button class="btn" type="button" data-retry>تلاش دوباره</button>' : ''}</div>`;
const skeletonCards = (count = 3) => Array.from({ length: count }, () => '<div class="skeleton skeleton-card" aria-hidden="true"></div>').join('');

async function home() {
  wireCommon();
  const featured = $('#featured');
  const latest = $('#latest');
  latest.innerHTML = skeletonCards(6);

  const load = async () => {
    featured.className = 'featured skeleton';
    featured.innerHTML = '';
    latest.innerHTML = skeletonCards(6);
    try {
      const { items } = await api('/api/articles?limit=13');
      if (!items.length) {
        featured.classList.remove('skeleton');
        featured.innerHTML = emptyState('هنوز خبری منتشر نشده است.');
        latest.innerHTML = emptyState('با انتشار نخستین خبر، این بخش به‌روز می‌شود.');
        return;
      }

      const first = items[0];
      const imageUrl = safeHttpUrl(first.image_url);
      const image = imageUrl
        ? `<img fetchpriority="high" decoding="async" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(first.title)}" width="1280" height="720">`
        : '<div class="media-empty" aria-hidden="true">تک‌پالس</div>';

      featured.classList.remove('skeleton');
      featured.innerHTML = `<a href="/article/${encodeURIComponent(first.id)}">
        <div class="featured-media">${image}</div>
        <div class="card-body">
          <span class="badge">${escapeHtml(first.category)}</span>
          <h2>${escapeHtml(first.title)}</h2>
          <p class="excerpt">${escapeHtml(first.excerpt)}</p>
          <div class="meta"><span>${dateFa(first.created_at)}</span><span>${Number(first.reading_time) || 1} دقیقه مطالعه</span>${first.source ? `<span>${escapeHtml(first.source)}</span>` : ''}</div>
        </div>
      </a>`;
      latest.innerHTML = items.length > 1 ? items.slice(1).map(card).join('') : emptyState('خبر دیگری منتشر نشده است.');
    } catch (error) {
      featured.classList.remove('skeleton');
      featured.innerHTML = emptyState(error.message, true);
      latest.innerHTML = '';
      $('[data-retry]', featured)?.addEventListener('click', load, { once: true });
    }
  };

  await load();
}

function renderArticleBody(content) {
  const lines = String(content || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let html = '';
  let inList = false;
  for (const line of lines) {
    const isBullet = /^•\s*/.test(line);
    if (isBullet && !inList) { html += '<ul>'; inList = true; }
    if (!isBullet && inList) { html += '</ul>'; inList = false; }
    html += isBullet ? `<li>${escapeHtml(line.replace(/^•\s*/, ''))}</li>` : `<p>${escapeHtml(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html || '<p>متن این خبر در دسترس نیست.</p>';
}

async function shareArticle(type, title) {
  const url = location.href;
  const links = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  };
  if (type === 'copy') {
    try { await navigator.clipboard.writeText(url); return 'کپی شد'; }
    catch { window.prompt('لینک خبر را کپی کنید:', url); return 'لینک آماده است'; }
  }
  if (type === 'native' && navigator.share) {
    try { await navigator.share({ title, url }); } catch {}
    return '';
  }
  if (links[type]) window.open(links[type], '_blank', 'noopener,noreferrer,width=700,height=600');
  return '';
}

async function article() {
  wireCommon();
  const root = $('#articleRoot');
  root.innerHTML = '<div class="container article"><div class="skeleton skeleton-card" aria-label="در حال بارگذاری خبر"></div></div>';
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^\d+$/.test(id)) {
    root.innerHTML = `<div class="container article">${emptyState('شناسه خبر نامعتبر است.')}</div>`;
    return;
  }

  try {
    const articleData = await api(`/api/articles/${encodeURIComponent(id)}`);
    let related = [];
    try {
      const response = await api(`/api/articles?limit=8&category=${encodeURIComponent(articleData.category)}`);
      related = response.items.filter((item) => String(item.id) !== String(articleData.id)).slice(0, 3);
    } catch {}

    const sourceUrl = safeHttpUrl(articleData.url);
    const imageUrl = safeHttpUrl(articleData.image_url);
    const description = articleData.excerpt || String(articleData.content || '').replace(/\s+/g, ' ').slice(0, 160);
    const canonical = `${location.origin}/article/${encodeURIComponent(articleData.id)}`;

    document.title = `${articleData.title} | تک‌پالس`;
    setMeta('description', description);
    setMeta('og:title', articleData.title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', 'article', 'property');
    setMeta('og:url', canonical, 'property');
    setMeta('article:published_time', articleData.created_at, 'property');
    setMeta('article:section', articleData.category, 'property');
    if (imageUrl) setMeta('og:image', imageUrl, 'property');
    setMeta('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', articleData.title);
    setMeta('twitter:description', description);
    if (imageUrl) setMeta('twitter:image', imageUrl);
    setCanonical(canonical);
    setJsonLd({
      '@context': 'https://schema.org', '@type': 'NewsArticle',
      headline: articleData.title, description, datePublished: articleData.created_at,
      dateModified: articleData.created_at, image: imageUrl ? [imageUrl] : undefined,
      articleSection: articleData.category, mainEntityOfPage: canonical,
      author: { '@type': 'Organization', name: 'تک‌پالس' },
      publisher: { '@type': 'Organization', name: 'تک‌پالس', url: location.origin }
    });

    const hero = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(articleData.title)}" width="1440" height="720" fetchpriority="high" decoding="async">`
      : '<div class="media-empty" aria-hidden="true">تک‌پالس</div>';
    const relatedHtml = related.length
      ? `<section class="related" aria-labelledby="relatedTitle"><div class="section-head"><h2 id="relatedTitle">خبرهای مرتبط</h2></div><div class="grid cols-3">${related.map(card).join('')}</div></section>`
      : '';

    root.innerHTML = `<article class="article"><div class="container">
      <div class="article-hero">${hero}</div>
      <span class="badge">${escapeHtml(articleData.category)}</span>
      <h1>${escapeHtml(articleData.title)}</h1>
      <div class="meta"><span>${dateFa(articleData.created_at)}</span><span>${Number(articleData.reading_time) || 1} دقیقه مطالعه</span>${articleData.source ? `<span>${escapeHtml(articleData.source)}</span>` : ''}</div>
      ${description ? `<p class="article-lead">${escapeHtml(description)}</p>` : ''}
      <div class="actions" aria-label="اشتراک‌گذاری خبر">
        <button class="btn" data-share="telegram" type="button">تلگرام</button><button class="btn" data-share="whatsapp" type="button">واتساپ</button><button class="btn" data-share="facebook" type="button">فیسبوک</button><button class="btn" data-share="copy" type="button">کپی لینک</button>${navigator.share ? '<button class="btn primary" data-share="native" type="button">اشتراک‌گذاری</button>' : ''}
      </div>
      <div class="article-body">${renderArticleBody(articleData.content)}</div>
      ${sourceUrl ? `<div class="source-note"><a class="btn ghost" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">منبع اصلی</a></div>` : ''}
      ${relatedHtml}
      <div class="telegram-band" data-telegram-area><div><strong>نبض خبر را از دست ندهید.</strong><div class="excerpt" data-telegram-note>خبرهای مهم را مستقیم در تلگرام دریافت کنید.</div></div><a class="btn primary" data-telegram target="_blank" rel="noopener noreferrer">عضویت در تلگرام</a></div>
    </div></article>`;
    configureTelegram(root);

    root.querySelectorAll('[data-share]').forEach((button) => button.addEventListener('click', async () => {
      const original = button.textContent;
      const message = await shareArticle(button.dataset.share, articleData.title);
      if (message) { button.textContent = message; setTimeout(() => { button.textContent = original; }, 1600); }
    }));

    const progress = $('.progress');
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progress.style.width = `${height > 0 ? Math.min(100, Math.max(0, window.scrollY / height * 100)) : 0}%`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
  } catch (error) {
    root.innerHTML = `<div class="container article">${emptyState(error.message)}</div>`;
  }
}

async function category() {
  wireCommon();
  const name = new URLSearchParams(location.search).get('name') || 'هوش مصنوعی';
  const title = $('#catTitle');
  const grid = $('#catGrid');
  const loadMore = $('#loadMore');
  const count = $('#catCount');
  if (!CATEGORIES.includes(name)) {
    title.textContent = 'دسته‌بندی نامعتبر';
    grid.innerHTML = emptyState('این دسته‌بندی وجود ندارد.');
    loadMore.hidden = true;
    return;
  }

  title.textContent = name;
  document.title = `${name} | تک‌پالس`;
  setMeta('description', `آخرین خبرهای ${name} در تک‌پالس؛ پوشش دقیق و کوتاه به زبان فارسی و دری.`);
  setCanonical(`${location.origin}/category/${encodeURIComponent(name)}`);
  let offset = 0;
  let loading = false;

  const load = async () => {
    if (loading) return;
    loading = true;
    loadMore.disabled = true;
    if (offset === 0) grid.innerHTML = skeletonCards(6);
    try {
      const response = await api(`/api/articles?limit=12&offset=${offset}&category=${encodeURIComponent(name)}`);
      if (offset === 0) grid.innerHTML = '';
      grid.insertAdjacentHTML('beforeend', response.items.map(card).join(''));
      offset += response.items.length;
      count.textContent = `${offset.toLocaleString('fa-IR')} از ${response.total.toLocaleString('fa-IR')} خبر`;
      if (!response.items.length && offset === 0) grid.innerHTML = emptyState('خبری در این دسته‌بندی منتشر نشده است.');
      loadMore.hidden = offset >= response.total;
    } catch (error) {
      if (offset === 0) grid.innerHTML = emptyState(error.message, true);
      $('[data-retry]', grid)?.addEventListener('click', load, { once: true });
    } finally {
      loading = false;
      loadMore.disabled = false;
    }
  };
  loadMore.addEventListener('click', load);
  await load();
}

async function searchPage() {
  wireCommon();
  const input = $('#searchInput');
  const grid = $('#searchGrid');
  const meta = $('#searchMeta');
  input.value = new URLSearchParams(location.search).get('q') || '';
  grid.innerHTML = skeletonCards(6);
  try {
    const all = [];
    let offset = 0;
    while (all.length < 1000) {
      const response = await api(`/api/articles?limit=50&offset=${offset}`);
      all.push(...response.items);
      offset += response.items.length;
      if (!response.items.length || offset >= response.total) break;
    }

    const render = () => {
      const q = normalizeFa(input.value);
      const terms = q.split(' ').filter(Boolean);
      const items = q ? all.filter((item) => {
        const haystack = normalizeFa(`${item.title} ${item.excerpt} ${item.source} ${item.category}`);
        return terms.every((term) => haystack.includes(term));
      }) : all.slice(0, 24);
      grid.innerHTML = items.length ? items.map(card).join('') : emptyState('نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کنید.');
      meta.textContent = q ? `${items.length.toLocaleString('fa-IR')} نتیجه برای «${input.value.trim()}»` : `${all.length.toLocaleString('fa-IR')} خبر اخیر آماده جستجو است.`;
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    };
    input.addEventListener('input', render);
    render();
  } catch (error) {
    grid.innerHTML = emptyState(error.message);
  }
}

function contact() {
  wireCommon();
  const form = $('#contactForm');
  const status = $('#contactStatus');
  const button = $('#contactSubmit');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    status.className = 'status excerpt';
    status.textContent = 'در حال ارسال…';
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: $('#name').value, message: $('#message').value, website: $('#website').value }) });
      form.reset();
      status.classList.add('success');
      status.textContent = 'پیام شما با موفقیت ثبت شد.';
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

const page = document.body.dataset.page;
if (page === 'about' || page === 'not-found') wireCommon();
else ({ home, article, category, search: searchPage, contact }[page]?.());
