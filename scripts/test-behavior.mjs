import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./noctafin-home.js', import.meta.url), 'utf8');
const instrumented = source.replace(/\}\)\(\);\s*$/, `
  window.__test = { configuredGroupIds, fetchRowItems, getAuth, hasActivePlaybackSurface, setAuth: (value) => { auth = value; } };
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
vm.runInContext(instrumented, sandbox);
const { configuredGroupIds, fetchRowItems, getAuth, hasActivePlaybackSurface, setAuth } = sandbox.window.__test;

assert.equal(getAuth(), null, 'a token from another server must never be reused');
const taxonomy = [{ Id: 'server-id', Name: 'Pixar Animation Studios' }];
assert.deepEqual(Array.from(configuredGroupIds({ id: 'stale-id', aliases: ['Pixar'] }, taxonomy)), ['server-id']);
assert.deepEqual(Array.from(configuredGroupIds({ id: 'stale-id', aliases: ['Missing'] }, taxonomy)), []);
assert.deepEqual(Array.from(configuredGroupIds({ aliases: ['Missing'] }, [{ Id: 'x', Name: '' }])), []);

setAuth({ base: 'https://jellyfin.example', token: 'token', userId: 'user', serverId: 'server' });
const resumed = await fetchRowItems({ resume: true, includeTypes: 'Movie,Episode' });
assert.deepEqual(Array.from(resumed, (item) => item.Id), ['a1', 'movie', 'b1']);
assert.match(requests[0], /Limit=60/);

videos = [{
  classList: { contains: (name) => name === 'lumo-hover-preview' },
  getBoundingClientRect: () => ({ width: 400, height: 220, right: 400, bottom: 220 }),
  paused: false,
  currentSrc: 'preview.mp4'
}];
assert.equal(hasActivePlaybackSurface(), false, 'hover preview must not activate fullscreen player mode');
console.log('Behavior verified: server token isolation, live studio IDs, resume dedupe, preview isolation.');
