import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');

const requiredFunctions = [
  'installPlaybackDelegation',
  'bindPlaybackTarget',
  'nativeShortcutContainers',
  'createNativeShortcutBridge',
  'triggerSyntheticShortcutPlayback',
  'clickExactNativePlayback',
  'resolvePlaybackTarget',
  'playItemRobust',
  'fallbackNativePlayback',
  'triggerNativeDetailPlayback',
  'waitForPlaybackStart',
  'currentPlaybackItemId'
];

for (const name of requiredFunctions) {
  if (!runtime.includes(`function ${name}`) && !runtime.includes(`async function ${name}`)) {
    throw new Error(`Playback bridge incomplet: ${name}`);
  }
}

const entrypoints = [
  'hero-home',
  'movie-detail',
  'series-detail',
  'series-resume',
  'episode-card'
];

const railCardSource = runtime.slice(runtime.indexOf('function makeCard('), runtime.indexOf('async function previewItemId('));
if (!railCardSource.includes('navigate(`/details?id=${encodeURIComponent(id)}`)') || railCardSource.includes('bindPlaybackTarget(card')) {
  throw new Error('Une carte de rail doit ouvrir la fiche sans lancer le lecteur');
}

for (const source of entrypoints) {
  if (!runtime.includes(`"${source}"`)) throw new Error(`Point d'entrée playback non câblé: ${source}`);
}

const requiredNativeDataset = [
  'button.dataset.id',
  'button.dataset.serverid',
  'button.dataset.type',
  'button.dataset.mediatype',
  'button.dataset.isfolder',
  'button.dataset.action',
  'button.dataset.positionticks'
];
for (const needle of requiredNativeDataset) {
  if (!runtime.includes(needle)) throw new Error(`Pont shortcut incomplet: ${needle}`);
}

if (!runtime.includes('document.addEventListener("click", async (event) =>')) {
  throw new Error('Le gestionnaire de lecture délégué manque');
}
if (!runtime.includes('}, true);')) throw new Error('Le gestionnaire playback doit être installé en capture');
if (!runtime.includes('fetchDetailItem(id, { fresh: true, timeoutMs: 4500 })')) {
  throw new Error('La cible playback doit être rafraîchie par itemId au clic');
}
if (!runtime.includes('requested.Type !== "Series"')) {
  throw new Error('La résolution explicite Série -> épisode manque');
}
if (!runtime.includes('fetchSeriesResumeEpisode(requested.Id)')) {
  throw new Error('La reprise Série doit être résolue avant lecture');
}
if (!runtime.includes('ids: [resolvedId]')) {
  throw new Error('PlaybackManager doit recevoir un id concret, pas une liste d’objets obsolètes');
}
if (!runtime.includes('serverId: item.ServerId || auth?.serverId || undefined')) {
  throw new Error('PlaybackManager doit recevoir le serverId exact');
}
if (runtime.includes('items: [item]')) {
  throw new Error('Le fallback PlaybackManager ne doit plus utiliser items:[item]');
}
if (!runtime.includes('Last user intent wins')) {
  throw new Error('La politique de transaction last-user-intent-wins manque');
}
if (runtime.includes('navigate(`/video?') || runtime.includes('`#/video?')) {
  throw new Error('Aucune route /video synthétique ne doit subsister');
}

const calls = [...runtime.matchAll(/playItemRobust\s*\(/g)].length;
if (calls !== 2) {
  throw new Error(`playItemRobust doit être appelé uniquement par le délégateur (définition + 1 appel), trouvé: ${calls}`);
}

console.log(`Playback valide: cartes vers fiches, ${entrypoints.length} boutons de lecture -> itemId exact -> lecteur natif.`);
