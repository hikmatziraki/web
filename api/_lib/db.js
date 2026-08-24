const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Server Supabase environment variables are missing');
module.exports = createClient(url, key, { auth: { autoRefreshToken:false, persistSession:false } });
