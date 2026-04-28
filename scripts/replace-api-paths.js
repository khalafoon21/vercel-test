const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name));
const files = walk(path.join(root, 'frontend')).filter((file) => file.endsWith('.html') || file.endsWith('.js'));
const patterns = [
  { re: /const API_URL = 'http:\/\/127\.0\.0\.1:3000\/api';/g, to: "const API_URL = '/api';" },
  { re: /const BASE_SERVER = 'http:\/\/127\.0\.0\.1:3000';/g, to: 'const BASE_SERVER = window.location.origin;' },
  { re: /const BASE_SERVER = \['localhost', '127\.0\.0\.1'\]\.includes\(window\.location\.hostname\) \? 'http:\/\/127\.0\.0\.1:3000' : 'https:\/\/api\.yourdomain\.com';/g, to: "const BASE_SERVER = window.location.origin;\n        const API_URL = '/api';" },
  { re: /return \/\^https\?:\\/\\/i\.test\(clean\) \? clean : `http:\/\/127\.0\.0\.1:3000\$\{clean\.startsWith\('\/'\) \? clean : '\/' \+ clean\}`;/g, to: "return /^https?:\\/\\/i.test(clean) ? clean : `${window.location.origin}${clean.startsWith('/') ? clean : '/' + clean}`;" },
  { re: /fetch\('http:\/\/127\.0\.0\.1:3000\/api\/profile',/g, to: "fetch('/api/profile'," },
  { re: /fetch\('http:\/\/127\.0\.0\.1:3000\/api\/cart',/g, to: "fetch('/api/cart'," },
];
let total = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const pattern of patterns) {
    content = content.replace(pattern.re, pattern.to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('updated', path.relative(root, file));
    total += 1;
  }
}
console.log('total', total);
