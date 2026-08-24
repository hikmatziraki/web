const $ = (selector, root = document) => root.querySelector(selector);

const TELEGRAM_URL = 'https://t.me/your_channel';

const api = async (path, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
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
    if (!response.ok) throw new Error(data.error || 'خطای نامشخص');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('زمان پاسخ‌گویی تمام شد. دوباره تلاش کنید.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const normalizeFa = (value) => String(value ?? '')
  .toLocaleLowerCase('fa-IR')
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\u200c/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const dateFa = (value) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return 'تاریخ نامشخص';
  }
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const safeHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ''), location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const setMeta = (name, content, attribute = 'name') => {
  if (!content) return;
  let element = document.head.querySelector(`meta[${attribute}="${CSS.escape(name)}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(content).slice(0, 320));
};

const setCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

const jsonLd = (value) => {
  let element = $('#articleSchema');
  if (!element) {
    element = document.createElement('script');
    element.id = 'articleSchema';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value);
};

const telegramHref = () => TELEGRAM_URL && !TELEGRAM_URL.includes('your_channel') ? TELEGRAM_URL : '';

const wireCommon = () => {
  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  const searchButton = $('#headerSearch');
  searchButton?.addEventListener('click', () => { location.href = '/search.html'; });

  const navToggle = $('#navToggle');
  const nav = $('#primaryNav');
  navToggle?.addEventListener('click', () => {
    const open = nav?.dataset.open === 'true';
    nav?.setAttribute('data-open', String(!open));
    navToggle.setAttribute('aria-expanded', String(!open));
    document.body.classList.toggle('is-locked', !open);
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.setAttribute('data-open', 'false');
    navToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }));

  document.querySelectorAll('[data-telegram]').forEach((link) => {
    const href = telegramHref();
    if (href) {
      link.href = href;
    } else {
      link.href = '#telegram-unavailable';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const note = link.closest('[data-telegram-area]')?.querySelector('[data-telegram-note]');
        if (note) note.textContent = 'لینک کانال تلگرام پس از آماده‌شدن کانال در اینجا فعال می‌شود.';
      });
    }
  });
};

const card = (article) => {
  const imageUrl = safeHttpUrl(article.image_url);
  const image = imageUrl
    ? `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.title)}" width="640" height="400">`
    : '<div class="media-empty" aria-hidden="true">تصویر ندارد</div>';

  return `<article class="card">
    <a href="/article/${encodeURIComponent(article.id)}" aria-label="${escapeHtml(article.title)}">
      <div class="card-media">${image}</div>
      <div class="card-body">
        <span class="badge">${escapeHtml(article.category)}</span>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="meta">
          <span>${dateFa(article.created_at)}</span>
          <span>${Number(article.reading_time) || 1} دقیقه مطالعه</span>
          ${article.source ? `<span>${escapeHtml(article.source)}</span>` : ''}
        </div>
      </div>
    </a>
  </article>`;
};

const emptyState = (message) => `<div class="state" role="status">${escapeHtml(message)}</div>`;
const skeletonCards = (count = 3) => Array.from({ length: count }, () => '<div class="skeleton skeleton-card" aria-hidden="true"></div>').join('');

async function home() {
  wireCommon();
  const featured = $('#featured');
  const latest = $('#latest');

  try {
    const { items } = await api('/api/articles?limit=13');
    if (!items.length) {
      featured.classList.remove('skeleton');
      featured.innerHTML = emptyState('هنوز خبری منتشر نشده است.');
      latest.innerHTML = '';
      return;
    }

    const first = items[0];
    const imageUrl = safeHttpUrl(first.image_url);
    const image = imageUrl
      ? `<img loading="eager" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(first.title)}" width="1280" height="720">`
      : '<div class="media-empty" aria-hidden="true">تصویر ندارد</div>';

    featured.classList.remove('skeleton');
    featured.innerHTML = `<a href="/article/${encodeURIComponent(first.id)}">
      <div class="featured-media">${image}</div>
      <div class="card-body">
        <span class="badge">${escapeHtml(first.category)}</span>
        <h2>${escapeHtml(first.title)}</h2>
        <p class="excerpt">${escapeHtml(first.excerpt)}</p>
        <div class="meta">
          <span>${dateFa(first.created_at)}</span>
          <span>${Number(first.reading_time) || 1} دقیقه مطالعه</span>
          ${first.source ? `<span>${escapeHtml(first.source)}</span>` : ''}
        </div>
      </div>
    </a>`;

    latest.innerHTML = items.slice(1).map(card).join('');
  } catch (error) {
    featured.classList.remove('skeleton');
    featured.innerHTML = emptyState(error.message);
    latest.innerHTML = '';
  }
}

