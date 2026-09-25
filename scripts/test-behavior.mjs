import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');
const configSource = fs.readFileSync(new URL('./noctafin-config.js', import.meta.url), 'utf8');
const instrumented = source.replace(/\}\)\(\);\s*$/, `
  window.__test = { configuredGroupIds, configuredGroupByName, navigateToNativeFilter, fetchRowItems, getAuth, getTaxonomies, hasActivePlaybackSurface, setAuth: (value) => { auth = value; } };
})();`);
assert.notEqual(instrumented, source, 'runtime wrapper changed');

const requests = [];
let videos = [];
const sandbox = {
  window: {
    NOCTAFIN_CONFIG: {},
    location: { protocol: 'https:', host: 'jellyfin.example', pathname: '/web/index.html' }
  },
  document: {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll(selector) { return selector === 'video' ? videos : []; }
  },
  localStorage: {
    getItem() { return JSON.stringify({ Servers: [{ AccessToken: 'wrong', UserId: 'other', ManualAddress: 'https://other.example' }] }); }
  },
  fetch: async (url) => {
    requests.push(url);
    return { ok: true, json: async () => ({ Items: [
      { Id: 'a1', Type: 'Episode', SeriesId: 'series-a' },
      { Id: 'a2', Type: 'Episode', SeriesId: 'series-a' },
      { Id: 'movie', Type: 'Movie' },
      { Id: 'b1', Type: 'Episode', SeriesId: 'series-b' }
    ] }) };
  },
  URLSearchParams,
  AbortController,
  setTimeout,
  clearTimeout,
  console
};
vm.createContext(sandbox);
vm.runInContext(configSource, sandbox);
vm.runInContext(instrumented, sandbox);
const { configuredGroupIds, configuredGroupByName, navigateToNativeFilter, fetchRowItems, getAuth, getTaxonomies, hasActivePlaybackSurface, setAuth } = sandbox.window.__test;

assert.equal(getAuth(), null, 'a token from another server must never be reused');
const taxonomy = [
  { Id: 'other-pixar', Name: 'Pixar Animation Studios' },
  { Id: 'a1384420050b89ea581e04c0dd9a83a8', Name: 'Pixar' },
  { Id: 'dreamworks-pictures', Name: 'DreamWorks Pictures' },
  { Id: 'e06730e67f5a2e6712cb6789f424a16d', Name: 'DreamWorks Animation' },
  { Id: 'disney-plus', Name: 'Disney+' },
  { Id: 'ff966337d51b0e006da6e16df7cb7ca1', Name: 'Walt Disney Pictures' }
];
const studios = sandbox.window.NOCTAFIN_CONFIG.studios;
for (const [label, expected] of [
  ['PIXAR', 'a1384420050b89ea581e04c0dd9a83a8'],
  ['DREAMWORKS', 'e06730e67f5a2e6712cb6789f424a16d'],
  ['WALT DISNEY', 'ff966337d51b0e006da6e16df7cb7ca1']
]) {
  const group = studios.find((entry) => entry.label === label);
  assert.deepEqual(Array.from(configuredGroupIds(group, taxonomy, true)), [expected], `${label} must resolve the exact server studio`);
}
assert.equal(configuredGroupByName('Disney+')?.label, 'Disney+', 'Disney+ must not be confused with Walt Disney Pictures');
assert.deepEqual(Array.from(configuredGroupIds({ aliases: ['Pix'] }, taxonomy, true)), [], 'partial names must not match');
assert.deepEqual(Array.from(configuredGroupIds({ aliases: ['Missing'] }, [{ Id: 'x', Name: '' }])), []);

setAuth({ base: 'https://jellyfin.example', token: 'token', userId: 'user', serverId: 'server' });
navigateToNativeFilter({ label: 'PIXAR', _ids: ['a1384420050b89ea581e04c0dd9a83a8'] }, 'studio');
assert.match(sandbox.window.location.hash, /studioId=a1384420050b89ea581e04c0dd9a83a8&serverId=server/);
const resumed = await fetchRowItems({ resume: true, includeTypes: 'Movie,Episode' });
assert.deepEqual(Array.from(resumed, (item) => item.Id), ['a1', 'movie', 'b1']);
assert.match(requests[0], /Limit=60/);

const firstPage = Array.from({ length: 500 }, (_, index) => ({ Id: `unrelated-${index}`, Name: `Studio ${index}` }));
sandbox.fetch = async (url) => {
  if (url.includes('/Genres?')) return { ok: true, json: async () => ({ Items: [], TotalRecordCount: 0 }) };
  const isSecondPage = url.includes('StartIndex=500');
  return { ok: true, json: async () => ({
    Items: isSecondPage ? [{ Id: 'server-a-pixar', Name: 'Pixar' }] : firstPage,
    TotalRecordCount: 501
  }) };
};
const firstTaxonomies = await getTaxonomies();
assert.deepEqual(Array.from(configuredGroupIds(studios[0], firstTaxonomies.studios, true)), ['server-a-pixar']);

setAuth({ base: 'https://second.example', token: 'other-token', userId: 'other-user', serverId: 'other-server' });
sandbox.fetch = async (url) => ({ ok: true, json: async () => ({
  Items: url.includes('/Studios?') ? [{ Id: 'server-b-pixar', Name: 'Pixar' }] : [],
  TotalRecordCount: 1
}) });
const secondTaxonomies = await getTaxonomies();
assert.deepEqual(Array.from(configuredGroupIds(studios[0], secondTaxonomies.studios, true)), ['server-b-pixar'], 'taxonomy cache must be isolated by server');

videos = [{
  classList: { contains: (name) => name === 'lumo-hover-preview' },
  getBoundingClientRect: () => ({ width: 400, height: 220, right: 400, bottom: 220 }),
  paused: false,
  currentSrc: 'preview.mp4'
}];
assert.equal(hasActivePlaybackSurface(), false, 'hover preview must not activate fullscreen player mode');
console.log('Behavior verified: server token isolation, exact paged studio IDs, resume dedupe, preview isolation.');
