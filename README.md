# Vitrin

Marketplace فارسی/دری برای آگهی‌های دیجیتال، آماده‌ی deploy روی Vercel و اتصال به Supabase.

## Deploy

1. Repository را روی GitHub قرار بده.
2. در Vercel پروژه را Import کن.
3. Environment Variables را اضافه کن:
   - `VITRIN_SUPABASE_URL`
   - `VITRIN_SUPABASE_KEY` (publishable/anon key، نه service role)
4. Build Command: `npm run build`
5. Output Directory: `.`

## Supabase

Migration موجود در `supabase/migrations/0001_vitrin_core.sql` schema، RLS، triggerها، view و RPCهای لازم را ایجاد می‌کند.

برای اولین ادمین، بعد از ثبت‌نام حساب موردنظر، در SQL Editor اجرا کن:

```sql
update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
```

سپس صفحه را refresh کن.

## امنیت

هرگز `service_role`/secret key را در Vercel Environment Variables با نامی که به browser expose شود قرار نده. کلید client باید فقط publishable/anon باشد و authorization در RLS/Database enforce شود.
