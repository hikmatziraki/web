# تک‌پالس | TechPulse

یک رسانه خبری مینیمال و حرفه‌ای برای اخبار هوش مصنوعی و تکنولوژی به زبان فارسی/دری.

## معماری
- Frontend: HTML/CSS/JS ساده و کاملاً RTL
- API: Vercel Serverless Functions (Node.js)
- Data: Supabase
- هیچ کلید Supabase در مرورگر قرار نمی‌گیرد.

## متغیرهای Vercel
`SUPABASE_URL`، `SUPABASE_SERVICE_ROLE_KEY`، `API_SECRET`

## Deploy
1. پروژه Supabase را بسازید و `supabase/schema.sql` را اجرا کنید.
2. ریپو را در Vercel Import کنید.
3. سه Environment Variable بالا را در Production/Preview/Development تنظیم کنید.
4. Deploy را اجرا کنید.

## Bot ingestion
`POST /api/create` با هدر `X-API-Secret` و بدنه JSON:
`{title, content, url, image_url, source, category}`
