import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./noctafin-config.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'noctafin-config.js' });
const cfg = sandbox.window.NOCTAFIN_CONFIG;
if (!cfg) throw new Error('NOCTAFIN_CONFIG absent');

const expected = new Map([
  ['PIXAR', 'a1384420050b89ea581e04c0dd9a83a8'],
  ['PARAMOUNT', '2672ed34a3f2b0bb6b4257c2ab9875b7'],
  ['MARVEL', '92e087260fb84bbba21ef249122925df'],
  ['WALT DISNEY', 'ff966337d51b0e006da6e16df7cb7ca1'],
  ['COLUMBIA', '3e8c9b438ab4664dc15b8cdbfce57134'],
  ['20TH CENTURY FOX', 'da8c4e8ad6d11fba2241aebbf643bed7'],
  ['Apple TV+', '865e87e3544b4bcd5f1fcd3f7b8358e8'],
  ['NETFLIX', '411cb7d6c12c8bf0d3c1caed22120c6f'],
  ['BBC', 'c39802fd4af78383c08c5ef2056d2ca7'],
  ['CARTOON NETWORK', '05d703671f62d4d6ee1a3636b89add52'],
  ['ABC', '96b48893d56b599270991d22c7a88280'],
  ['MTV', 'ec5ae1b12f4efbf619aa77ca1bcd2d6f']
]);

const groups = [...(cfg.studios || []), ...(cfg.networks || [])];
const ids = new Set();
for (const group of groups) {
  if (!/^[0-9a-f]{32}$/i.test(group.id || '')) throw new Error(`ID invalide pour ${group.label}: ${group.id}`);
  if (ids.has(group.id)) throw new Error(`ID dupliqué: ${group.id}`);
  ids.add(group.id);
  const wanted = expected.get(group.label);
  if (wanted && group.id !== wanted) throw new Error(`ID inattendu pour ${group.label}: ${group.id}`);
}
for (const [label, id] of expected) {
  const group = groups.find((entry) => entry.label === label);
  if (!group) throw new Error(`Groupe requis absent: ${label}`);
  if (group.id !== id) throw new Error(`Mauvais ID pour ${label}`);
}

if (Number(cfg.rows?.rowLimit) !== 12) throw new Error('rows.rowLimit doit rester à 12');
if (Number(cfg.rows?.dailyPoolLimit) < 48) throw new Error('rows.dailyPoolLimit doit être >= 48');
if (!cfg.taxonomyHero?.enabled) throw new Error('taxonomyHero doit rester activé');
if (!cfg.navigation?.serverIdFallback) throw new Error('serverIdFallback absent');

console.log(`Configuration valide: ${groups.length} studios/réseaux exacts, ${cfg.genres?.length || 0} genres accueil, 12 médias/rail.`);
