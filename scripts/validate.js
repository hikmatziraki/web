const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

for (const file of [...walk(path.join(root, 'api')), ...walk(path.join(root, 'public', 'assets', 'js'))].filter((file) => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

for (const file of ['package.json', 'vercel.json', 'public/manifest.webmanifest']) {
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const publicText = walk(path.join(root, 'public')).filter((file) => /\.(html|js|css|json|webmanifest|svg)$/.test(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'sb_secret_', 'service_role'];
for (const token of forbidden) {
  if (publicText.includes(token)) throw new Error(`Server secret marker found in public files: ${token}`);
}

for (const file of fs.readdirSync(path.join(root, 'public')).filter((name) => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, 'public', file), 'utf8');
  for (const required of ['lang="fa"', 'dir="rtl"', '<title>', 'meta name="description"', 'rel="icon"']) {
    if (!html.includes(required)) throw new Error(`${file} is missing ${required}`);
  }
}
console.log('Validation passed.');
