# تک‌پالس (TechPulse)

رسانه خبری فارسی/دری با HTML/CSS/JS ساده، Vercel Serverless Functions و Supabase.

## معماری

- Frontend: `public/`
- API: `api/`
- Database schema: `supabase/schema.sql`
- هیچ کلید Supabase در کد مرورگر وجود ندارد.
- Backend از `SUPABASE_SECRET_KEY` (ترجیحی) یا `SUPABASE_SERVICE_ROLE_KEY` استفاده می‌کند.
- `POST /api/create` با `X-API-Secret` محافظت می‌شود.
- `POST /api/contact` فقط از same-origin پذیرفته می‌شود و rate-limit پایه دارد.
- `robots.txt` و `sitemap.xml` به‌صورت serverless تولید می‌شوند.

## Environment Variables در Vercel

`SUPABASE_URL`
`SUPABASE_SERVICE_ROLE_KEY`
`API_SECRET`

برای Supabase جدید، می‌توان به‌جای `SUPABASE_SERVICE_ROLE_KEY` از `SUPABASE_SECRET_KEY` استفاده کرد.

## Deploy

1. در Supabase پروژه را بسازید و `supabase/schema.sql` را اجرا کنید.
2. Repository را در Vercel import کنید.
3. Environment Variables را فقط در Vercel اضافه کنید.
4. Build Command را خالی بگذارید؛ پروژه بدون framework build می‌شود.
5. Deploy کنید.

## مسیرهای اصلی

- `/`
- `/article/:id`
- `/category/:name`
- `/search.html?q=...`
- `/about.html`
- `/contact.html`
- `/robots.txt`
- `/sitemap.xml`
