import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const url = process.env.VITRIN_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.VITRIN_SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing VITRIN_SUPABASE_URL and VITRIN_SUPABASE_KEY');

const out = `window.VITRIN_CONFIG=${JSON.stringify({ supabaseUrl: url, supabaseKey: key })};\n`;
fs.mkdirSync(path.join(root, 'js'), { recursive: true });
fs.writeFileSync(path.join(root, 'js/config.js'), out, 'utf8');
console.log('Generated js/config.js');
