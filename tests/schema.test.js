const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('browser assets contain no Supabase credentials or SDK setup', () => {
  const files = [
    'public/assets/js/app.js',
    ...fs.readdirSync(path.join(root, 'public')).filter((name) => name.endsWith('.html')).map((name) => `public/${name}`)
  ];
  const source = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /SUPABASE_(?:URL|SERVICE_ROLE_KEY|SECRET_KEY)|createClient\s*\(/);
});

test('SQL enables RLS and grants no public write access', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8').toLowerCase();
  assert.match(sql, /alter table public\.articles enable row level security/);
  assert.match(sql, /for select\s+to anon, authenticated\s+using \(true\)/);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all).*to anon/);
});

test('required categories remain aligned between API and schema', () => {
  const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'api/articles.js'), 'utf8');
  for (const category of ['هوش مصنوعی', 'تکنولوژی', 'علم', 'کسب‌وکار']) {
    assert.ok(schema.includes(category));
    assert.ok(api.includes(category));
  }
});
