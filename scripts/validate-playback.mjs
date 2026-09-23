import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');

const requiredFunctions = [
  'installPlaybackDelegation',
  'bindPlaybackTarget',
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
  'rail',
  'movie-detail',
  'series-detail',
  'series-resume',
  'episode-card'
];
for (const source of entrypoints) {
  if (!runtime.includes(`"${source}"`)) throw new Error(`Point d'entrée playback non câblé: ${source}`);
}

if (!runtime.includes('document.addEventListener("click", async (event) =>')) {
  throw new Error('Le gestionnaire de lecture délégué manque');
}
if (!runtime.includes('}, true);')) throw new Error('Le gestionnaire playback doit être installé en capture');
if (!runtime.includes('[data-id="${id}"][data-action="resume"]') && !runtime.includes('[data-action="resume"]')) {
  throw new Error('Le pont Abyss-style data-id -> action native manque');
}
if (!runtime.includes('fetchDetailItem(id, { fresh: true, timeoutMs: 4500 })')) {
  throw new Error('La cible playback doit être rafraîchie par itemId au clic');
}
if (!runtime.includes('requested.Type !== "Series"')) {
  throw new Error('La résolution explicite Série -> épisode manque');
}
if (!runtime.includes('fetchSeriesResumeEpisode(requested.Id)')) {
  throw new Error('La reprise Série doit être résolue avant lecture');
}
if (!runtime.includes('items: [item]')) {
  throw new Error('PlaybackManager doit recevoir une seule cible concrète');
}
if (!runtime.includes('fallbackNativePlayback(item, epoch)')) {
  throw new Error('Le fallback natif exact manque');
}
if (runtime.includes('navigate(`/video?') || runtime.includes('`#/video?')) {
  throw new Error('Aucune route /video synthétique ne doit subsister');
}

const calls = [...runtime.matchAll(/playItemRobust\s*\(/g)].length;
if (calls !== 2) {
  throw new Error(`playItemRobust doit être appelé uniquement par le délégateur (définition + 1 appel), trouvé: ${calls}`);
}

console.log(`Playback valide: ${entrypoints.length} points d'entrée -> un seul bus itemId -> action native exacte / PlaybackManager / fiche native.`);
