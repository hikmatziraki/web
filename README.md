# تک‌پالس (TechPulse)

وب‌سایت خبری production-ready فارسی/دری با HTML، CSS و JavaScript ساده، Vercel Serverless Functions و Supabase.

## معماری و امنیت

- رابط کاربری استاتیک در `public/`؛ بدون فریم‌ورک و بدون build step
- API فقط در `api/` و روی Vercel Functions
- Supabase تنها لایه داده است
- هیچ کلید یا URL مربوط به Supabase وارد کد مرورگر نمی‌شود
- خواندن خبرها نیز از API هم‌دامنه (`/api/articles`) انجام می‌شود
- ثبت خبر با `X-API-Secret` و مقایسه timing-safe محافظت شده است
- RLS: خواندن عمومی مقاله‌ها، بدون نوشتن عمومی؛ پیام‌های تماس کاملاً خصوصی
- CSP و دیگر هدرهای امنیتی در `vercel.json`

## ساخت پروژه Supabase

1. وارد [Supabase Dashboard](https://supabase.com/dashboard) شوید و **New project** را بزنید.
2. Organization، نام پروژه (مثلاً `techpulse-production`)، رمز قوی دیتابیس و Region نزدیک کاربران را انتخاب کنید.
3. پس از آماده‌شدن پروژه، از **SQL Editor → New query** محتوای کامل `supabase/schema.sql` را اجرا کنید.
4. از **Project Settings → API** این دو مقدار را بردارید:
   - Project URL برای `SUPABASE_URL`
   - Secret key جدید (`sb_secret_...`) برای `SUPABASE_SECRET_KEY`، یا service role key قدیمی برای `SUPABASE_SERVICE_ROLE_KEY`
5. این کلیدها را هرگز در GitHub، فایل‌های `public/` یا متغیرهایی با پیشوند `NEXT_PUBLIC`/`VITE` نگذارید.

> ساخت خودکار یک پروژه Supabase از داخل repository بدون دسترسی حساب Supabase ممکن نیست. Schema آماده است و تنها مرحله دستی، ساخت پروژه و اجرای فایل SQL است.

## متغیرهای محیطی Vercel

در Vercel به **Project Settings → Environment Variables** بروید و برای Production، Preview و Development تنظیم کنید:

| نام | اجباری | توضیح |
|---|---:|---|
| `SUPABASE_URL` | بله | URL پروژه Supabase |
| `SUPABASE_SECRET_KEY` | یکی از دو کلید | Secret key جدید و فقط سرور |
| `SUPABASE_SERVICE_ROLE_KEY` | یکی از دو کلید | جایگزین برای پروژه‌های قدیمی |
| `API_SECRET` | بله | رشته تصادفی حداقل ۳۲ بایت |
| `TELEGRAM_URL` | خیر | مانند `https://t.me/your_channel` |

ساخت secret امن:

```bash
openssl rand -hex 32
```

## استقرار از GitHub روی Vercel

1. این repository را در GitHub نگه دارید.
2. در [Vercel](https://vercel.com/new)، **Import Git Repository** را انتخاب کنید.
3. repository را انتخاب کنید؛ Framework Preset را **Other** بگذارید.
4. Build Command را خالی بگذارید. Output Directory توسط `vercel.json` روی `public` تنظیم شده است.
5. متغیرهای بالا را اضافه و Deploy کنید.
6. پس از Deploy این مسیرها را بررسی کنید: `/`، `/api/articles`، `/robots.txt` و `/sitemap.xml`.
7. برای دامنه اختصاصی، آن را در **Settings → Domains** اضافه کنید؛ canonicalهای داینامیک از دامنه جاری ساخته می‌شوند.

هر push بعدی به branch متصل، استقرار تازه‌ای در Vercel ایجاد می‌کند.

## ثبت خبر از ربات

```bash
curl -X POST 'https://YOUR-DOMAIN/api/create' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Secret: YOUR_API_SECRET' \
  --data '{
    "title": "عنوان خبر",
    "content": "پاراگراف نخست.\n\n• نکته اول\n• نکته دوم",
    "url": "https://example.com/original-story",
    "image_url": "https://example.com/image.jpg",
    "source": "TechCrunch AI",
    "category": "هوش مصنوعی"
  }'
```

پاسخ موفق: `{"id": 1}`. مقدار `url` یکتا است و ارسال دوباره همان خبر، وضعیت 409 می‌دهد.

## API

- `GET /api/articles?limit=12&offset=0&category=هوش%20مصنوعی`
- `GET /api/articles/:id`
- `POST /api/create`
- `POST /api/contact`
- `GET /api/config` (فقط تنظیم عمومی تلگرام؛ بدون secret)

## توسعه و کنترل کیفیت

```bash
npm ci
npm run check
npm test
```

برای اجرای کامل Functions در محیط محلی می‌توانید Vercel CLI را نصب و `vercel dev` اجرا کنید. مقادیر واقعی را فقط در `.env` محلی قرار دهید؛ این فایل توسط Git نادیده گرفته می‌شود.

## مسیرهای رابط کاربری

- `/`
- `/article/:id` (همچنین `/article.html?id=...`)
- `/category/:name`
- `/search?q=...`
- `/about`
- `/contact`
- `/robots.txt`
- `/sitemap.xml`