const renderArticleBody = (content) => {
  const lines = String(content || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let html = '';
  let inList = false;

  for (const line of lines) {
    const bullet = line.startsWith('•');
    if (bullet && !inList) {
      html += '<ul>';
      inList = true;
    }
    if (!bullet && inList) {
      html += '</ul>';
      inList = false;
    }
    html += bullet
      ? `<li>${escapeHtml(line.slice(1).trim())}</li>`
      : `<p>${escapeHtml(line)}</p>`;
  }

  if (inList) html += '</ul>';
  return html || '<p>متن این خبر در دسترس نیست.</p>';
};

const share = async (type, title) => {
  const url = location.href;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  };

  if (type === 'copy') {
    try {
      await navigator.clipboard.writeText(url);
      return 'کپی شد';
    } catch {
      window.prompt('لینک خبر را کپی کنید:', url);
      return 'لینک آماده است';
    }
  }

  if (type === 'share' && navigator.share) {
    try { await navigator.share({ title, url }); } catch {}
    return '';
  }

  if (links[type]) window.open(links[type], '_blank', 'noopener,noreferrer');
  return '';
};

async function article() {
  wireCommon();
  const root = $('#articleRoot');
  const id = new URLSearchParams(location.search).get('id');

  if (!id || !/^\d+$/.test(id)) {
    root.innerHTML = emptyState('شناسه خبر نامعتبر است.');
    return;
  }

  try {
    const articleData = await api(`/api/articles/${encodeURIComponent(id)}`);
    const relatedResponse = await api(`/api/articles?limit=8&category=${encodeURIComponent(articleData.category)}`);
    const related = relatedResponse.items.filter((item) => String(item.id) !== String(articleData.id)).slice(0, 3);
    const sourceUrl = safeHttpUrl(articleData.url);
    const heroImageUrl = safeHttpUrl(articleData.image_url);
    const description = articleData.excerpt || String(articleData.content || '').replace(/\s+/g, ' ').slice(0, 160);

    document.title = `${articleData.title} | تک‌پالس`;
    setMeta('description', description);
    setMeta('og:title', articleData.title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', 'article', 'property');
    setMeta('og:url', location.href, 'property');
    if (heroImageUrl) setMeta('og:image', heroImageUrl, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', articleData.title);
    setMeta('twitter:description', description);
    if (heroImageUrl) setMeta('twitter:image', heroImageUrl);
    setCanonical(location.href);

    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: articleData.title,
      datePublished: articleData.created_at,
      image: heroImageUrl ? [heroImageUrl] : [],
      articleSection: articleData.category,
      description,
      mainEntityOfPage: location.href,
      author: { '@type': 'Organization', name: 'تک‌پالس' },
      publisher: { '@type': 'Organization', name: 'تک‌پالس' }
    });

    const heroImage = heroImageUrl
      ? `<img src="${escapeHtml(heroImageUrl)}" alt="${escapeHtml(articleData.title)}" width="1440" height="720">`
      : '<div class="media-empty" aria-hidden="true">تصویر ندارد</div>';

    const relatedHtml = related.length
      ? `<section class="related" aria-labelledby="relatedTitle"><div class="section-head"><h2 id="relatedTitle">خبرهای مرتبط</h2></div><div class="grid cols-3">${related.map(card).join('')}</div></section>`
      : '';

    const telegram = telegramHref();
    root.innerHTML = `<article class="article">
      <div class="container">
        <div class="article-hero">${heroImage}</div>
        <span class="badge">${escapeHtml(articleData.category)}</span>
        <h1>${escapeHtml(articleData.title)}</h1>
        <div class="meta">
          <span>${dateFa(articleData.created_at)}</span>
          <span>${Number(articleData.reading_time) || 1} دقیقه مطالعه</span>
          ${articleData.source ? `<span>${escapeHtml(articleData.source)}</span>` : ''}
        </div>
        <div class="actions" aria-label="اشتراک‌گذاری">
          <button class="btn" data-share="telegram" type="button">تلگرام</button>
          <button class="btn" data-share="whatsapp" type="button">واتساپ</button>
          <button class="btn" data-share="facebook" type="button">فیسبوک</button>
          <button class="btn" data-share="copy" type="button">کپی لینک</button>
          ${navigator.share ? '<button class="btn primary" data-share="share" type="button">اشتراک‌گذاری</button>' : ''}
        </div>
        <div class="article-body">${renderArticleBody(articleData.content)}</div>
        ${sourceUrl ? `<div class="source-note"><a class="btn" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">منبع اصلی</a></div>` : ''}
        ${relatedHtml}
        <div class="telegram-band" data-telegram-area>
          <div><strong>نبض خبر را از دست ندهید.</strong><div class="excerpt" data-telegram-note>${telegram ? 'خبرهای مهم تک‌پالس را مستقیم در تلگرام دریافت کنید.' : 'لینک کانال تلگرام هنوز تنظیم نشده است.'}</div></div>
          <a class="btn primary" data-telegram target="_blank" rel="noopener noreferrer">عضویت در تلگرام</a>
        </div>
      </div>
    </article>`;

    root.querySelectorAll('[data-share]').forEach((button) => {
      button.addEventListener('click', async () => {
        const message = await share(button.dataset.share, articleData.title);
        if (message) {
          const original = button.textContent;
          button.textContent = message;
          setTimeout(() => { button.textContent = original; }, 1600);
        }
      });
    });

    const progress = $('.progress');
    const updateProgress = () => {
      const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progress.style.width = `${documentHeight ? (window.scrollY / documentHeight) * 100 : 0}%`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
  } catch (error) {
    root.innerHTML = emptyState(error.message);
  }
}

async function category() {
  wireCommon();
  const params = new URLSearchParams(location.search);
  const name = params.get('name') || 'هوش مصنوعی';
  const title = $('#catTitle');
  const grid = $('#catGrid');
  const loadMore = $('#loadMore');
  const count = $('#catCount');
  let offset = 0;
  let total = 0;

  title.textContent = name;
  document.title = `${name} | تک‌پالس`;

  const load = async () => {
    loadMore.disabled = true;
    if (offset === 0) grid.innerHTML = skeletonCards(6);

    try {
      const response = await api(`/api/articles?limit=12&offset=${offset}&category=${encodeURIComponent(name)}`);
      total = response.total;
      if (offset === 0) grid.innerHTML = '';
      grid.insertAdjacentHTML('beforeend', response.items.map(card).join(''));

      offset += response.items.length;
      count.textContent = `${offset.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')} خبر`;
      if (!response.items.length && offset === 0) grid.innerHTML = emptyState('خبری در این دسته‌بندی نیست.');
      loadMore.style.display = offset < total ? 'inline-flex' : 'none';
    } catch (error) {
      if (offset === 0) grid.innerHTML = emptyState(error.message);
      else grid.insertAdjacentHTML('beforeend', emptyState(error.message));
      loadMore.style.display = 'none';
    } finally {
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
  const initial = new URLSearchParams(location.search).get('q') || '';
  input.value = initial;

  try {
    const all = [];
    let offset = 0;
    const pageSize = 100;
    while (all.length < 1000) {
      const response = await api(`/api/articles?limit=${pageSize}&offset=${offset}`);
      all.push(...response.items);
      offset += response.items.length;
      if (!response.items.length || offset >= response.total) break;
    }

    const render = () => {
      const q = normalizeFa(input.value);
      const items = q
        ? all.filter((articleData) => normalizeFa(`${articleData.title} ${articleData.excerpt}`).includes(q))
        : all.slice(0, 24);

      grid.innerHTML = items.length ? items.map(card).join('') : emptyState('نتیجه‌ای پیدا نشد.');
      meta.textContent = q
        ? `${items.length.toLocaleString('fa-IR')} نتیجه`
        : `${all.length.toLocaleString('fa-IR')} خبر اخیر آماده جستجو است.`;
      const url = new URL(location.href);
      if (q) url.searchParams.set('q', input.value); else url.searchParams.delete('q');
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
    status.textContent = 'در حال ارسال...';

    try {
      await api('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: $('#name').value,
          message: $('#message').value,
          website: $('#website').value
        })
      });
      form.reset();
      status.textContent = 'پیام شما با موفقیت ثبت شد.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

const page = document.body.dataset.page;
({ home, article, category, search: searchPage, contact }[page]?.());
