import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const themePath = path.join(project, 'theme.css');
const theme = fs.readFileSync(themePath, 'utf8');

const imports = [...theme.matchAll(/@import\s+url\(["']?([^"')]+)["']?\)\s*;/g)].map(m => m[1]);
if (imports.length !== 12) throw new Error(`theme.css doit avoir 12 imports, trouvé ${imports.length}`);

const files = [themePath];
for (const ref of imports) {
  const clean = ref.split('?')[0];
  if (/^https?:/i.test(clean)) throw new Error(`Import externe interdit en full theme: ${ref}`);
  const target = path.resolve(path.dirname(themePath), clean);
  if (!fs.existsSync(target)) throw new Error(`Import CSS introuvable: ${ref}`);
  files.push(target);
}

function stripCssNoise(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

for (const file of files) {
  const source = stripCssNoise(fs.readFileSync(file, 'utf8'));
  let depth = 0;
  for (const ch of source) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) throw new Error(`Accolade fermante excédentaire: ${path.basename(file)}`);
  }
  if (depth !== 0) throw new Error(`Accolades non équilibrées: ${path.basename(file)} (${depth})`);
}

const legacyCinema = fs.existsSync(path.join(project, 'jellyfin12_cinema_fr.css'))
  ? fs.readFileSync(path.join(project, 'jellyfin12_cinema_fr.css'), 'utf8')
  : '';
if (legacyCinema && theme.includes('jellyfin12_cinema_fr.css')) {
  throw new Error('Le CSS cinéma historique ne doit pas être importé globalement');
}

console.log(`CSS valide: ${files.length} fichiers locaux, imports présents, accolades équilibrées, aucun thème externe.`);
