import fs from 'node:fs';

const home = fs.readFileSync(new URL('../styles/home.css', import.meta.url), 'utf8');
const finalCss = fs.readFileSync(new URL('../styles/lumo-v1.13.css', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('./noctafin-config.js', import.meta.url), 'utf8');

if (home.includes('body.noctafin-browser-open')) {
  throw new Error('Ancien verrou de scroll noctafin-browser-open encore présent');
}
if (!finalCss.includes('--lumo-visible-count: 6')) throw new Error('6 cartes desktop non garanties');
if (!finalCss.includes('overflow-x: hidden !important')) throw new Error('Rail desktop non isolé du wheel');
if (!finalCss.includes('touch-action: pan-y pinch-zoom')) throw new Error('Scroll vertical desktop non prioritaire');
if (!finalCss.includes('@media (hover: none), (pointer: coarse)')) throw new Error('Fallback tactile horizontal manquant');
if (!finalCss.includes('.noctafin-card--poster .noctafin-card__art img')) throw new Error('Règle poster manquante');
if (!finalCss.includes('object-fit: contain !important')) throw new Error('Poster complet non garanti');
if (!runtime.includes('const observer = new MutationObserver((records) =>')) throw new Error('Observer DOM durci manquant');
if (runtime.includes('track.addEventListener("wheel"')) throw new Error('Le rail ne doit pas capter directement la molette');
if (!config.includes('rowLimit: 12')) throw new Error('rowLimit doit rester à 12');

console.log('Layout valide: 12 médias/rail, 6 visibles desktop, posters contenus, scroll vertical prioritaire, swipe tactile conservé.');
