import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./noctafin-config.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'noctafin-config.js' });
const cfg = sandbox.window.NOCTAFIN_CONFIG;
if (!cfg) throw new Error('NOCTAFIN_CONFIG absent');

const preferredStudios = new Map([
  ['PIXAR', 'Pixar'],
  ['MARVEL', 'Marvel Studios'],
  ['WALT DISNEY', 'Walt Disney Pictures'],
  ['20TH CENTURY FOX', '20th Century Fox'],
  ['COLUMBIA', 'Columbia Pictures'],
  ['PARAMOUNT', 'Paramount Pictures'],
  ['DREAMWORKS', 'DreamWorks Animation']
]);

const groups = [...(cfg.studios || []), ...(cfg.networks || [])];
const featured = ['Apple TV+', 'Prime Video', 'hulu', 'NETFLIX', 'HBO MAX', 'Disney+', 'PIXAR'];
if (JSON.stringify(cfg.networks.slice(0, 7).map((group) => group.label)) !== JSON.stringify(featured)) {
  throw new Error('Ordre des sept jaquettes de référence incorrect');
}
for (const group of cfg.networks.slice(0, 7)) {
  const file = group.logo?.replace('ui/noctafin-assets/', 'assets/');
  if (!file || !fs.existsSync(new URL(`../${file}`, import.meta.url))) throw new Error(`Logo local manquant: ${group.label}`);
}
for (const group of groups) {
  if ('id' in group) throw new Error(`ID de bibliothèque en dur pour ${group.label}`);
  if (!Array.isArray(group.aliases) || !group.aliases.length) throw new Error(`Noms de studio absents: ${group.label}`);
}
for (const [label, name] of preferredStudios) {
  const group = cfg.studios.find((entry) => entry.label === label);
  if (!group || group.aliases[0] !== name) throw new Error(`Nom de studio prioritaire incorrect: ${label}`);
  const file = group.logo?.replace('ui/noctafin-assets/', 'assets/');
  if (!file || !fs.existsSync(new URL(`../${file}`, import.meta.url))) throw new Error(`Logo studio local manquant: ${label}`);
}

if (cfg.background?.image !== '') throw new Error('Le fond normal doit utiliser les reflets CSS sur noir');
if ('video' in (cfg.background || {})) throw new Error('Le fond vidéo doit rester supprimé en v1.11+');

const themeRoot = new URL('../', import.meta.url);
for (const relative of [
  'assets/background/lumo-space.webp',
  'assets/seasonal/lumo-blue.webp',
  'assets/seasonal/lumo-halloween.webp',
  'assets/seasonal/lumo-christmas.webp',
  'assets/seasonal/background-halloween.webp',
  'assets/seasonal/background-christmas.webp'
]) {
  if (!fs.existsSync(new URL(relative, themeRoot))) throw new Error(`Asset manquant: ${relative}`);
}

const runtimeSource = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');
const rowFields = runtimeSource.slice(runtimeSource.indexOf('const FIELDS = ['), runtimeSource.indexOf('].join(",");', runtimeSource.indexOf('const FIELDS = [')));
if (rowFields.includes('"People"') || rowFields.includes('"OriginalTitle"')) {
  throw new Error('Les métadonnées des acteurs ne doivent pas alourdir les requêtes des rails');
}
if (!runtimeSource.includes('Fields: `${FIELDS},People,OriginalTitle`')) {
  throw new Error('La fiche doit demander les acteurs et le titre original');
}
for (const needle of ['findTaxonomyHost', 'scheduleTaxonomyRetry', 'lumo-taxonomy-hero', 'GenreIds', 'StudioIds', 'syncDetailPage', 'buildMovieDetailPage', 'buildSeriesDetailPage', 'fetchSeriesSeasons', 'fetchSeasonEpisodes', 'playItemRobust', 'resolvePlaybackManager', 'triggerNativeDetailPlayback', 'fetchSeriesResumeEpisode', 'buildSeriesResumeCard', 'hasActivePlaybackSurface']) {
  if (!runtimeSource.includes(needle)) throw new Error(`Runtime incomplet: ${needle}`);
}

if (Number(cfg.rows?.rowLimit) !== 12) throw new Error('rows.rowLimit doit rester à 12');
if (Number(cfg.rows?.dailyPoolLimit) < 48) throw new Error('rows.dailyPoolLimit doit être >= 48');
if (!cfg.taxonomyHero?.enabled) throw new Error('taxonomyHero doit rester activé');
if (!cfg.details?.enabled) throw new Error('details doit rester activé');
if (Number(cfg.details?.episodePageSize) < 20) throw new Error('details.episodePageSize doit rester >= 20');
if (cfg.navigation?.serverIdFallback) throw new Error('serverIdFallback doit rester vide pour tous les serveurs');
if (!cfg.background?.interactiveNebula) throw new Error('La nébuleuse interactive doit rester activée par défaut');
if (!cfg.rows?.showAnimeRow || !cfg.anime?.aliases?.some((name) => /anime|animé/i.test(name))) {
  throw new Error('La détection de la ligne Anime est incomplète');
}


