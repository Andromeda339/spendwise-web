// Замінює відповіді 500 з error.message на загальне повідомлення (технічні подробиці лишаються лише в логах).
// Запуск з папки server:  node scripts/harden-errors.mjs
import fs from 'node:fs';

const dir = new URL('../src/controllers/', import.meta.url);
const pattern = /res\.status\(500\)\.json\(\{\s*error:\s*error\.message\s*\}\);/g;
const replacement = "console.error(error);\n    res.status(500).json({ error: 'Внутрішня помилка сервера' });";

let total = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js')) continue;
  const path = new URL(file, dir);
  let count = 0;
  const result = fs.readFileSync(path, 'utf8').replace(pattern, () => { count += 1; return replacement; });
  if (count) {
    fs.writeFileSync(path, result);
    console.log(`${file}: замінено ${count}`);
    total += count;
  }
}
console.log(`Усього замін: ${total}`);
