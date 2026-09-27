import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');
const start = source.indexOf('  function heroArtworkId(item) {');
const end = source.indexOf('  async function fetchTaxonomyPages(', start);
assert.ok(start > 0 && end > start, 'Hero runtime functions not found');
const images = [];
class FakeImage {
  naturalWidth = 0;
  complete = false;
  set src(value) { this.url = value; images.push(this); }
  succeed() { this.naturalWidth = 100; this.complete = true; this.onload?.(); }
  fail() { this.onerror?.(); }
}
const element = () => ({
  style: {}, dataset: {}, hidden: false,
  classList: { add() {}, remove() {}, toggle() {} },
  replaceChildren() {}, appendChild() {}, setAttribute() {}
});
const hero = { isConnected: true, dataset: {}, elements: {} };
for (const selector of [
  '.noctafin-hero__bg--a', '.noctafin-hero__bg--b', '.noctafin-hero__logo',
  '.noctafin-hero__title', '.noctafin-hero__meta', '.noctafin-hero__overview',
  '[data-action="play"]', '[data-action="info"]', '.lumo-logo-title-swap',
  '.noctafin-hero__dots'
]) hero.elements[selector] = element();
const sandbox = {
  heroItems: [
    { Id: 'a', Name: 'Premier', Type: 'Movie' },
    { Id: 'b', Name: 'Deuxième', Type: 'Movie' },
    { Id: 'c', Name: 'Troisième', Type: 'Movie' },
    { Id: 'd', Name: 'Quatrième', Type: 'Movie' }
  ],
  heroIndex: 0, heroTargetIndex: 0, heroRequest: 0,
  backgroundIndex: 0, heroTimer: null,
  heroBackdropCache: new Map(),
  CONFIG: { hero: { maxItems: 8, rotateEveryMs: 7000 } },
  $: (selector) => hero.elements[selector],
  $$: () => [],
  imageUrl: (id, type) => `${id}:${type}`,
  formatRuntime: () => '',
  detailsId: (item) => item.Id,
  bindPlaybackTarget() {}, navigate() {},
  isHomeVisible: () => true,
  matchMedia: () => ({ matches: true }),
  document: { createElement: element },
  Image: FakeImage, setTimeout, clearTimeout,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  console
};
vm.createContext(sandbox);
vm.runInContext(`${source.slice(start, end)}\nthis.renderHero = renderHero;`, sandbox);
const pending = (id) => images.find((image) => image.url === `${id}:Backdrop` && image.onload);
const active = () => Object.values(hero.elements).find((el) => el.classList.active)?.style.backgroundImage;
for (const selector of ['.noctafin-hero__bg--a', '.noctafin-hero__bg--b']) {
  const layer = hero.elements[selector];
  layer.classList = {
    active: false,
    add(name) { if (name === 'is-active') this.active = true; },
    remove(name) { if (name === 'is-active') this.active = false; }
  };
}

const first = sandbox.renderHero(hero, 0);
assert.equal(hero.elements['.noctafin-hero__title'].textContent, undefined, 'title changed before backdrop loaded');
pending('a').succeed();
await first;
assert.equal(hero.elements['.noctafin-hero__title'].textContent, 'Premier');
assert.match(active(), /a:Backdrop/);

const stale = sandbox.renderHero(hero, 1);
const latest = sandbox.renderHero(hero, 2);
pending('c').succeed();
await latest;
pending('b').succeed();
await stale;
assert.equal(hero.elements['.noctafin-hero__title'].textContent, 'Troisième', 'late response replaced current title');
assert.match(active(), /c:Backdrop/, 'late response replaced current backdrop');

const failed = sandbox.renderHero(hero, 3);
pending('d').fail();
await failed;
assert.equal(hero.elements['.noctafin-hero__title'].textContent, 'Quatrième');
assert.equal(hero.dataset.activeBackdropId, '', 'failed backdrop retained another item ID');
assert.match(active(), /radial-gradient/, 'failed backdrop lacks neutral fallback');
console.log('Hero verified: synchronized commit, stale-load isolation and failure fallback.');