if (runtimeSource.includes('`#/video?') || runtimeSource.includes('navigate(`/video?')) {
  throw new Error('La lecture ne doit jamais utiliser une route /video synthétique');
}

const playbackCss = new URL('../styles/lumo-v1.12.css', import.meta.url);
if (!fs.existsSync(playbackCss)) throw new Error('styles/lumo-v1.12.css manquant');
const playbackCssSource = fs.readFileSync(playbackCss, 'utf8');
for (const needle of ['.lumo-playback-active #lumo-background-layer', '.lumo-series-resume__card']) {
  if (!playbackCssSource.includes(needle)) throw new Error(`CSS v1.12 incomplet: ${needle}`);
}
if (/(?:videoPlayerContainer|htmlVideoPlayer|videoOsdBottom)\s*\{/.test(playbackCssSource)) {
  throw new Error('Le CSS Lumo ne doit pas imposer la géométrie du lecteur Jellyfin');
}

const themeCss = fs.readFileSync(new URL('../theme.css', import.meta.url), 'utf8');
const expectedThemeImports = [
  'tokens.css?v=1.16.2',
  'core.css?v=1.16.2',
  'header.css?v=1.16.2',
  'home.css?v=1.16.2',
  'details.css?v=1.16.2',
  'player.css?v=1.16.2',
  'responsive.css?v=1.16.2',
  'lumo-v1.10.css?v=1.16.2',
  'lumo-v1.11.css?v=1.16.2',
  'lumo-v1.12.css?v=1.16.2',
  'lumo-v1.13.css?v=1.16.2',
  'lumo-v1.15.css?v=1.16.2',
  'lumo-v1.16.css?v=1.16.2'
];
for (const needle of expectedThemeImports) {
  if (!themeCss.includes(needle)) throw new Error(`Import theme.css manquant: ${needle}`);
}
if (/abyss-jellyfin|jellyfin12_cinema_fr/i.test(themeCss)) {
  throw new Error('theme.css ne doit pas importer un second thème global susceptible de réintroduire des conflits');
}

const detailCss = new URL('../styles/lumo-v1.11.css', import.meta.url);
if (!fs.existsSync(detailCss)) throw new Error('styles/lumo-v1.11.css manquant');
const detailCssSource = fs.readFileSync(detailCss, 'utf8');
for (const needle of ['#lumo-detail-page', '.lumo-movie-detail-hero', '.lumo-series-detail__shell', '.lumo-season-panel']) {
  if (!detailCssSource.includes(needle)) throw new Error(`CSS détail incomplet: ${needle}`);
}

const effectsCss = fs.readFileSync(new URL('../styles/lumo-v1.16.css', import.meta.url), 'utf8');
for (const needle of ['#lumo-nebula-canvas', '#lumo-page-loader', '.lumo-liquid-loader', 'content-visibility: auto']) {
  if (!effectsCss.includes(needle)) throw new Error(`Optimisation visuelle manquante: ${needle}`);
}
for (const needle of ['readRowCache', 'writeRowCache', 'showAnimeRow', 'ensureLiquidLoader', 'startAmbientReflections']) {
  if (!runtimeSource.includes(needle)) throw new Error(`Runtime 1.16 incomplet: ${needle}`);
}

const bootSource = fs.readFileSync(new URL('./noctafin-boot.js', import.meta.url), 'utf8');
const bootCss = fs.readFileSync(new URL('../styles/boot.css', import.meta.url), 'utf8');
for (const needle of ['lumo-transitioning', 'dataset.mode = "startup"', '12000']) {
  if (!bootSource.includes(needle)) throw new Error(`Chargement précoce incomplet: ${needle}`);
}
for (const needle of ['background: #000', '.splashLogo', '.is-done']) {
  if (!bootCss.includes(needle)) throw new Error(`CSS de démarrage incomplet: ${needle}`);
}
for (const needle of ['minimum = loader.dataset.mode === "startup" ? 5000 : 3000', 'elapsed < 9000', 'lumo-logo-title-swap']) {
  if (!runtimeSource.includes(needle)) throw new Error(`Transition visuelle incomplète: ${needle}`);
}

console.log(`Configuration valide: démarrage précoce, transitions, cache de session, Anime, sept logos et ${groups.length} groupes.`);
