(() => {
  "use strict";

  const LOG = "[Lumo]";
  const VERSION = "1.15.0";
  const DEFAULTS = {
    locale: "fr-FR",
    navigation: {
      preferHashRoutes: true,
      serverIdFallback: ""
    },
    brand: {
      name: "Lumo",
      logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.webp",
      logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.webp",
      logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.webp"
    },
    seasonal: {
      enabled: true,
      forceSeason: "auto",
      halloweenMonth: 10,
      christmasMonth: 12,
      halloweenBackground: "ui/noctafin-assets/seasonal/background-halloween.webp",
      christmasBackground: "ui/noctafin-assets/seasonal/background-christmas.webp",
      backgroundBlurPx: 8,
      backgroundBrightness: 0.56
    },
    hero: { enabled: true, rotateEveryMs: 7000, maxItems: 8 },
    preview: { enabled: true, delayMs: 850 },
    background: {
      image: "",
      imageBrightness: 0.72,
      overlayOpacity: 0.50
    },
    taxonomyHero: { enabled: true, maxItems: 18 },
    details: {
      enabled: true,
      autoExpandFirstSeason: true,
      episodePageSize: 60
    },
    rows: {
      rowLimit: 12,
      dailyPoolLimit: 96,
      minItems: 2,
      dedupeNativeRows: true,
      hideNativeHomeRows: true,
      showResumeRow: true,
      showStudioRail: true,
      showNetworkRail: true,
      showGenreRows: true,
      showStudioRows: true,
      showNetworkRows: true
    },
    genres: [],
    studios: [],
    networks: []
  };

  const source = window.NOCTAFIN_CONFIG || {};
  const CONFIG = {
    ...DEFAULTS,
    ...source,
    navigation: { ...DEFAULTS.navigation, ...(source.navigation || {}) },
    brand: { ...DEFAULTS.brand, ...(source.brand || {}) },
    seasonal: { ...DEFAULTS.seasonal, ...(source.seasonal || {}) },
    hero: { ...DEFAULTS.hero, ...(source.hero || {}) },
    preview: { ...DEFAULTS.preview, ...(source.preview || {}) },
    background: { ...DEFAULTS.background, ...(source.background || {}) },
    taxonomyHero: { ...DEFAULTS.taxonomyHero, ...(source.taxonomyHero || {}) },
    details: { ...DEFAULTS.details, ...(source.details || {}) },
    rows: { ...DEFAULTS.rows, ...(source.rows || {}) },
    genres: Array.isArray(source.genres) ? source.genres : [],
    studios: Array.isArray(source.studios) ? source.studios : [],
    networks: Array.isArray(source.networks) ? source.networks : []
  };

  const FIELDS = [
    "Overview",
    "RunTimeTicks",
    "OfficialRating",
    "CommunityRating",
    "Genres",
    "Studios",
    "ProductionYear",
    "SeriesName",
    "SeriesId",
    "ParentIndexNumber",
    "IndexNumber",
    "UserData",
    "DateCreated",
    "ImageTags",
    "BackdropImageTags",
    "ParentBackdropImageTags",
    "ParentBackdropItemId",
    "SeriesPrimaryImageTag",
    "ChildCount",
    "MediaSources",
    "Taglines"
  ].join(",");

  let auth = null;
  let currentHome = null;
  let heroTimer = null;
  let heroItems = [];
  let heroIndex = 0;
  let backgroundIndex = 0;
  let rowObserver = null;
  let mountScheduled = false;
  let taxonomyCache = null;
  let taxonomyCacheExpiresAt = 0;
  let taxonomyPromise = null;
  let taxonomyHeroKey = "";
  let taxonomyHeroRequest = 0;
  let taxonomyRetryTimer = null;
  let taxonomyRetryCount = 0;
  const taxonomyHeroItemCache = new Map();
  const taxonomyContextCache = new Map();
  const detailItemCache = new Map();
  const seasonCache = new Map();
  const episodeCache = new Map();
  let detailPageKey = "";
  let detailRequest = 0;
  let detailRetryTimer = null;
  let detailRetryCount = 0;
  let detailFallbackUntil = 0;
  let playbackManagerPromise = null;
  let playbackPendingTimer = null;
  let playbackFallbackTimer = null;
  let nativePlaybackAttemptKey = "";
  let playbackEpoch = 0;
  let playbackTransaction = null;
  let playbackDelegationInstalled = false;
  const seriesResumeCache = new Map();
  const previewCache = new Map();
  let activePreview = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function normalizeAddress(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function getBaseUrl() {
    try {
      const loc = window.location;
      const match = loc.pathname.match(/^(.*?)\/web\b/i);
      return normalizeAddress(`${loc.protocol}//${loc.host}${match ? match[1] : ""}`);
    } catch {
      return "";
    }
  }

  function getAuth() {
    const base = getBaseUrl();
    try {
      const credentials = JSON.parse(localStorage.getItem("jellyfin_credentials"));
      const servers = credentials?.Servers || [];
      const sameServer = (server) => [server.ManualAddress, server.LocalAddress, server.RemoteAddress]
        .some((address) => normalizeAddress(address) === base);
      const server = servers.find((entry) => entry.AccessToken && entry.UserId && sameServer(entry));
      if (!server) return null;
      return { base, token: server.AccessToken, userId: server.UserId, serverId: server.Id || "", serverName: server.Name || "" };
    } catch {
      return null;
    }
  }

  function headers() {
    if (!auth?.token) return {};
    return {
      Authorization: `MediaBrowser Client="Jellyfin Web", Device="Lumo", DeviceId="lumo-home", Version="${VERSION}", Token="${auth.token}"`
    };
  }

  async function fetchJson(path, timeoutMs = 12000) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), Math.max(1500, timeoutMs)) : null;
    try {
      const response = await fetch(`${auth.base}${path}`, {
        headers: headers(),
        signal: controller?.signal
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
      return await response.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function imageUrl(itemId, type = "Primary", index = null, width = 600) {
    if (!itemId || !auth?.token) return "";
    const suffix = index == null ? "" : `/${index}`;
    const query = new URLSearchParams({
      ApiKey: auth.token,
      quality: "88",
      maxWidth: String(width)
    });
    return `${auth.base}/Items/${encodeURIComponent(itemId)}/Images/${type}${suffix}?${query}`;
  }

  function formatRuntime(ticks) {
    if (!ticks) return "";
    const total = Math.floor(ticks / 600000000);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
  }

  function detailsId(item) {
    return item?.Type === "Episode" ? (item.SeriesId || item.Id) : item?.Id;
  }

  function navigate(route) {
    const target = String(route || "").trim();
    if (!target) return;
    try {
      if (window.Dashboard && typeof window.Dashboard.navigate === "function") {
        window.Dashboard.navigate(target);
        return;
      }
    } catch (error) {
      console.debug(LOG, "Dashboard.navigate indisponible", error);
    }
    try {
      window.location.hash = target.startsWith("#") ? target.slice(1) : target;
    } catch (error) {
      console.warn(LOG, "Navigation impossible", error);
    }
  }

  function isPlaybackRoute() {
    const path = currentRoutePath();
    return /(^|\/)(?:video(?:osd)?|playback|player|nowplaying)(?:\.html)?(?:\/|$)/.test(path);
  }

  function playbackSurfaceRect(node) {
    if (!node?.isConnected) return false;
    if (node.hidden || node.getAttribute?.("aria-hidden") === "true") return false;
    try {
      const rect = node.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && rect.right > 0 && rect.bottom > 0;
    } catch {
      return false;
    }
  }

  function hasActivePlaybackSurface() {
    /* Do not use visibleElement() here: the exact bug we are protecting against
       can make the native video temporarily transparent/covered. Presence + a
       real viewport-sized rectangle is enough to switch Lumo into player mode. */
    const strongSelectors = [
      ".videoOsdBottom",
      ".videoOsdHeader",
      ".osdHeader",
      ".videoOsd",
      ".videoPlayerContainer",
      "video.htmlVideoPlayer",
      "video.htmlvideoplayer",
      "video#videoPlayer",
      "[class*='VideoPlayer'] video",
      "[class*='videoPlayer'] video",
      "[class*='VideoOsd']",
      "[class*='videoOsd']"
    ];
    if (strongSelectors.some((selector) => $$(selector).some(playbackSurfaceRect))) return true;
    return $$('video').some((video) => {
      if (video.classList.contains("lumo-hover-preview")) return false;
      if (!playbackSurfaceRect(video)) return false;
      const duration = Number(video.duration);
      return !video.paused || Number(video.currentTime) > 0 || Number.isFinite(duration) && duration > 1 || Boolean(video.currentSrc);
    });
  }

  function syncPlaybackMode() {
    const active = Boolean(isPlaybackRoute() || hasActivePlaybackSurface());
    const pending = document.documentElement.classList.contains("lumo-playback-pending");
    if (active) {
      nativePlaybackAttemptKey = "";
      clearPlaybackTransaction();
    }
    document.documentElement.classList.toggle("lumo-playback-active", active);
    document.body?.classList.toggle("lumo-playback-active", active);
    if (active) {
      if (playbackPendingTimer) { clearTimeout(playbackPendingTimer); playbackPendingTimer = null; }
      if (playbackFallbackTimer) { clearTimeout(playbackFallbackTimer); playbackFallbackTimer = null; }
      document.documentElement.classList.remove("lumo-playback-pending");
      document.body?.classList.remove("lumo-playback-pending");
    } else if (!pending) {
      document.documentElement.classList.remove("lumo-playback-active");
      document.body?.classList.remove("lumo-playback-active");
    }
    return active;
  }

  function beginPlaybackPending() {
    if (heroTimer) { clearTimeout(heroTimer); heroTimer = null; }
    if (playbackPendingTimer) clearTimeout(playbackPendingTimer);
    document.documentElement.classList.add("lumo-playback-pending");
    document.body?.classList.add("lumo-playback-pending");
    playbackPendingTimer = setTimeout(() => {
      playbackPendingTimer = null;
      if (!syncPlaybackMode()) {
        document.documentElement.classList.remove("lumo-playback-pending");
        document.body?.classList.remove("lumo-playback-pending");
      }
    }, 12_000);
  }

  function normalizePlaybackManager(mod) {
    const candidate = mod?.playbackManager || mod?.default?.playbackManager || mod?.default || mod;
    return candidate && typeof candidate.play === "function" ? candidate : null;
  }

  async function resolvePlaybackManager() {
    const direct = normalizePlaybackManager(window.playbackManager || window.PlaybackManager);
    if (direct) return direct;
    if (playbackManagerPromise) return playbackManagerPromise;

    playbackManagerPromise = (async () => {
      if (typeof window.require !== "function") return null;
      const names = ["playbackManager", "components/playback/playbackmanager", "playback/playbackmanager"];
      for (const name of names) {
        try {
          const syncModule = window.require(name);
          const manager = normalizePlaybackManager(syncModule);
          if (manager) return manager;
        } catch { /* RequireJS may need the async array form. */ }
        try {
          const mod = await new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 1200);
            try {
              window.require([name], (value) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(value);
              }, () => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(null);
              });
            } catch {
              if (!done) { done = true; clearTimeout(timer); resolve(null); }
            }
          });
          const manager = normalizePlaybackManager(mod);
          if (manager) return manager;
        } catch { /* try next module id */ }
      }
      return null;
    })();

    const manager = await playbackManagerPromise;
    if (!manager) playbackManagerPromise = null;
    return manager;
  }

  function normalizeItemId(value) {
    return String(value || "").trim();
  }

  function escapeAttributeValue(value) {
    const raw = normalizeItemId(value);
    if (window.CSS?.escape) return window.CSS.escape(raw);
    return raw.replace(/([\\"'\]\[])/g, "\\$1");
  }

  const playbackBridgeNodes = new Set();

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function cleanupPlaybackBridges(epoch = null) {
    for (const node of [...playbackBridgeNodes]) {
      const nodeEpoch = Number(node.dataset?.lumoPlaybackEpoch || 0);
      if (epoch != null && nodeEpoch !== Number(epoch)) continue;
      try { node.remove(); } catch { /* already gone */ }
      playbackBridgeNodes.delete(node);
    }
  }

  function clearPlaybackTransaction(epoch = null) {
    if (!playbackTransaction) return;
    if (epoch != null && playbackTransaction.epoch !== epoch) return;
    playbackTransaction = null;
  }

  function cancelPlaybackAttempt(epoch = null) {
    if (epoch != null && playbackTransaction?.epoch !== epoch) return;
    const targetEpoch = epoch ?? playbackTransaction?.epoch ?? null;
    if (playbackPendingTimer) { clearTimeout(playbackPendingTimer); playbackPendingTimer = null; }
    if (playbackFallbackTimer) { clearTimeout(playbackFallbackTimer); playbackFallbackTimer = null; }
    cleanupPlaybackBridges(targetEpoch);
    nativePlaybackAttemptKey = "";
    document.documentElement.classList.remove("lumo-playback-pending");
    document.body?.classList.remove("lumo-playback-pending");
    clearPlaybackTransaction(epoch);
  }

  function setPlaybackBusy(node, active) {
    if (!node?.isConnected) return;
    node.classList.toggle("is-starting", Boolean(active));
    if (active) {
      node.setAttribute("aria-busy", "true");
      node.dataset.lumoPlaybackBusy = "1";
    } else {
      node.removeAttribute("aria-busy");
      delete node.dataset.lumoPlaybackBusy;
    }
  }

  function bindPlaybackTarget(node, itemOrId, options = {}) {
    if (!node) return node;
    const id = normalizeItemId(typeof itemOrId === "string" ? itemOrId : itemOrId?.Id);
    if (!id) {
      delete node.dataset.lumoPlayId;
      return node;
    }
    node.dataset.lumoPlayId = id;
    node.dataset.lumoPlaySource = String(options.source || "custom");
    node.dataset.lumoPlayResume = options.resume === false ? "false" : "true";
    const type = typeof itemOrId === "object" ? itemOrId?.Type : options.type;
    if (type) node.dataset.lumoPlayType = String(type);
    return node;
  }

  function installPlaybackDelegation() {
    if (playbackDelegationInstalled) return;
    playbackDelegationInstalled = true;
    document.addEventListener("click", async (event) => {
      const trigger = event.target?.closest?.("[data-lumo-play-id]");
      if (!trigger?.isConnected) return;
      const requestedId = normalizeItemId(trigger.dataset.lumoPlayId);
      if (!requestedId) return;

      /* One delegated capture listener survives every React remount and always
         reads the id from the DOM node that was actually clicked. */
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (trigger.dataset.lumoPlaybackBusy === "1") return;
      setPlaybackBusy(trigger, true);
      try {
        await playItemRobust(requestedId, {
          resume: trigger.dataset.lumoPlayResume !== "false",
          source: trigger.dataset.lumoPlaySource || "custom",
          hintedType: trigger.dataset.lumoPlayType || "",
          originNode: trigger
        });
      } finally {
        setTimeout(() => setPlaybackBusy(trigger, false), 360);
      }
    }, true);
  }

  function nativePlaybackParams(itemId) {
    const params = new URLSearchParams({ id: normalizeItemId(itemId), lumoNativePlay: "1" });
    const serverId = auth?.serverId || CONFIG.navigation.serverIdFallback;
    if (serverId) params.set("serverId", serverId);
    return params;
  }

  function nativePlaybackRequested() {
    return getRouteParams().get("lumoNativePlay") === "1";
  }

  function removeNativePlaybackFlag() {
    try {
      const hash = String(window.location.hash || "");
      const qIndex = hash.indexOf("?");
      if (qIndex < 0) return;
      const base = hash.slice(0, qIndex);
      const params = new URLSearchParams(hash.slice(qIndex + 1));
      if (!params.has("lumoNativePlay")) return;
      params.delete("lumoNativePlay");
      const next = `${base}${params.toString() ? `?${params.toString()}` : ""}`;
      history.replaceState(history.state, "", `${location.pathname}${location.search}${next}`);
    } catch { /* best effort */ }
  }

  function exactNativeActionCandidates(itemId) {
    const id = escapeAttributeValue(itemId);
    if (!id) return [];
    const owners = [`[data-id="${id}"]`, `[data-itemid="${id}"]`, `[data-item-id="${id}"]`];
    const selectors = [];
    for (const owner of owners) {
      selectors.push(
        `${owner}[data-action="resume"]`, `${owner} [data-action="resume"]`,
        `${owner}[data-action="play"]`, `${owner} [data-action="play"]`,
        `${owner}.btnPlay`, `${owner} .btnPlay`
      );
    }
    const seen = new Set();
    const candidates = [];
    selectors.forEach((selector) => {
      $$(selector).forEach((node) => {
        if (!node?.isConnected || seen.has(node) || node.closest?.("#lumo-detail-page,#noctafin-hero")) return;
        if (node.disabled || node.getAttribute?.("aria-disabled") === "true") return;
        seen.add(node);
        candidates.push(node);
      });
    });
    candidates.sort((a, b) => Number(visibleElement(b)) - Number(visibleElement(a)));
    return candidates;
  }

  function clickExactNativePlayback(itemId) {
    const action = exactNativeActionCandidates(itemId)[0];
    if (!action) return false;
    try {
      action.click();
      return true;
    } catch (error) {
      console.debug(LOG, "Action Lecture native exacte impossible", itemId, error);
      return false;
    }
  }

  function findNativePlayButton(itemId = "") {
    const exact = exactNativeActionCandidates(itemId)[0];
    if (exact) return exact;
    const expected = normalizeItemId(itemId);
    if (expected && detailRouteId() !== expected) return null;
    const selectors = [
      ".detailPagePrimaryContainer .btnPlay",
      ".detailPageContent .btnPlay",
      ".btnPlay",
      "button[data-action='resume']",
      "button[data-action='play']",
      ".itemAction[data-action='resume']",
      ".itemAction[data-action='play']",
      "button[aria-label*='reprendre' i]",
      "button[aria-label*='resume' i]",
      "button[aria-label*='lecture' i]",
      "button[aria-label*='play' i]"
    ];
    for (const selector of selectors) {
      for (const button of $$(selector)) {
        if (button.closest?.("#lumo-detail-page,#noctafin-hero")) continue;
        if (!visibleElement(button) || button.disabled || button.getAttribute?.("aria-disabled") === "true") continue;
        return button;
      }
    }
    return null;
  }

  function notifyPlaybackFailure(message = "Impossible de démarrer la lecture automatiquement.") {
    console.warn(LOG, message);
    let toast = $("#lumo-playback-error");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "lumo-playback-error";
      toast.className = "lumo-playback-error";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body?.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toast._lumoTimer);
    toast._lumoTimer = setTimeout(() => toast?.classList.remove("is-visible"), 4200);
  }

  function nativeShortcutContainers(originNode = null) {
    const selectors = [
      ".itemsContainer",
      "#homeTab",
      ".homeSectionsContainer",
      "#indexPage .sections",
      ".detailPageContent",
      ".detailPagePrimaryContainer"
    ];
    const candidates = [];
    const seen = new Set();
    const push = (node) => {
      if (!node?.isConnected || seen.has(node)) return;
      seen.add(node);
      candidates.push(node);
    };

    let cursor = originNode;
    while (cursor && cursor !== document.body) {
      if (cursor.matches?.(".itemsContainer,#homeTab,.homeSectionsContainer,.detailPageContent,.detailPagePrimaryContainer")) {
        push(cursor);
      }
      cursor = cursor.parentElement;
    }

    for (const selector of selectors) {
      $$(selector).filter(visibleElement).forEach(push);
    }
    for (const selector of selectors) {
      $$(selector).forEach(push);
    }
    return candidates;
  }

  function createNativeShortcutBridge(item, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "itemAction lumo-native-playback-bridge";
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.style.cssText = "position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;clip-path:inset(50%)!important;";

    const id = normalizeItemId(item?.Id);
    const serverId = normalizeItemId(item?.ServerId || auth?.serverId || CONFIG.navigation.serverIdFallback);
    const resumeTicks = options.resume === false ? 0 : Math.max(0, Number(item?.UserData?.PlaybackPositionTicks) || 0);
    button.dataset.id = id;
    button.dataset.lumoPlaybackEpoch = String(options.epoch || playbackEpoch);
    if (serverId) button.dataset.serverid = serverId;
    if (item?.Type) button.dataset.type = String(item.Type);
    button.dataset.mediatype = String(item?.MediaType || "Video");
    button.dataset.isfolder = String(Boolean(item?.IsFolder));
    button.dataset.action = resumeTicks > 0 ? "resume" : "play";
    if (resumeTicks > 0) button.dataset.positionticks = String(resumeTicks);
    return button;
  }

  async function triggerSyntheticShortcutPlayback(item, options = {}) {
    const expected = normalizeItemId(item?.Id);
    const epoch = Number(options.epoch || playbackEpoch);
    if (!expected || epoch !== playbackEpoch) return false;

    const containers = nativeShortcutContainers(options.originNode || null);
    if (!containers.length) return false;

    for (const container of containers) {
      if (epoch !== playbackEpoch) return false;
      const bridge = createNativeShortcutBridge(item, options);
      container.appendChild(bridge);
      playbackBridgeNodes.add(bridge);

      /* Jellyfin attaches the shortcut handler to container nodes. Delaying one
         frame after insertion mirrors the native card lifecycle and avoids a
         race with React/legacy shortcut registration. */
      await sleep(0);
      if (epoch !== playbackEpoch) {
        bridge.remove();
        playbackBridgeNodes.delete(bridge);
        return false;
      }

      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        button: 0
      });

      let handled = false;
      try {
        const uncancelled = bridge.dispatchEvent(clickEvent);
        handled = clickEvent.defaultPrevented || !uncancelled;
      } catch (error) {
        console.debug(LOG, "Pont shortcut Jellyfin non disponible dans ce conteneur", error);
      }

      setTimeout(() => {
        try { bridge.remove(); } catch { /* ignore */ }
        playbackBridgeNodes.delete(bridge);
      }, handled ? 900 : 0);

      if (handled) {
        console.debug(LOG, "Lecture remise au gestionnaire natif Jellyfin", {
          id: expected,
          action: bridge.dataset.action
        });
        return true;
      }
    }
    return false;
  }

  function playbackSurfaceStarted() {
    return Boolean(isPlaybackRoute() || hasActivePlaybackSurface());
  }

  function currentPlaybackItemId() {
    const manager = normalizePlaybackManager(window.playbackManager || window.PlaybackManager);
    if (!manager) return "";
    const probes = ["currentItem", "getCurrentItem", "currentItemId", "getCurrentItemId"];
    for (const key of probes) {
      try {
        const value = typeof manager[key] === "function" ? manager[key]() : manager[key];
        const id = normalizeItemId(typeof value === "object" ? value?.Id : value);
        if (id) return id;
      } catch { /* optional Jellyfin API */ }
    }
    return "";
  }

  async function waitForPlaybackStart(epoch, timeoutMs = 2600, expectedId = "") {
    const started = performance.now();
    const expected = normalizeItemId(expectedId);
    let sawSurface = false;
    let lastCurrent = "";
    while (performance.now() - started < timeoutMs) {
      if (epoch !== playbackEpoch) return false;
      if (playbackSurfaceStarted()) {
        sawSurface = true;
        const current = currentPlaybackItemId();
        if (current) lastCurrent = current;
        if (!expected || !current || current === expected) return true;
      }
      await sleep(80);
    }
    if (sawSurface && expected && lastCurrent && lastCurrent !== expected) {
      console.warn(LOG, "Le lecteur a monté un autre item; nouvelle tentative exacte requise", {
        expected,
        current: lastCurrent
      });
      return false;
    }
    return sawSurface || playbackSurfaceStarted();
  }

  async function resolvePlaybackTarget(requestedId) {
    const id = normalizeItemId(requestedId);
    if (!id) return null;
    let requested = null;
    try {
      requested = await fetchDetailItem(id, { fresh: true, timeoutMs: 4500 });
    } catch (error) {
      console.debug(LOG, "Détail frais indisponible pour la lecture; essai du cache", id, error);
      requested = await fetchDetailItem(id).catch(() => null);
    }
    if (!requested?.Id) return null;

    if (requested.Type !== "Series") return requested;

    const resumable = await fetchSeriesResumeEpisode(requested.Id).catch(() => null);
    const episode = resumable?.Id ? resumable : await firstPlayableEpisode(requested.Id).catch(() => null);
    if (!episode?.Id) return null;
    try {
      return await fetchDetailItem(episode.Id, { fresh: true, timeoutMs: 4500 }) || episode;
    } catch {
      return episode;
    }
  }

  async function triggerNativeDetailPlayback(itemOrId, epoch = playbackEpoch, options = {}) {
    const expected = normalizeItemId(itemOrId?.Id || itemOrId);
    if (!expected || epoch !== playbackEpoch) return false;
    const attemptKey = `${expected}:${epoch}`;
    if (nativePlaybackAttemptKey === attemptKey) return false;
    nativePlaybackAttemptKey = attemptKey;

    let item = typeof itemOrId === "object" ? itemOrId : null;
    const startedAt = performance.now();
    let syntheticTried = false;
    let visibleButtonTried = false;

    try {
      while (performance.now() - startedAt < 6500) {
        if (epoch !== playbackEpoch) return false;

        if (playbackSurfaceStarted()) {
          const currentId = currentPlaybackItemId();
          if (!currentId || currentId === expected) {
            removeNativePlaybackFlag();
            syncPlaybackMode();
            return true;
          }
        }

        if (detailRouteId() !== expected || !nativePlaybackRequested()) {
          await sleep(120);
          continue;
        }

        if (!item?.Id) {
          item = await fetchDetailItem(expected, { fresh: true, timeoutMs: 2500 }).catch(() => null);
          if (!item?.Id) item = { Id: expected, ServerId: auth?.serverId, Type: "Video", MediaType: "Video", UserData: {} };
        }

        if (!syntheticTried) {
          syntheticTried = true;
          const handled = await triggerSyntheticShortcutPlayback(item, {
            resume: options.resume !== false,
            epoch,
            originNode: findNativePlayButton(expected)?.closest?.(".itemsContainer,.detailPageContent,.detailPagePrimaryContainer") || null
          });
          if (handled && await waitForPlaybackStart(epoch, 2600, expected)) return true;
        }

        if (!visibleButtonTried) {
          const button = findNativePlayButton(expected);
          if (button) {
            visibleButtonTried = true;
            try { button.click(); } catch (error) { console.debug(LOG, "Clic Lecture natif impossible", error); }
            if (await waitForPlaybackStart(epoch, 2200, expected)) return true;
          }
        }

        await sleep(140);
      }

      removeNativePlaybackFlag();
      document.documentElement.classList.remove("lumo-playback-pending");
      document.body?.classList.remove("lumo-playback-pending");
      notifyPlaybackFailure("Lecture automatique impossible. La fiche native reste ouverte : utilisez son bouton Lecture.");
      scheduleMount();
      return false;
    } finally {
      if (nativePlaybackAttemptKey === attemptKey) nativePlaybackAttemptKey = "";
    }
  }

  async function fallbackNativePlayback(item, epoch = playbackEpoch, options = {}) {
    const id = normalizeItemId(item?.Id || item);
    if (!id || epoch !== playbackEpoch) return false;

    /* A custom detail overlay must never cover the native fallback page. */
    $("#lumo-detail-page")?.remove();
    detailPageKey = "";
    document.body?.classList.remove("lumo-detail-active");
    try { setNativeDetailInert(false); } catch { /* function is optional during early boot */ }

    const target = `#/details?${nativePlaybackParams(id).toString()}`;
    try { window.location.hash = target; }
    catch { navigate(`/details?${nativePlaybackParams(id).toString()}`); }
    if (playbackTransaction?.epoch === epoch) playbackTransaction.resolvedId = id;
    scheduleMount();

    const ok = await triggerNativeDetailPlayback(item, epoch, options);
    if (!ok && epoch === playbackEpoch) {
      document.documentElement.classList.remove("lumo-playback-pending");
      document.body?.classList.remove("lumo-playback-pending");
    }
    return ok;
  }

  async function playItemRobust(itemOrId, options = {}) {
    const requestedId = normalizeItemId(typeof itemOrId === "string" ? itemOrId : itemOrId?.Id);
    if (!requestedId) return false;

    const now = Date.now();
    if (playbackTransaction) {
      const sameItem = playbackTransaction.requestedId === requestedId;
      const age = now - playbackTransaction.startedAt;
      if (sameItem && age < 700) return playbackTransaction.promise || true;

      /* Last user intent wins. A stale fallback/timer from a previous click is
         invalidated immediately instead of blocking the next requested item. */
      playbackEpoch++;
      cancelPlaybackAttempt();
    }

    const epoch = ++playbackEpoch;
    beginPlaybackPending();

    const transaction = {
      epoch,
      requestedId,
      resolvedId: "",
      source: String(options.source || "unknown"),
      startedAt: now,
      promise: null
    };
    playbackTransaction = transaction;

    const run = (async () => {
      try {
        /* Resolve first. In particular, a Series becomes one exact Episode
           before any native shortcut or PlaybackManager call can fire. */
        const item = await resolvePlaybackTarget(requestedId);
        if (epoch !== playbackEpoch) return false;
        if (!item?.Id) throw new Error(`Aucun média lisible pour ${requestedId}`);

        const resolvedId = normalizeItemId(item.Id);
        transaction.resolvedId = resolvedId;
        if (!item.ServerId && auth?.serverId) item.ServerId = auth.serverId;
        const resumeTicks = options.resume === false ? 0 : Math.max(0, Number(item.UserData?.PlaybackPositionTicks) || 0);

        /* Primary path: hand a synthetic native itemAction to Jellyfin's own
           shortcut controller. It receives the exact id/server/type/position
           values Jellyfin expects and avoids stale React closures entirely. */
        const bridged = await triggerSyntheticShortcutPlayback(item, {
          resume: options.resume !== false,
          epoch,
          originNode: options.originNode || null
        });
        if (bridged && await waitForPlaybackStart(epoch, 5200, resolvedId)) return true;
        if (epoch !== playbackEpoch) return false;

        /* Secondary bridge: an already-rendered native action for exactly the
           resolved id is safe and mirrors Abyss Spotlight's proven fallback. */
        if (clickExactNativePlayback(resolvedId)) {
          if (await waitForPlaybackStart(epoch, 3200, resolvedId)) return true;
        }
        if (epoch !== playbackEpoch) return false;

        /* Last in-page fallback: match Jellyfin's native shortcuts contract.
           Use ids/serverId instead of a potentially stale item object/list. */
        const manager = await resolvePlaybackManager();
        if (manager) {
          try {
            await Promise.resolve(manager.play({
              ids: [resolvedId],
              serverId: item.ServerId || auth?.serverId || undefined,
              fullscreen: true,
              startPositionTicks: resumeTicks
            }));
            if (await waitForPlaybackStart(epoch, 4600, resolvedId)) return true;
          } catch (error) {
            playbackManagerPromise = null;
            console.warn(LOG, "PlaybackManager a refusé la cible exacte", resolvedId, error);
          }
        }

        if (epoch !== playbackEpoch) return false;
        return await fallbackNativePlayback(item, epoch, {
          resume: options.resume !== false,
          originNode: options.originNode || null
        });
      } catch (error) {
        console.warn(LOG, "Lecture impossible", requestedId, error);
        if (epoch !== playbackEpoch) return false;
        const fallbackItem = typeof itemOrId === "object" && itemOrId?.Id
          ? itemOrId
          : { Id: requestedId, ServerId: auth?.serverId, Type: options.hintedType || "Video", MediaType: "Video", UserData: {} };
        return await fallbackNativePlayback(fallbackItem, epoch, {
          resume: options.resume !== false,
          originNode: options.originNode || null
        });
      }
    })();

    transaction.promise = run.finally(() => {
      if (playbackTransaction?.epoch === epoch && !playbackSurfaceStarted()) {
        document.documentElement.classList.remove("lumo-playback-pending");
        document.body?.classList.remove("lumo-playback-pending");
        clearPlaybackTransaction(epoch);
      }
      cleanupPlaybackBridges(epoch);
    });

    return transaction.promise;
  }

  function isModernJellyfin() {
    return Boolean(document.querySelector("header.MuiAppBar-root, #reactRoot [class*='MuiToolbar-root'], #reactRoot [class*='MuiDrawer-paper']"));
  }

  function visibleById(id) {
    const nodes = $$(`[id="${id}"]`);
    for (const node of nodes) {
      if (!node.isConnected || node.hidden || node.classList.contains("hide")) continue;
      try {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") continue;
      } catch { /* ignore */ }
      return node;
    }
    return null;
  }

  function locateHome() {
    const indexPage = visibleById("indexPage");
    if (!indexPage) return null;
    const homeTab = $("#homeTab", indexPage);
    const sections = homeTab ? $(".sections", homeTab) : null;
    if (!homeTab || !sections) return null;
    return { indexPage, homeTab, sections };
  }

  function isHomeVisible() {
    if (!currentHome?.homeTab?.isConnected) return false;
    if (document.hidden) return false;
    const style = getComputedStyle(currentHome.homeTab);
    return style.display !== "none" && style.visibility !== "hidden" && !currentHome.homeTab.hidden;
  }

  function norm(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function assetUrl(path) {
    try {
      return new URL(String(path || ""), document.baseURI).href;
    } catch {
      return String(path || "");
    }
  }

  function activeSeason() {
    if (!CONFIG.seasonal.enabled) return "default";
    const forced = String(CONFIG.seasonal.forceSeason || "auto").toLowerCase();
    if (["default", "halloween", "christmas"].includes(forced)) return forced;
    const month = new Date().getMonth() + 1;
    if (month === Number(CONFIG.seasonal.halloweenMonth || 10)) return "halloween";
    if (month === Number(CONFIG.seasonal.christmasMonth || 12)) return "christmas";
    return "default";
  }

  function seasonAssets(season) {
    if (season === "halloween") {
      return {
        logo: CONFIG.brand.logoHalloween,
        background: CONFIG.seasonal.halloweenBackground
      };
    }
    if (season === "christmas") {
      return {
        logo: CONFIG.brand.logoChristmas,
        background: CONFIG.seasonal.christmasBackground
      };
    }
    return { logo: CONFIG.brand.logoBlue, background: "" };
  }

  function updateDocumentBrand(name, logoHref) {
    document.documentElement.classList.add("lumo-ui");
    const title = document.title || "";
    const serverName = String(auth?.serverName || "").trim();
    if (!title) document.title = name;
    else if (/jellyfin/i.test(title)) document.title = title.replace(/jellyfin/ig, name);
    else if (serverName && title.toLowerCase().includes(serverName.toLowerCase())) {
      document.title = title.replace(new RegExp(serverName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), name);
    }

    let appName = document.querySelector('meta[name="application-name"]');
    if (!appName) {
      appName = document.createElement("meta");
      appName.name = "application-name";
      document.head?.appendChild(appName);
    }
    appName.content = name;

    if (logoHref) {
      let icon = document.querySelector('link[rel~="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head?.appendChild(icon);
      }
      icon.href = logoHref;
    }
  }

  function ensureLocalThemeStylesheet() {
    const href = assetUrl(`ui/lumo/theme.css?v=${VERSION}`);
    let link = document.querySelector('link[data-lumo-theme]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      document.head?.appendChild(link);
    }
    link.setAttribute("data-lumo-theme", VERSION);
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);

    /* Keep Lumo after Jellyfin/Branding styles. This also neutralises an old
       jsDelivr import that a browser may still have cached while upgrading. */
    if (document.head && link.dataset.lumoPositioned !== VERSION) {
      link.dataset.lumoPositioned = VERSION;
      document.head.appendChild(link);
    }
  }

  function ensureCriticalStyle() {
    if (document.getElementById("lumo-critical-style")) return;
    const style = document.createElement("style");
    style.id = "lumo-critical-style";
    style.textContent = `
      html.lumo-ui,html.lumo-ui body{background:#02030a!important}
      #lumo-background-layer{position:fixed!important;inset:0!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important;contain:strict!important}
      #lumo-background-art,#lumo-background-shade{position:absolute!important;pointer-events:none!important}
      #lumo-background-art{inset:0!important;background-color:#02030a!important;background-image:var(--lumo-default-background)!important;background-size:cover!important;background-position:center center!important;background-repeat:no-repeat!important;filter:brightness(var(--lumo-background-brightness,.72)) saturate(.94)!important}
      #lumo-background-shade{inset:0!important;background:linear-gradient(180deg,rgba(1,2,7,.18),rgba(1,2,7,var(--lumo-background-overlay,.50)) 56%,rgba(1,2,7,.72))!important}
      html[data-lumo-season="halloween"] #lumo-background-art,html[data-lumo-season="christmas"] #lumo-background-art{inset:-20px!important;background-image:var(--lumo-season-background)!important;background-size:cover!important;background-position:center!important;filter:blur(var(--lumo-season-blur,8px)) brightness(var(--lumo-season-brightness,.56)) saturate(.92)!important;transform:scale(1.045)!important}
      html.lumo-ui:not(.lumo-playback-active) #reactRoot,html.lumo-ui:not(.lumo-playback-active) #root,html.lumo-ui:not(.lumo-playback-active) .mainAnimatedPages,html.lumo-ui:not(.lumo-playback-active) .page,html.lumo-ui:not(.lumo-playback-active) .backgroundContainer,html.lumo-ui:not(.lumo-playback-active) main,html.lumo-ui:not(.lumo-playback-active) main.MuiBox-root{background-color:transparent!important;background-image:none!important}
      html.lumo-ui #reactRoot,html.lumo-ui #root,html.lumo-ui .mainAnimatedPages{position:relative!important;z-index:1!important}
      html.lumo-playback-active #lumo-background-layer{display:none!important}
      [data-lumo-native-brand-hidden="true"]{display:none!important}
      #lumo-header-brand{appearance:none!important;display:inline-flex!important;align-items:center!important;gap:8px!important;width:auto!important;min-width:88px!important;max-width:150px!important;height:40px!important;margin:0 6px!important;padding:4px 10px 4px 4px!important;overflow:hidden!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#fff!important;box-shadow:none!important;cursor:pointer!important}
      #lumo-header-brand .lumo-brand-logo{display:block!important;width:31px!important;height:31px!important;min-width:31px!important;max-width:31px!important;object-fit:contain!important;border-radius:7px!important}
      #lumo-header-brand .lumo-brand-name{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important;font:780 .96rem/1 Inter,"Segoe UI",sans-serif!important}
      .lumo-native-brand-logo{object-fit:contain!important}
      .adminDrawerLogo{background-image:none!important}
      .adminDrawerLogo .lumo-drawer-logo,.adminDrawerLogo img.lumo-native-brand-logo{width:36px!important;min-width:36px!important;max-width:36px!important;height:36px!important;min-height:36px!important;max-height:36px!important;object-fit:contain!important;border-radius:8px!important}
    `;
    document.head?.appendChild(style);
  }

  function ensureBackgroundLayer() {
    if (!document.body) return null;
    let layer = document.getElementById("lumo-background-layer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "lumo-background-layer";
      layer.setAttribute("aria-hidden", "true");

      const art = document.createElement("div");
      art.id = "lumo-background-art";

      const shade = document.createElement("div");
      shade.id = "lumo-background-shade";

      layer.append(art, shade);
      document.body.prepend(layer);
    } else {
      /* v1.10 removes the video background completely. Clean up a stale
         <video> left behind when upgrading without a hard reload. */
      layer.querySelector("#lumo-background-video")?.remove();
    }
    return layer;
  }

  function syncBackgroundMedia() {
    ensureBackgroundLayer();
    const root = document.documentElement;
    root.classList.remove("lumo-video-active", "lumo-video-failed");

    const image = String(CONFIG.background.image || "").trim();
    root.toggleAttribute("data-lumo-custom-background", Boolean(image));
    if (image) {
      root.style.setProperty("--lumo-default-background", `url("${assetUrl(image).replace(/"/g, "%22")}")`);
    } else {
      root.style.removeProperty("--lumo-default-background");
    }

    root.style.setProperty(
      "--lumo-background-brightness",
      String(Math.max(0.25, Math.min(1, Number(CONFIG.background.imageBrightness) || 0.72)))
    );
    root.style.setProperty(
      "--lumo-background-overlay",
      String(Math.max(0, Math.min(0.95, Number(CONFIG.background.overlayOpacity) || 0.50)))
    );
  }

  function startAmbientReflections() {
    const root = document.documentElement;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const step = () => {
      if (document.hidden || motion?.matches || root.classList.contains("lumo-playback-active")) return;
      for (const index of [1, 2]) {
        root.style.setProperty(`--lumo-glow-${index}-x`, `${Math.round((Math.random() - .5) * 50)}vw`);
        root.style.setProperty(`--lumo-glow-${index}-y`, `${Math.round((Math.random() - .5) * 45)}vh`);
      }
    };
    step();
    setInterval(step, 24000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) step(); });
  }

  function replaceBrandContents(target, name, logoHref, season) {
    if (!target) return false;
    target.classList.add("lumo-brand-button");
    target.setAttribute("data-lumo-brand", "true");
    target.setAttribute("aria-label", name);
    target.setAttribute("title", name);
    target.dataset.lumoSeason = season;

    let img = $(".lumo-brand-logo", target);
    let label = $(".lumo-brand-name", target);
    if (!img || !label) {
      target.replaceChildren();
      img = document.createElement("img");
      img.className = "lumo-brand-logo";
      img.alt = "";
      img.draggable = false;
      label = document.createElement("span");
      label.className = "lumo-brand-name";
      target.append(img, label);
    }
    if (img.getAttribute("src") !== logoHref) img.setAttribute("src", logoHref);
    label.textContent = name;
    return true;
  }

  function looksLikeNativeServerBrand(node) {
    if (!node) return false;
    const serverName = norm(auth?.serverName || "");
    const text = norm(node.textContent || "");
    if (serverName && text === serverName) return true;
    if (node.matches?.(".headerHomeButton")) return true;
    if (node.querySelector?.('img[src*="icon-transparent" i], img[src*="jellyfin" i]')) return true;
    try {
      const href = node.getAttribute?.("href");
      if (href) {
        const url = new URL(href, window.location.href);
        if (url.pathname === "/" || /\/web\/?$/.test(url.pathname)) return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  function ensureLumoHeader(name, logoHref, season) {
    $$(".lumo-page-title-brand").forEach((node) => {
      node.classList.remove("lumo-page-title-brand");
      node.removeAttribute("data-lumo-brand-name");
      node.style.removeProperty("--lumo-brand-logo");
    });

    /* Jellyfin mounts its playback OSD as a header too. Never brand that
       surface: doing so creates the duplicate Lumo bar seen over playback. */
    if (isPlaybackRoute() || hasActivePlaybackSurface()) {
      $$("#lumo-header-brand").forEach((node) => node.remove());
      $$(".lumo-main-header").forEach((header) => {
        if (header.matches?.(".videoOsdHeader,.osdHeader,[class*='videoOsd'],[class*='VideoOsd'],[class*='osdHeader']") || header.closest?.(".videoOsd,.osdHeader,[class*='videoOsd'],[class*='VideoOsd'],[class*='osdHeader']")) {
          header.classList.remove("lumo-main-header");
        }
      });
      return;
    }

    const headers = $$(".skinHeader, header.MuiAppBar-root").filter((header, index, list) => {
      if (!header.isConnected || list.some((other, i) => i < index && other.contains(header))) return false;
      if (header.matches?.(".osdHeader,[class*='osdHeader']") || header.closest?.(".videoOsdHeader,.videoOsd,.osdHeader,[class*='videoOsd'],[class*='VideoOsd'],[class*='osdHeader'],[class*='playback']")) return false;
      try { return getComputedStyle(header).display !== "none"; } catch { return true; }
    });

    for (const header of headers) {
      const candidates = [
        $(".headerHomeButton", header),
        ...$$("a,button", header).filter(looksLikeNativeServerBrand),
        ...$$(".pageTitleWithDefaultLogo,.pageTitleWithLogo", header).filter(looksLikeNativeServerBrand)
      ].filter(Boolean);
      const nativeBrand = candidates[0] || null;
      const legacyHeader = header.matches?.(".skinHeader") && Boolean($(".headerLeft", header));
      if (!nativeBrand && !legacyHeader) continue;

      /* Only a verified application header gets this class. Player headers must
         never inherit the hide/show rules attached to .lumo-main-header. */
      header.classList.add("lumo-main-header");
      if (nativeBrand && nativeBrand.id !== "lumo-header-brand") nativeBrand.setAttribute("data-lumo-native-brand-hidden", "true");

      const host = $(".headerLeft", header)
        || $("[class*='MuiToolbar-root']", header)
        || $(".headerTop", header)
        || header;

      let brand = $("#lumo-header-brand", header);
      if (!brand) {
        brand = document.createElement("button");
        brand.type = "button";
        brand.id = "lumo-header-brand";
        brand.className = "lumo-header-brand focusable";
        brand.addEventListener("click", () => navigate(isModernJellyfin() ? "/" : "/home.html"));
        host.prepend(brand);
      }
      replaceBrandContents(brand, name, logoHref, season);
    }
  }

  function ensureNativeLogos(name, logoHref) {
    const safeSelectors = [
      'header img[src*="icon-transparent" i]',
      'header img[src*="jellyfin" i]',
      '.adminDrawerLogo img',
      '[class*="MuiDrawer-paper"] img[src*="icon-transparent" i]',
      '[class*="MuiDrawer-paper"] img[src*="jellyfin" i]',
      '.loginLogo img',
      '.splashLogo img'
    ].join(",");
    $$(safeSelectors).forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      img.classList.add("lumo-native-brand-logo");
      if (img.getAttribute("src") !== logoHref) img.setAttribute("src", logoHref);
      img.alt = "";
      img.draggable = false;
    });

    /* Some Jellyfin builds render the dashboard mark as a background/div,
       not an <img>. Add one bounded logo only inside that dedicated wrapper. */
    $$(".adminDrawerLogo").forEach((node) => {
      let img = $("img.lumo-drawer-logo", node);
      if (!img) {
        const nativeImg = $("img", node);
        if (nativeImg) {
          img = nativeImg;
          img.classList.add("lumo-drawer-logo");
        } else {
          img = document.createElement("img");
          img.className = "lumo-drawer-logo";
          img.alt = "";
          img.draggable = false;
          node.appendChild(img);
        }
      }
      if (img.getAttribute("src") !== logoHref) img.setAttribute("src", logoHref);
      node.setAttribute("aria-label", name);
      node.setAttribute("title", name);
    });

    $$('[class*="MuiDrawer-paper"] a').forEach((node) => {
      if (!looksLikeNativeServerBrand(node)) return;
      node.setAttribute("aria-label", name);
      node.setAttribute("title", name);
    });
  }

  function syncLumoChrome() {
    ensureCriticalStyle();
    ensureLocalThemeStylesheet();

    const playbackNow = isPlaybackRoute() || hasActivePlaybackSurface();
    if (!playbackNow) ensureBackgroundLayer();

    const season = activeSeason();
    const assets = seasonAssets(season);
    const logoHref = assetUrl(assets.logo);
    const root = document.documentElement;
    root.classList.add("lumo-ui");
    root.dataset.lumoSeason = season;
    root.style.setProperty("--lumo-current-logo", `url("${logoHref}")`);
    root.style.setProperty("--lumo-season-blur", `${Math.max(0, Number(CONFIG.seasonal.backgroundBlurPx) || 0)}px`);
    root.style.setProperty("--lumo-season-brightness", String(Math.max(0.2, Math.min(1, Number(CONFIG.seasonal.backgroundBrightness) || 0.56))));
    if (assets.background) root.style.setProperty("--lumo-season-background", `url("${assetUrl(assets.background)}")`);
    else root.style.removeProperty("--lumo-season-background");

    updateDocumentBrand(CONFIG.brand.name || "Lumo", logoHref);
    ensureLumoHeader(CONFIG.brand.name || "Lumo", logoHref, season);
    ensureNativeLogos(CONFIG.brand.name || "Lumo", logoHref);
    if (!playbackNow) syncBackgroundMedia();
  }

  function dedupeNativeRows(sections) {
    if (!CONFIG.rows.dedupeNativeRows) return;
    const seen = new Set();
    const children = Array.from(sections.children).filter((el) => !el.classList.contains("noctafin-custom-sections"));
    for (const child of children) {
      child.removeAttribute("data-noctafin-duplicate");
      const title = child.querySelector(".sectionTitle, .sectionTitleTextButton, h2, h3")?.textContent?.trim();
      if (!title) continue;
      const key = norm(title);
      if (!key) continue;
      if (seen.has(key)) child.setAttribute("data-noctafin-duplicate", "true");
      else seen.add(key);
    }
  }

  function syncNativeRows(sections) {
    if (!sections) return;
    const native = Array.from(sections.children).filter((el) => !el.classList.contains("noctafin-custom-sections"));
    native.forEach((el) => el.removeAttribute("data-lumo-native-hidden"));
    if (CONFIG.rows.hideNativeHomeRows) {
      native.forEach((el) => el.setAttribute("data-lumo-native-hidden", "true"));
      return;
    }
    dedupeNativeRows(sections);
  }

  function createHero() {
    const hero = document.createElement("section");
    hero.className = "noctafin-hero";
    hero.id = "noctafin-hero";
    hero.setAttribute("aria-label", "Sélection mise en avant");
    hero.innerHTML = `
      <div class="noctafin-hero__bg noctafin-hero__bg--a"></div>
      <div class="noctafin-hero__bg noctafin-hero__bg--b"></div>
      <div class="noctafin-hero__veil"></div>
      <div class="noctafin-hero__nav" aria-label="Navigation des sélections">
        <button type="button" class="noctafin-hero__arrow focusable" data-direction="-1" aria-label="Sélection précédente">‹</button>
        <button type="button" class="noctafin-hero__arrow focusable" data-direction="1" aria-label="Sélection suivante">›</button>
      </div>
      <div class="noctafin-hero__content">
        <img class="noctafin-hero__logo" alt="" hidden>
        <h1 class="noctafin-hero__title"></h1>
        <div class="noctafin-hero__meta"></div>
        <p class="noctafin-hero__overview"></p>
        <div class="noctafin-hero__actions">
          <button type="button" class="noctafin-hero__button noctafin-hero__button--primary focusable" data-action="play"><svg class="noctafin-hero__button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M8 5.75v12.5L18.5 12 8 5.75Z"/></svg><span>Lecture</span></button>
          <button type="button" class="noctafin-hero__button focusable" data-action="info"><svg class="noctafin-hero__button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.7h.01"/></svg><span>Plus d'infos</span></button>
        </div>
      </div>
      <div class="noctafin-hero__dots" aria-label="Changer la sélection"></div>
    `;
    return hero;
  }

  async function fetchHeroItems() {
    const params = new URLSearchParams({
      Limit: String(Math.max(12, CONFIG.hero.maxItems * 2)),
      Recursive: "true",
      IncludeItemTypes: "Movie,Series",
      Fields: FIELDS,
      SortBy: "Random",
      EnableImageTypes: "Primary,Backdrop,Thumb",
      ImageTypeLimit: "2",
      EnableTotalRecordCount: "false"
    });

    let random = [];
    try {
      random = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    } catch {
      params.set("SortBy", "DateCreated");
      params.set("SortOrder", "Descending");
      random = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    }

    let resume = [];
    try {
      const data = await fetchJson(`/Users/${auth.userId}/Items/Resume?Limit=3&Recursive=true&IncludeItemTypes=Movie,Episode&Fields=${encodeURIComponent(FIELDS)}`);
      resume = data.Items || [];
    } catch {
      resume = [];
    }

    const merged = new Map();
    const canonicalTitle = (value) => norm(value || "").replace(/[^a-z0-9]+/g, " ").trim();
    const identity = (item) => {
      if (!item?.Id) return "";
      if (item.Type === "Episode") {
        if (item.SeriesId) return `series-id:${item.SeriesId}`;
        return `series-name:${canonicalTitle(item.SeriesName || item.Name)}`;
      }
      if (item.Type === "Series") {
        /* Series IDs are authoritative, but title/year catches duplicated
           library entries pointing to the same show. */
        const title = canonicalTitle(item.Name);
        return title ? `series-title:${title}:${item.ProductionYear || ""}` : `series-id:${item.Id}`;
      }
      const title = canonicalTitle(item.Name);
      return title ? `movie-title:${title}:${item.ProductionYear || ""}` : `item:${item.Id}`;
    };
    [...resume, ...random].forEach((item) => {
      const key = identity(item);
      if (key && !merged.has(key)) merged.set(key, item);
    });

    /* Second pass: resume episodes can carry a SeriesId while the Series item
       itself only contributes a title key. Drop a title duplicate as well. */
    const seenTitles = new Set();
    const unique = [];
    for (const item of merged.values()) {
      const mediaTitle = canonicalTitle(item.Type === "Episode" ? (item.SeriesName || item.Name) : item.Name);
      const family = item.Type === "Movie" ? "movie" : "series";
      const titleKey = mediaTitle
        ? (family === "series" ? `${family}:${mediaTitle}` : `${family}:${mediaTitle}:${item.ProductionYear || ""}`)
        : "";
      if (titleKey && seenTitles.has(titleKey)) continue;
      if (titleKey) seenTitles.add(titleKey);
      unique.push(item);
    }

    return unique.slice(0, CONFIG.hero.maxItems);
  }

  function heroArtworkId(item) {
    return item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id;
  }

  function updateHeroBackground(hero, item) {
    const layers = [$(".noctafin-hero__bg--a", hero), $(".noctafin-hero__bg--b", hero)];
    backgroundIndex = backgroundIndex ? 0 : 1;
    const incoming = layers[backgroundIndex];
    const outgoing = layers[backgroundIndex ? 0 : 1];
    const url = imageUrl(heroArtworkId(item), "Backdrop", 0, 2200);
    incoming.style.backgroundImage = `url("${url}")`;
    requestAnimationFrame(() => {
      incoming.classList.add("is-active");
      outgoing.classList.remove("is-active");
    });
  }

  function renderHero(hero, index) {
    if (!heroItems.length) return;
    heroIndex = (index + heroItems.length) % heroItems.length;
    const item = heroItems[heroIndex];
    updateHeroBackground(hero, item);

    const logo = $(".noctafin-hero__logo", hero);
    const title = $(".noctafin-hero__title", hero);
    const meta = $(".noctafin-hero__meta", hero);
    const overview = $(".noctafin-hero__overview", hero);
    const play = $('[data-action="play"]', hero);
    const info = $('[data-action="info"]', hero);
    const heroTitle = item.Type === "Episode" ? (item.SeriesName || item.Name) : item.Name;

    title.textContent = heroTitle || "";
    overview.textContent = item.Overview || "";
    meta.replaceChildren();

    const values = [];
    if (item.ProductionYear) values.push(String(item.ProductionYear));
    if (item.OfficialRating) values.push(item.OfficialRating);
    const runtime = formatRuntime(item.RunTimeTicks);
    if (runtime) values.push(runtime);
    if (Number(item.CommunityRating) > 0) values.push(`★ ${Number(item.CommunityRating).toFixed(1)}`);
    (item.Genres || []).slice(0, 2).forEach((genre) => values.push(genre));
    values.forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "noctafin-hero__pill";
      pill.textContent = value;
      meta.appendChild(pill);
    });

    const logoUrl = imageUrl(heroArtworkId(item), "Logo", null, 900);
    logo.hidden = false;
    logo.onload = () => { logo.hidden = false; title.style.display = "none"; };
    logo.onerror = () => { logo.hidden = true; title.style.display = "block"; };
    title.style.display = "block";
    logo.src = logoUrl;

    const id = detailsId(item);
    info.onclick = () => navigate(`/details?id=${encodeURIComponent(id)}`);
    play.onclick = null;
    bindPlaybackTarget(play, item, { source: "hero-home" });

    const dots = $(".noctafin-hero__dots", hero);
    $$(".noctafin-hero__dot", dots).forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === heroIndex);
      dot.setAttribute("aria-current", dotIndex === heroIndex ? "true" : "false");
    });
  }

  function scheduleHero(hero) {
    if (heroTimer) clearTimeout(heroTimer);
    if (heroItems.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    heroTimer = setTimeout(() => {
      if (isHomeVisible()) renderHero(hero, heroIndex + 1);
      scheduleHero(hero);
    }, Math.max(3500, CONFIG.hero.rotateEveryMs));
  }

  async function initHero(hero) {
    if (!CONFIG.hero.enabled) {
      hero.remove();
      return;
    }

    try {
      heroItems = await fetchHeroItems();
      if (!hero.isConnected || !heroItems.length) {
        hero.remove();
        return;
      }
      $$(".noctafin-hero__arrow", hero).forEach((button) => {
        button.addEventListener("click", () => {
          renderHero(hero, heroIndex + Number(button.dataset.direction));
          scheduleHero(hero);
        });
      });
      const dots = $(".noctafin-hero__dots", hero);
      dots.replaceChildren();
      heroItems.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "noctafin-hero__dot focusable";
        dot.setAttribute("aria-label", `Sélection ${index + 1}`);
        dot.addEventListener("click", () => {
          renderHero(hero, index);
          scheduleHero(hero);
        });
        dots.appendChild(dot);
      });
      renderHero(hero, 0);
      scheduleHero(hero);
    } catch (error) {
      console.warn(LOG, "Hero indisponible", error);
      hero.remove();
    }
  }

  async function getTaxonomies() {
    const now = Date.now();
    if (taxonomyCache && now < taxonomyCacheExpiresAt) return taxonomyCache;
    if (taxonomyPromise) return taxonomyPromise;

    taxonomyPromise = (async () => {
      const [genresResult, studiosResult] = await Promise.allSettled([
        fetchJson(`/Genres?UserId=${encodeURIComponent(auth.userId)}&Recursive=true&IncludeItemTypes=Movie,Series&Limit=500`),
        fetchJson(`/Studios?UserId=${encodeURIComponent(auth.userId)}&Recursive=true&Limit=800`)
      ]);
      const anySuccess = genresResult.status === "fulfilled" || studiosResult.status === "fulfilled";
      taxonomyCache = {
        genres: genresResult.status === "fulfilled" ? (genresResult.value.Items || []) : [],
        studios: studiosResult.status === "fulfilled" ? (studiosResult.value.Items || []) : []
      };
      /* Long cache on success, short retry window on a transient API failure. */
      taxonomyCacheExpiresAt = Date.now() + (anySuccess ? 10 * 60_000 : 15_000);
      return taxonomyCache;
    })();

    try {
      return await taxonomyPromise;
    } finally {
      taxonomyPromise = null;
    }
  }

  function resolveIds(entries, aliases) {
    const aliasNorms = (aliases || []).map(norm).filter(Boolean);
    return entries
      .filter((entry) => {
        const name = norm(entry.Name);
        if (!name) return false;
        return aliasNorms.some((alias) => name === alias || name.includes(alias) || alias.includes(name));
      })
      .map((entry) => entry.Id)
      .filter(Boolean);
  }

  function configuredGroupIds(group, entries) {
    const fixed = String(group?.id || "").trim();
    const list = Array.isArray(entries) ? entries : [];
    const resolved = resolveIds(list, [group?.label, ...(group?.aliases || [])]);
    if (resolved.length) return [...new Set(resolved)];
    return fixed && list.some((entry) => String(entry?.Id || "") === fixed) ? [fixed] : [];
  }

  function configuredGroupById(id, kind = "studio") {
    const target = String(id || "").trim();
    if (!target) return null;
    const groups = kind === "genre"
      ? CONFIG.genres.map((group) => ({ ...group, kind: "genre" }))
      : [
          ...CONFIG.studios.map((group) => ({ ...group, kind: "studio" })),
          ...CONFIG.networks.map((group) => ({ ...group, kind: "network" }))
        ];
    return groups.find((group) => String(group.id || "").trim() === target) || null;
  }

  function configuredGroupByName(name) {
    const target = norm(name);
    if (!target) return null;
    const groups = [
      ...CONFIG.studios.map((group) => ({ ...group, kind: "studio" })),
      ...CONFIG.networks.map((group) => ({ ...group, kind: "network" }))
    ];
    return groups.find((group) => {
      const names = [group.label, ...(group.aliases || [])].map(norm).filter(Boolean);
      return names.some((candidate) => candidate === target || candidate.includes(target) || target.includes(candidate));
    }) || null;
  }

  function taxonomyEntryById(entries, id) {
    const target = String(id || "").trim();
    return (entries || []).find((entry) => String(entry?.Id || "").trim() === target) || null;
  }

  function makeHeading(kicker, title, onTitleClick = null, actionLabel = "Voir tout") {
    const heading = document.createElement("div");
    heading.className = "noctafin-section-heading";

    const text = document.createElement("div");
    text.className = "noctafin-section-heading__text";

    if (String(kicker || "").trim()) {
      const kickerNode = document.createElement("span");
      kickerNode.className = "noctafin-section-kicker";
      kickerNode.textContent = kicker;
      text.appendChild(kickerNode);
    }

    if (typeof onTitleClick === "function") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "noctafin-section-title noctafin-section-title-button focusable";
      button.innerHTML = `<span class="noctafin-section-title__label"></span>`;
      $(".noctafin-section-title__label", button).textContent = title;
      button.setAttribute("aria-label", `${title} — ${actionLabel}`);
      button.addEventListener("click", onTitleClick);
      text.appendChild(button);
    } else {
      const titleNode = document.createElement("span");
      titleNode.className = "noctafin-section-title";
      titleNode.textContent = title;
      text.appendChild(titleNode);
    }

    heading.appendChild(text);
    return heading;
  }

  function createTrackShell(trackClass, label) {
    const shell = document.createElement("div");
    shell.className = "noctafin-track-shell";

    const track = document.createElement("div");
    track.className = trackClass;
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", label);
    track.tabIndex = -1;

    const nav = document.createElement("div");
    nav.className = "noctafin-section-nav";
    nav.setAttribute("aria-label", `Navigation ${label}`);

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "noctafin-track-arrow noctafin-track-arrow--prev focusable";
    previous.setAttribute("aria-label", `Faire défiler ${label} vers la gauche`);
    previous.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>`;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "noctafin-track-arrow noctafin-track-arrow--next focusable";
    next.setAttribute("aria-label", `Faire défiler ${label} vers la droite`);
    next.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>`;

    previous.disabled = true;
    next.disabled = true;
    nav.hidden = true;
    nav.append(previous, next);
    shell.append(track);

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const metrics = () => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const first = track.firstElementChild;
      if (!first) return { max, step: Math.max(1, track.clientWidth), visible: 1 };
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      const cardWidth = first.getBoundingClientRect().width || first.clientWidth || 1;
      const advance = Math.max(1, cardWidth + gap);
      const visible = clamp(Math.round((track.clientWidth + gap) / advance), 1, 12);
      const pageWidth = visible * advance;
      return { max, step: Math.max(1, pageWidth), visible };
    };

    const update = () => {
      const { max } = metrics();
      const hasOverflow = max > 8;
      const atStart = track.scrollLeft <= 5;
      const atEnd = track.scrollLeft >= max - 5;
      shell.classList.toggle("has-overflow", hasOverflow);
      nav.hidden = !hasOverflow;
      previous.disabled = !hasOverflow || atStart;
      next.disabled = !hasOverflow || atEnd;
      previous.setAttribute("aria-disabled", String(previous.disabled));
      next.setAttribute("aria-disabled", String(next.disabled));
    };

    const pulse = (button) => {
      button.classList.remove("is-clicked");
      void button.offsetWidth;
      button.classList.add("is-clicked");
      setTimeout(() => button.classList.remove("is-clicked"), 180);
    };

    const scrollPage = (direction, button) => {
      const { max, step } = metrics();
      if (max <= 0 || step <= 0) return;
      const current = track.scrollLeft;
      const page = Math.round(current / step);
      let target = clamp((page + direction) * step, 0, max);
      if (direction > 0 && target <= current + 4) target = clamp(current + step, 0, max);
      if (direction < 0 && target >= current - 4) target = clamp(current - step, 0, max);
      pulse(button);
      try {
        track.scrollTo({ left: target, top: 0, behavior: "smooth" });
      } catch {
        track.scrollLeft = target;
      }
      /* Old WebViews occasionally ignore smooth scrollTo on flex tracks.
         Verify the destination after the animation window and correct it. */
      setTimeout(() => {
        if (Math.abs(track.scrollLeft - target) > 8) track.scrollLeft = target;
        update();
      }, 420);
    };

    previous.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scrollPage(-1, previous);
    });
    next.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scrollPage(1, next);
    });

    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });

    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => requestAnimationFrame(update))
      : null;
    resizeObserver?.observe(track);
    shell._noctafinResizeObserver = resizeObserver;
    shell._noctafinUpdateArrows = update;
    requestAnimationFrame(update);
    setTimeout(update, 100);
    setTimeout(update, 420);
    return { shell, track, nav, previous, next, update };
  }

  function rowId(prefix, label) {
    return `noctafin-${prefix}-${norm(label).replace(/\s+/g, "-")}`;
  }


  function navigateToNativeFilter(group, kind = "genre") {
    const id = String(group?._ids?.find(Boolean) || group?.id || "").trim();
    if (!id) return;

    const context = {
      kind,
      id,
      ids: group?._ids?.length ? group._ids : [id],
      label: group.label || "",
      colors: Array.isArray(group.colors) ? group.colors.slice(0, 2) : [],
      logo: group.logo || "",
      logoFilter: group.logoFilter || "none",
      ts: Date.now()
    };
    try { sessionStorage.setItem("lumo.taxonomyContext", JSON.stringify(context)); } catch { /* ignore */ }

    const params = new URLSearchParams();
    if (kind === "genre") params.set("genreId", id);
    else params.set("studioId", id);
    const serverId = String(auth?.serverId || CONFIG.navigation.serverIdFallback || "").trim();
    if (serverId) params.set("serverId", serverId);

    /* Jellyfin 12's canonical list route is hash-based. Using it directly
       avoids Dashboard.navigate version differences and produces the same
       native URLs as Jellyfin's own studio/genre pages. */
    const targetHash = `#/list?${params.toString()}`;
    try {
      if (window.location.hash === targetHash) scheduleMount();
      else window.location.hash = targetHash;
    } catch (error) {
      console.warn(LOG, "Navigation taxonomie impossible", error);
      navigate(`/list?${params.toString()}`);
    }
  }

  function getRouteParams() {
    const params = new URLSearchParams(window.location.search || "");
    const hash = String(window.location.hash || "");
    const qIndex = hash.indexOf("?");
    if (qIndex >= 0) {
      const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
      hashParams.forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
    }
    return params;
  }

  function routeParamId(params, names) {
    for (const name of names) {
      const raw = params.get(name);
      if (!raw) continue;
      const first = String(raw).split(",").map((value) => value.trim()).find(Boolean);
      if (first) return first;
    }
    return "";
  }

  function isTaxonomyRoute() {
    const params = getRouteParams();
    const genreId = routeParamId(params, ["genreId", "GenreId", "genreIds", "GenreIds"]);
    const studioId = routeParamId(params, ["studioId", "StudioId", "studioIds", "StudioIds"]);
    return Boolean(genreId || studioId);
  }

  function currentRoutePath() {
    const hash = String(window.location.hash || "");
    if (hash) {
      const raw = hash.replace(/^#/, "").split("?")[0] || "/";
      return raw.startsWith("/") ? raw.toLowerCase() : `/${raw.toLowerCase()}`;
    }
    return String(window.location.pathname || "").toLowerCase();
  }

  function detailRouteId() {
    if (!CONFIG.details.enabled) return "";
    const path = currentRoutePath();
    if (!/(^|\/)details(?:\.html)?$/.test(path)) return "";
    const params = getRouteParams();
    return routeParamId(params, ["id", "Id", "itemId", "ItemId"]);
  }

  function isDetailRoute() {
    return Boolean(detailRouteId());
  }

  function taxonomyPalette(label) {
    const palettes = [
      ["#7c5cff", "#25d7ff"], ["#ff4fa3", "#7c5cff"], ["#ff8a34", "#ff3f81"],
      ["#34e3b5", "#1f8fff"], ["#e9bf46", "#ff713d"], ["#8d68ff", "#d84fff"]
    ];
    let hash = 0;
    for (const char of String(label || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return palettes[Math.abs(hash) % palettes.length];
  }

  function visibleElement(node) {
    if (!node?.isConnected) return false;
    if (node.hidden || node.getAttribute?.("aria-hidden") === "true" || node.hasAttribute?.("inert")) return false;
    if (node.closest?.(".hide,[aria-hidden='true'],[inert]")) return false;
    try {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      const rect = node.getBoundingClientRect();
      const intersectsX = rect.right > -32 && rect.left < innerWidth + 32;
      const intersectsY = rect.bottom > -32 && rect.top < innerHeight + 96;
      return rect.width > 2 && rect.height > 2 && intersectsX && intersectsY;
    } catch {
      return false;
    }
  }

  function readNativeTaxonomyTitle() {
    const generic = new Set([
      "lumo", "jellyfin", "films", "film", "movies", "movie", "series", "séries",
      "bibliothèque", "library", "éléments", "items", "genre", "genres", "studio", "studios"
    ]);
    const selectors = [
      ".mainAnimatedPage:not(.hide) .pageTitle",
      "[data-role='page']:not(.hide) .pageTitle",
      "#reactRoot main h1",
      "#reactRoot main h2",
      "main[role='main'] h1",
      "main[role='main'] h2",
      ".page:not(.hide) h1",
      ".page:not(.hide) h2"
    ];
    for (const selector of selectors) {
      for (const node of $$(selector)) {
        if (!visibleElement(node)) continue;
        const value = String(node.textContent || "").replace(/\s+/g, " ").trim();
        if (!value || value.length > 90 || generic.has(value.toLowerCase())) continue;
        return value;
      }
    }
    return "";
  }

  async function resolveTaxonomyContext() {
    if (!CONFIG.taxonomyHero.enabled) return null;
    const params = getRouteParams();
    const genreId = routeParamId(params, ["genreId", "GenreId", "genreIds", "GenreIds"]);
    const studioId = routeParamId(params, ["studioId", "StudioId", "studioIds", "StudioIds"]);
    if (!genreId && !studioId) return null;

    const kindFromRoute = genreId ? "genre" : "studio";
    const routeId = String(genreId || studioId || "").trim();
    const cacheKey = `${kindFromRoute}:${routeId}`;
    const cached = taxonomyContextCache.get(cacheKey);
    if (cached) return { ...cached, ids: [routeId] };

    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem("lumo.taxonomyContext") || "null"); } catch { stored = null; }
    if (stored && String(stored.id || "") === routeId) {
      const context = { ...stored, id: routeId, ids: [routeId] };
      taxonomyContextCache.set(cacheKey, context);
      return context;
    }

    /* Exact mappings from the home page are authoritative and require no API
       round-trip. This makes the six requested studios and six TV networks
       work even if /Studios is slow or temporarily unavailable. */
    const configured = configuredGroupById(routeId, kindFromRoute);
    if (configured) {
      const context = {
        kind: configured.kind || kindFromRoute,
        id: routeId,
        ids: [routeId],
        label: configured.label || (genreId ? "Genre" : "Studio"),
        colors: configured.colors || taxonomyPalette(configured.label || routeId),
        logo: configured.logo || "",
        logoFilter: configured.logoFilter || "none"
      };
      taxonomyContextCache.set(cacheKey, context);
      return context;
    }

    /* For every other Jellyfin taxonomy ID, resolve the native name from the
       API. The DOM title is a last-resort fallback so the hero still has a
       meaningful label if an older server build rejects the taxonomy call. */
    let taxonomy = { genres: [], studios: [] };
    try { taxonomy = await getTaxonomies(); } catch (error) {
      console.debug(LOG, "Taxonomies indisponibles, repli sur le titre natif", error);
    }

    if (genreId) {
      const entry = taxonomyEntryById(taxonomy.genres, routeId);
      const nativeLabel = entry?.Name || readNativeTaxonomyTitle();
      const label = nativeLabel || "Genre";
      const context = {
        kind: "genre",
        id: routeId,
        ids: [routeId],
        label,
        colors: taxonomyPalette(label),
        logo: "",
        logoFilter: "none"
      };
      if (nativeLabel) taxonomyContextCache.set(cacheKey, context);
      return context;
    }

    const entry = taxonomyEntryById(taxonomy.studios, routeId);
    const resolvedLabel = entry?.Name || readNativeTaxonomyTitle();
    const nativeLabel = resolvedLabel || "Studio";
    const byName = resolvedLabel ? configuredGroupByName(resolvedLabel) : null;
    const context = {
      kind: byName?.kind || "studio",
      id: routeId,
      ids: [routeId],
      label: byName?.label || nativeLabel,
      colors: byName?.colors || taxonomyPalette(nativeLabel),
      logo: byName?.logo || "",
      logoFilter: byName?.logoFilter || "none"
    };
    if (resolvedLabel) taxonomyContextCache.set(cacheKey, context);
    return context;
  }

  function findTaxonomyHost() {
    /* Jellyfin 12 mixes legacy ViewManager pages and React/MUI pages. Locate
       the visible content first, then promote it to its page/main ancestor.
       Do not exclude #indexPage: on some 12.0 builds the list route is mounted
       beneath a shared index shell, which was the reason v1.9 missed heroes. */
    const candidates = new Map();

    const add = (node, bonus = 0) => {
      if (!node?.isConnected) return;
      const host = node.matches?.("main,[data-role='page'],.mainAnimatedPage,.page")
        ? node
        : node.closest?.("[data-role='page'],.mainAnimatedPage,.page,main") || node;
      if (!host?.isConnected || host.closest?.("header,nav,aside,[role='navigation']")) return;
      if (!visibleElement(host)) return;
      try {
        const rect = host.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
        const area = Math.max(1, visibleWidth * visibleHeight);
        const hasMedia = Boolean(host.querySelector?.(
          ".itemsContainer,.vertical-wrap,[class*='MuiGrid-container'],[class*='MuiImageList'],[class*='card'],[data-testid*='item']"
        ));
        const activeBonus = host.classList?.contains("hide") ? -1e9 : 0;
        const score = area + bonus + (hasMedia ? 2_000_000 : 0) + activeBonus;
        const current = candidates.get(host);
        if (!current || current.score < score) candidates.set(host, { node: host, score });
      } catch { /* ignore */ }
    };

    const contentSelectors = [
      ".mainAnimatedPage:not(.hide) .itemsContainer",
      "[data-role='page']:not(.hide) .itemsContainer",
      ".page:not(.hide) .itemsContainer",
      "#reactRoot main [class*='MuiGrid-container']",
      "#reactRoot main [class*='card']",
      "#reactRoot main [data-testid*='item']"
    ];
    contentSelectors.forEach((selector) => $$(selector).forEach((node) => {
      if (visibleElement(node)) add(node, 4_000_000);
    }));

    [
      ".mainAnimatedPage:not(.hide)",
      "[data-role='page']:not(.hide)",
      ".page:not(.hide)",
      ".mainAnimatedPages",
      ".viewContainer",
      "#reactRoot main[role='main']",
      "#reactRoot main",
      "main[role='main']",
      "main"
    ].forEach((selector) => $$(selector).forEach((node) => add(node, 0)));

    const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
    return ranked[0]?.node || null;
  }

  function clearTaxonomyHero() {
    taxonomyHeroKey = "";
    taxonomyHeroRequest += 1;
    taxonomyRetryCount = 0;
    if (taxonomyRetryTimer) clearTimeout(taxonomyRetryTimer);
    taxonomyRetryTimer = null;
    $("#lumo-taxonomy-hero")?.remove();
    const root = document.documentElement;
    delete root.dataset.lumoTaxonomyKind;
    delete root.dataset.lumoTaxonomyId;
    root.style.removeProperty("--lumo-taxonomy-a");
    root.style.removeProperty("--lumo-taxonomy-b");
    root.style.removeProperty("--lumo-taxonomy-a-rgb");
    root.style.removeProperty("--lumo-taxonomy-b-rgb");
  }

  function colorToRgbChannels(value, fallback = "124,92,255") {
    const text = String(value || "").trim();
    const short = text.match(/^#([0-9a-f]{3})$/i);
    const full = text.match(/^#([0-9a-f]{6})$/i);
    const hex = full?.[1] || (short ? short[1].split("").map((c) => c + c).join("") : "");
    if (!hex) return fallback;
    return `${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)}`;
  }

  function applyTaxonomyTheme(context) {
    if (!context) return;
    const colors = context.colors?.length >= 2 ? context.colors : taxonomyPalette(context.label);
    const a = colors[0] || "#7c5cff";
    const b = colors[1] || colors[0] || "#25d7ff";
    const root = document.documentElement;
    root.dataset.lumoTaxonomyKind = context.kind || "studio";
    root.dataset.lumoTaxonomyId = context.id || "";
    root.style.setProperty("--lumo-taxonomy-a", a);
    root.style.setProperty("--lumo-taxonomy-b", b);
    root.style.setProperty("--lumo-taxonomy-a-rgb", colorToRgbChannels(a, "124,92,255"));
    root.style.setProperty("--lumo-taxonomy-b-rgb", colorToRgbChannels(b, "37,215,255"));
  }

  function hasBackdropArt(item) {
    return Boolean(item?.BackdropImageTags?.length || item?.ParentBackdropImageTags?.length);
  }

  async function fetchTaxonomyCandidates(context, includeTypes, sortBy) {
    const limit = Math.max(12, Math.min(36, Number(CONFIG.taxonomyHero.maxItems) || 18));
    const params = new URLSearchParams({
      Limit: String(limit),
      Recursive: "true",
      IncludeItemTypes: includeTypes,
      Fields: FIELDS,
      SortBy: sortBy,
      EnableImageTypes: "Primary,Backdrop,Thumb,Logo",
      ImageTypeLimit: "3",
      EnableTotalRecordCount: "false"
    });
    if (sortBy !== "Random") params.set("SortOrder", "Descending");
    if (context.kind === "genre") params.set("GenreIds", context.ids.join(","));
    else params.set("StudioIds", context.ids.join(","));
    const result = await fetchJson(`/Users/${auth.userId}/Items?${params}`);
    return Array.isArray(result.Items) ? result.Items : [];
  }

  async function fetchTaxonomyHeroItem(context) {
    if (!auth?.userId) return null;
    const cacheKey = `${context.kind}:${context.id}:${localDayKey()}`;
    if (taxonomyHeroItemCache.has(cacheKey)) return taxonomyHeroItemCache.get(cacheKey);

    /* A stable daily choice avoids visual flicker when Jellyfin remounts a
       legacy list page. We fetch one lightweight recent pool and select from
       items that actually have backdrop art whenever possible. */
    const typePlans = context.kind === "genre"
      ? ["Movie", "Movie,Series"]
      : [context.kind === "network" ? "Series" : "Movie,Series"];

    for (const includeTypes of typePlans) {
      try {
        const items = await fetchTaxonomyCandidates(context, includeTypes, "DateCreated");
        if (!items.length) continue;
        const preferred = items.filter(hasBackdropArt);
        const pool = preferred.length ? preferred : items;
        const random = seededRandom(hash32(
          `${auth?.serverId || "server"}|${auth?.userId || "user"}|${localDayKey()}|hero|${context.kind}|${context.id}`
        ));
        const item = pool[Math.floor(random() * pool.length)] || pool[0] || null;
        taxonomyHeroItemCache.set(cacheKey, item);
        return item;
      } catch (error) {
        console.debug(LOG, "Hero taxonomie: repli suivant", context.label, includeTypes, error);
      }
    }

    taxonomyHeroItemCache.set(cacheKey, null);
    return null;
  }

  function taxonomyBackdrop(item) {
    if (!item) return "";
    if (item.BackdropImageTags?.length) return imageUrl(item.Id, "Backdrop", 0, 2200);
    if (item.ParentBackdropImageTags?.length && (item.ParentBackdropItemId || item.SeriesId)) {
      return imageUrl(item.ParentBackdropItemId || item.SeriesId, "Backdrop", 0, 2200);
    }
    const primaryOwner = item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id;
    return imageUrl(primaryOwner, "Primary", null, 1400);
  }

  function buildTaxonomyHero(context, item) {
    const hero = document.createElement("section");
    hero.id = "lumo-taxonomy-hero";
    hero.className = `lumo-taxonomy-hero lumo-taxonomy-hero--${context.kind}`;
    hero.dataset.key = `${context.kind}:${context.id}`;
    hero.dataset.kind = context.kind;
    hero.dataset.label = context.label || "";
    hero.setAttribute("aria-label", context.label || "Sélection");

    const backdrop = taxonomyBackdrop(item);
    const logo = context.logo ? assetUrl(context.logo) : "";
    const itemName = item?.Type === "Episode" ? (item.SeriesName || item.Name) : item?.Name;
    const showFeatured = context.kind !== "genre" && Boolean(itemName);
    hero.innerHTML = `
      <div class="lumo-taxonomy-hero__backdrop" aria-hidden="true"></div>
      <div class="lumo-taxonomy-hero__veil" aria-hidden="true"></div>
      <div class="lumo-taxonomy-hero__content">
        ${logo ? `<img class="lumo-taxonomy-hero__logo" alt="" draggable="false">` : ""}
        <h1 class="lumo-taxonomy-hero__title"></h1>
        ${showFeatured ? `<div class="lumo-taxonomy-hero__featured"></div>` : ""}
      </div>`;
    const bg = $(".lumo-taxonomy-hero__backdrop", hero);
    if (backdrop) {
      bg.style.backgroundImage = `url("${backdrop.replace(/"/g, "%22")}")`;
      hero.classList.add("has-backdrop");
    }
    const title = $(".lumo-taxonomy-hero__title", hero);
    title.textContent = context.label || "";
    const logoNode = $(".lumo-taxonomy-hero__logo", hero);
    if (logoNode) {
      logoNode.src = logo;
      logoNode.alt = context.label || "";
      logoNode.style.setProperty("--lumo-taxonomy-logo-filter", context.logoFilter && context.logoFilter !== "none" ? context.logoFilter : "brightness(1)");
      logoNode.addEventListener("load", () => hero.classList.add("has-logo"), { once: true });
      logoNode.addEventListener("error", () => logoNode.remove(), { once: true });
    }
    const featured = $(".lumo-taxonomy-hero__featured", hero);
    if (featured) featured.textContent = itemName;
    return hero;
  }

  function scheduleTaxonomyRetry() {
    if (taxonomyRetryTimer || !isTaxonomyRoute()) return;
    taxonomyRetryCount = Math.min(taxonomyRetryCount + 1, 24);
    const delay = Math.min(1000, 80 + taxonomyRetryCount * 55);
    taxonomyRetryTimer = setTimeout(() => {
      taxonomyRetryTimer = null;
      scheduleMount();
    }, delay);
  }

  async function syncTaxonomyPageHero() {
    if (!auth?.token || !auth?.userId) return;
    if (!isTaxonomyRoute()) {
      clearTaxonomyHero();
      return;
    }

    const context = await resolveTaxonomyContext();
    if (!context) {
      scheduleTaxonomyRetry();
      return;
    }

    /* Colour the page before media fetching. Even a slow API call therefore
       yields an immediate studio/genre-specific page instead of a plain list. */
    applyTaxonomyTheme(context);
    syncBackgroundMedia();

    const key = `${context.kind}:${context.id}`;
    let host = findTaxonomyHost();
    if (!host) {
      scheduleTaxonomyRetry();
      return;
    }

    taxonomyRetryCount = 0;
    if (taxonomyRetryTimer) clearTimeout(taxonomyRetryTimer);
    taxonomyRetryTimer = null;

    let existing = $("#lumo-taxonomy-hero");
    if (existing?.isConnected && taxonomyHeroKey === key && existing.dataset.key === key) {
      const descriptorMatches = existing.dataset.kind === context.kind
        && existing.dataset.label === (context.label || "");
      if (descriptorMatches) {
        if (!host.contains(existing)) {
          try { host.prepend(existing); } catch { /* React/legacy host changed; retry below */ }
        }
        return;
      }
      /* The API/native heading may have resolved a better name after the
         placeholder was created. Rebuild instead of freezing "Studio/Genre". */
      existing.remove();
      existing = null;
      taxonomyHeroKey = "";
    }

    /* Insert a complete placeholder immediately. This is intentionally done
       before the API request: the hero is guaranteed to exist for every valid
       taxonomy route, even if the media query fails. */
    $("#lumo-taxonomy-hero")?.remove();
    taxonomyHeroKey = key;
    const placeholder = buildTaxonomyHero(context, null);
    placeholder.dataset.loading = "true";
    try {
      host.prepend(placeholder);
    } catch {
      taxonomyHeroKey = "";
      scheduleTaxonomyRetry();
      return;
    }

    const requestId = ++taxonomyHeroRequest;
    const item = await fetchTaxonomyHeroItem(context).catch((error) => {
      console.debug(LOG, "Hero taxonomie sans média", context.label, error);
      return null;
    });

    if (requestId !== taxonomyHeroRequest || !isTaxonomyRoute()) return;
    const latestContext = await resolveTaxonomyContext().catch(() => null);
    if (!latestContext || String(latestContext.id) !== String(context.id)) return;

    host = findTaxonomyHost() || host;
    if (!host?.isConnected) {
      scheduleTaxonomyRetry();
      return;
    }

    const hydrated = buildTaxonomyHero(latestContext, item);
    hydrated.dataset.loading = "false";
    const current = $("#lumo-taxonomy-hero");
    try {
      if (current?.isConnected && current.dataset.key === key) current.replaceWith(hydrated);
      else host.prepend(hydrated);
      taxonomyHeroKey = key;
    } catch {
      taxonomyHeroKey = "";
      scheduleTaxonomyRetry();
      return;
    }

    applyTaxonomyTheme(latestContext);
    syncBackgroundMedia();
  }

  function detailBackdrop(item, width = 2400) {
    if (!item) return "";
    if (item.BackdropImageTags?.length) return imageUrl(item.Id, "Backdrop", 0, width);
    if (item.ParentBackdropImageTags?.length && (item.ParentBackdropItemId || item.SeriesId)) {
      return imageUrl(item.ParentBackdropItemId || item.SeriesId, "Backdrop", 0, width);
    }
    const owner = item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id;
    return imageUrl(owner, "Primary", null, Math.min(width, 1500));
  }

  function detailLogoUrl(item) {
    if (!item) return "";
    const owner = item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id;
    return imageUrl(owner, "Logo", null, 1100);
  }

  function detailPosterUrl(item, width = 640) {
    if (!item) return "";
    const owner = item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id;
    return imageUrl(owner, "Primary", null, width);
  }

  function setNativeDetailInert(active) {
    const selectors = ["#reactRoot main", ".mainAnimatedPages"];
    selectors.forEach((selector) => {
      $$(selector).forEach((node) => {
        if (!node?.isConnected || node.id === "lumo-detail-page" || node.contains?.($("#lumo-detail-page"))) return;
        if (active) {
          if (!node.hasAttribute("inert") && !node.hasAttribute("data-lumo-detail-inert")) {
            node.setAttribute("data-lumo-detail-inert", "true");
            node.setAttribute("inert", "");
          }
        } else if (node.hasAttribute("data-lumo-detail-inert")) {
          node.removeAttribute("data-lumo-detail-inert");
          node.removeAttribute("inert");
        }
      });
    });
  }

  function clearDetailPage() {
    if (!detailPageKey && !$("#lumo-detail-page") && !document.body?.classList.contains("lumo-detail-active")) return;
    detailPageKey = "";
    detailRequest += 1;
    if (detailRetryTimer) clearTimeout(detailRetryTimer);
    detailRetryTimer = null;
    detailRetryCount = 0;
    $("#lumo-detail-page")?.remove();
    document.body?.classList.remove("lumo-detail-active");
    delete document.documentElement.dataset.lumoDetailType;
    setNativeDetailInert(false);
  }

  function scheduleDetailRetry() {
    if (detailRetryTimer || !isDetailRoute()) return;
    detailRetryCount += 1;
    if (detailRetryCount >= 4) {
      detailFallbackUntil = Date.now() + 20_000;
      detailPageKey = "";
      $("#lumo-detail-page")?.remove();
      document.body?.classList.remove("lumo-detail-active");
      delete document.documentElement.dataset.lumoDetailType;
      setNativeDetailInert(false);
      return;
    }
    const delay = Math.min(1800, 180 * (2 ** Math.max(0, detailRetryCount - 1)));
    detailRetryTimer = setTimeout(() => {
      detailRetryTimer = null;
      scheduleMount();
    }, delay);
  }

  async function fetchDetailItem(itemId, options = {}) {
    const id = String(itemId || "").trim();
    if (!id) return null;
    const cached = detailItemCache.get(id);
    if (!options.fresh && cached && Date.now() - cached.ts < 5 * 60_000) return cached.item;
    const params = new URLSearchParams({ Fields: FIELDS });
    const item = await fetchJson(`/Users/${auth.userId}/Items/${encodeURIComponent(id)}?${params}`, Number(options.timeoutMs) || 12000);
    if (item?.Id) detailItemCache.set(id, { ts: Date.now(), item });
    return item || null;
  }

  async function fetchSeriesSeasons(seriesId) {
    const id = String(seriesId || "").trim();
    if (!id) return [];
    const cached = seasonCache.get(id);
    if (cached && Date.now() - cached.ts < 10 * 60_000) return cached.items;
    const params = new URLSearchParams({
      UserId: auth.userId,
      Fields: FIELDS,
      EnableImages: "true",
      EnableTotalRecordCount: "false"
    });
    const data = await fetchJson(`/Shows/${encodeURIComponent(id)}/Seasons?${params}`);
    const items = Array.isArray(data.Items) ? data.Items.slice() : [];
    items.sort((a, b) => (Number(a.IndexNumber) || 0) - (Number(b.IndexNumber) || 0));
    seasonCache.set(id, { ts: Date.now(), items });
    return items;
  }

  async function fetchSeasonEpisodes(seriesId, seasonId) {
    const key = `${seriesId}:${seasonId}`;
    const cached = episodeCache.get(key);
    if (cached && Date.now() - cached.ts < 10 * 60_000) return cached.items;

    const pageSize = Math.max(20, Math.min(200, Number(CONFIG.details.episodePageSize) || 60));
    const items = [];
    const seenIds = new Set();
    let startIndex = 0;
    let total = Infinity;
    let guard = 0;

    while (startIndex < total && guard < 20) {
      const params = new URLSearchParams({
        UserId: auth.userId,
        SeasonId: seasonId,
        Fields: FIELDS,
        EnableImages: "true",
        EnableTotalRecordCount: "true",
        StartIndex: String(startIndex),
        Limit: String(pageSize)
      });
      const data = await fetchJson(`/Shows/${encodeURIComponent(seriesId)}/Episodes?${params}`);
      const batch = Array.isArray(data.Items) ? data.Items : [];
      let newCount = 0;
      batch.forEach((episode) => {
        const id = String(episode?.Id || "");
        if (!id || seenIds.has(id)) return;
        seenIds.add(id);
        items.push(episode);
        newCount += 1;
      });
      total = Number.isFinite(Number(data.TotalRecordCount)) ? Number(data.TotalRecordCount) : items.length;
      if (!batch.length || batch.length < pageSize || newCount === 0) break;
      startIndex += batch.length;
      guard += 1;
    }

    const unique = uniqueItems(items);
    unique.sort((a, b) => (Number(a.IndexNumber) || 0) - (Number(b.IndexNumber) || 0));
    episodeCache.set(key, { ts: Date.now(), items: unique });
    return unique;
  }

  async function firstPlayableEpisode(seriesId) {
    const nextParams = new URLSearchParams({
      UserId: auth.userId,
      SeriesId: seriesId,
      Limit: "1",
      Fields: FIELDS,
      EnableTotalRecordCount: "false"
    });
    try {
      const next = await fetchJson(`/Shows/NextUp?${nextParams}`);
      if (next?.Items?.[0]?.Id) return next.Items[0];
    } catch (error) {
      console.debug(LOG, "NextUp indisponible pour la série", error);
    }
    const seasons = await fetchSeriesSeasons(seriesId).catch(() => []);
    for (const season of seasons) {
      const episodes = await fetchSeasonEpisodes(seriesId, season.Id).catch(() => []);
      if (episodes[0]?.Id) return episodes[0];
    }
    return null;
  }

  async function fetchSeriesResumeEpisode(seriesId) {
    const id = String(seriesId || "").trim();
    if (!id) return null;
    const cached = seriesResumeCache.get(id);
    if (cached && Date.now() - cached.ts < 60_000) return cached.item || null;

    let item = null;
    try {
      const params = new URLSearchParams({
        ParentId: id,
        Recursive: "true",
        IncludeItemTypes: "Episode",
        Filters: "IsResumable",
        SortBy: "DatePlayed",
        SortOrder: "Descending",
        Limit: "1",
        Fields: FIELDS,
        EnableImages: "true",
        EnableTotalRecordCount: "false"
      });
      const data = await fetchJson(`/Users/${auth.userId}/Items?${params}`);
      item = data?.Items?.[0] || null;
    } catch (error) {
      console.debug(LOG, "Recherche reprise par série indisponible", error);
    }

    if (!item?.Id) {
      try {
        const params = new URLSearchParams({
          Limit: "120",
          Recursive: "true",
          IncludeItemTypes: "Episode",
          MediaTypes: "Video",
          Fields: FIELDS,
          EnableTotalRecordCount: "false"
        });
        const data = await fetchJson(`/Users/${auth.userId}/Items/Resume?${params}`);
        const candidates = (data?.Items || []).filter((episode) => String(episode?.SeriesId || "") === id);
        candidates.sort((a, b) => String(b?.UserData?.LastPlayedDate || "").localeCompare(String(a?.UserData?.LastPlayedDate || "")));
        item = candidates[0] || null;
      } catch (error) {
        console.debug(LOG, "Fallback reprise de série indisponible", error);
      }
    }

    seriesResumeCache.set(id, { ts: Date.now(), item });
    return item;
  }

  function buildSeriesResumeCard(episode, series) {
    const section = document.createElement("section");
    section.className = "lumo-series-resume";
    const heading = document.createElement("h2");
    heading.textContent = "Lecture en cours";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lumo-series-resume__card";
    button.setAttribute("aria-label", `Reprendre ${episode.Name || "l'épisode"}`);

    const art = document.createElement("span");
    art.className = "lumo-series-resume__art";
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.draggable = false;
    applyImageCandidates(img, episodeThumbCandidates(episode, series));
    const progress = document.createElement("span");
    progress.className = "lumo-series-resume__progress";
    const progressFill = document.createElement("span");
    const pct = Math.max(0, Math.min(100, Number(episode.UserData?.PlayedPercentage) || 0));
    progressFill.style.width = `${pct}%`;
    progress.appendChild(progressFill);
    art.append(img, progress);

    const copy = document.createElement("span");
    copy.className = "lumo-series-resume__copy";
    const eyebrow = document.createElement("span");
    eyebrow.className = "lumo-series-resume__eyebrow";
    const season = Number(episode.ParentIndexNumber);
    const index = Number(episode.IndexNumber);
    eyebrow.textContent = [
      Number.isFinite(season) ? `S${season}` : "",
      Number.isFinite(index) ? `E${index}` : ""
    ].filter(Boolean).join(" · ");
    const title = document.createElement("strong");
    title.textContent = episode.Name || "Épisode";
    const meta = document.createElement("span");
    meta.className = "lumo-series-resume__meta";
    const bits = [];
    const runtime = formatRuntime(episode.RunTimeTicks);
    if (runtime) bits.push(runtime);
    if (pct > 0) bits.push(`${Math.round(pct)} % regardé`);
    meta.textContent = bits.join(" · ");
    const action = document.createElement("span");
    action.className = "lumo-series-resume__action";
    action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8L18.7 12 8 5.6Z"/></svg><span>Reprendre</span>';
    copy.append(eyebrow, title, meta, action);
    button.append(art, copy);
    bindPlaybackTarget(button, episode, { source: "series-resume" });
    section.append(heading, button);
    return section;
  }

  function detailMetaValues(item) {
    const values = [];
    if (item?.ProductionYear) values.push(String(item.ProductionYear));
    const runtime = formatRuntime(item?.RunTimeTicks);
    if (runtime) values.push(runtime);
    if (item?.OfficialRating) values.push(item.OfficialRating);
    if (Number(item?.CommunityRating) > 0) values.push(`★ ${Number(item.CommunityRating).toFixed(1)}`);
    return values;
  }

  function appendDetailMeta(container, item) {
    detailMetaValues(item).forEach((value) => {
      const span = document.createElement("span");
      span.className = "lumo-detail-meta__item";
      span.textContent = value;
      container.appendChild(span);
    });
  }

  function makeDetailAction(label, kind, onClick, primary = false, playTarget = null, playSource = "detail") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lumo-detail-action${primary ? " lumo-detail-action--primary" : ""}`;
    button.dataset.kind = kind;
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (kind === "play") path.setAttribute("d", "M8 5.6v12.8L18.7 12 8 5.6Z");
    else if (kind === "back") path.setAttribute("d", "M14.5 5.5 8 12l6.5 6.5");
    else path.setAttribute("d", "M12 6v12M6 12h12");
    icon.appendChild(path);
    const text = document.createElement("span");
    text.textContent = label;
    button.append(icon, text);
    if (kind === "play" && playTarget) bindPlaybackTarget(button, playTarget, { source: playSource });
    else if (typeof onClick === "function") button.addEventListener("click", onClick);
    return button;
  }

  function setDetailLogoOrTitle(logo, title, item) {
    const src = detailLogoUrl(item);
    title.textContent = item?.Type === "Episode" ? (item.SeriesName || item.Name || "") : (item?.Name || "");
    if (!src) {
      logo.hidden = true;
      title.hidden = false;
      return;
    }
    logo.hidden = false;
    title.hidden = false;
    logo.onload = () => {
      logo.hidden = false;
      title.hidden = true;
    };
    logo.onerror = () => {
      logo.hidden = true;
      title.hidden = false;
    };
    logo.src = src;
  }

  function createDetailRoot(item) {
    const root = document.createElement("section");
    root.id = "lumo-detail-page";
    root.dataset.itemId = item.Id;
    root.dataset.itemType = item.Type || "Unknown";
    root.dataset.detailState = "ready";
    root.setAttribute("aria-label", item.Name || "Détails");
    return root;
  }

  function buildMovieDetailPage(item) {
    const root = createDetailRoot(item);
    root.className = "lumo-detail-page lumo-detail-page--movie";
    const hero = document.createElement("div");
    hero.className = "lumo-movie-detail-hero";
    const backdrop = document.createElement("div");
    backdrop.className = "lumo-movie-detail-hero__backdrop";
    const backdropUrl = detailBackdrop(item);
    if (backdropUrl) backdrop.style.backgroundImage = `url("${backdropUrl.replace(/"/g, "%22")}")`;
    const veil = document.createElement("div");
    veil.className = "lumo-movie-detail-hero__veil";
    const content = document.createElement("div");
    content.className = "lumo-movie-detail-hero__content";
    const logo = document.createElement("img");
    logo.className = "lumo-movie-detail-hero__logo";
    logo.alt = "";
    logo.decoding = "async";
    logo.draggable = false;
    const title = document.createElement("h1");
    title.className = "lumo-movie-detail-hero__title";
    setDetailLogoOrTitle(logo, title, item);
    const meta = document.createElement("div");
    meta.className = "lumo-detail-meta";
    appendDetailMeta(meta, item);
    const actions = document.createElement("div");
    actions.className = "lumo-detail-actions";
    actions.appendChild(makeDetailAction("Lecture", "play", null, true, item, "movie-detail"));
    const overviewWrap = document.createElement("div");
    overviewWrap.className = "lumo-movie-detail-hero__overview-wrap";
    if (Array.isArray(item.Taglines) && item.Taglines[0]) {
      const tagline = document.createElement("p");
      tagline.className = "lumo-detail-tagline";
      tagline.textContent = item.Taglines[0];
      overviewWrap.appendChild(tagline);
    }
    if (item.Overview) {
      const overview = document.createElement("p");
      overview.className = "lumo-detail-overview";
      overview.textContent = item.Overview;
      overviewWrap.appendChild(overview);
    }
    const genres = document.createElement("div");
    genres.className = "lumo-detail-genres";
    (item.Genres || []).slice(0, 5).forEach((name) => {
      const chip = document.createElement("span");
      chip.textContent = name;
      genres.appendChild(chip);
    });
    content.append(logo, title, meta, actions);
    overviewWrap.appendChild(genres);
    hero.append(backdrop, veil, content, overviewWrap);
    root.appendChild(hero);
    return root;
  }

  function episodeThumbCandidates(episode, series) {
    const candidates = [];
    if (episode?.Id) candidates.push(imageUrl(episode.Id, "Thumb", null, 760));
    if (episode?.Id) candidates.push(imageUrl(episode.Id, "Primary", null, 760));
    if (series?.Id) candidates.push(imageUrl(series.Id, "Backdrop", 0, 760));
    return uniqueUrls(candidates);
  }

  function makeEpisodeCard(episode, series) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "lumo-episode-card";
    card.setAttribute("aria-label", `Lire ${episode.Name || "l'épisode"}`);
    const art = document.createElement("span");
    art.className = "lumo-episode-card__art";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.draggable = false;
    applyImageCandidates(img, episodeThumbCandidates(episode, series));
    const play = document.createElement("span");
    play.className = "lumo-episode-card__play";
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8L18.7 12 8 5.6Z"/></svg>';
    art.append(img, play);
    const text = document.createElement("span");
    text.className = "lumo-episode-card__text";
    const heading = document.createElement("strong");
    const index = Number(episode.IndexNumber);
    heading.textContent = `${Number.isFinite(index) ? `${index}. ` : ""}${episode.Name || "Épisode"}`;
    const meta = document.createElement("span");
    meta.className = "lumo-episode-card__meta";
    const bits = [];
    const runtime = formatRuntime(episode.RunTimeTicks);
    if (runtime) bits.push(runtime);
    if (Number(episode.CommunityRating) > 0) bits.push(`★ ${Number(episode.CommunityRating).toFixed(1)}`);
    meta.textContent = bits.join("   ");
    const overview = document.createElement("span");
    overview.className = "lumo-episode-card__overview";
    overview.textContent = episode.Overview || "";
    text.append(heading, meta, overview);
    card.append(art, text);
    bindPlaybackTarget(card, episode, { source: "episode-card" });
    return card;
  }

  async function hydrateSeasonPanel(panel, series, season) {
    if (!panel?.isConnected || panel.dataset.loaded === "true") return;
    panel.dataset.loaded = "true";
    const body = $(".lumo-season-panel__body", panel);
    const status = $(".lumo-season-panel__status", panel);
    try {
      const episodes = await fetchSeasonEpisodes(series.Id, season.Id);
      if (!panel.isConnected) return;
      body.replaceChildren(...episodes.map((episode) => makeEpisodeCard(episode, series)));
      if (!episodes.length) {
        const empty = document.createElement("p");
        empty.className = "lumo-season-panel__empty";
        empty.textContent = "Aucun épisode disponible.";
        body.appendChild(empty);
      }
      if (status) status.textContent = `${episodes.length} épisode${episodes.length > 1 ? "s" : ""}`;
    } catch (error) {
      console.warn(LOG, "Épisodes indisponibles", season.Name, error);
      const errorNode = document.createElement("p");
      errorNode.className = "lumo-season-panel__empty";
      errorNode.textContent = "Impossible de charger les épisodes pour le moment.";
      body.replaceChildren(errorNode);
      panel.dataset.loaded = "false";
    }
  }

  function makeSeasonPanel(series, season, open = false) {
    const panel = document.createElement("section");
    panel.className = "lumo-season-panel";
    const header = document.createElement("button");
    header.type = "button";
    header.className = "lumo-season-panel__toggle";
    header.setAttribute("aria-expanded", open ? "true" : "false");
    const poster = document.createElement("span");
    poster.className = "lumo-season-panel__poster";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = season.Name || "Saison";
    img.draggable = false;
    applyImageCandidates(img, uniqueUrls([
      imageUrl(season.Id, "Primary", null, 320),
      detailPosterUrl(series, 320)
    ]));
    poster.appendChild(img);
    const copy = document.createElement("span");
    copy.className = "lumo-season-panel__copy";
    const name = document.createElement("strong");
    name.textContent = season.Name || (Number.isFinite(Number(season.IndexNumber)) ? `Saison ${season.IndexNumber}` : "Saison");
    const status = document.createElement("span");
    status.className = "lumo-season-panel__status";
    status.textContent = Number(season.ChildCount) > 0 ? `${season.ChildCount} épisode${Number(season.ChildCount) > 1 ? "s" : ""}` : "Voir les épisodes";
    copy.append(name, status);
    const arrow = document.createElement("span");
    arrow.className = "lumo-season-panel__arrow";
    arrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
    header.append(poster, copy, arrow);
    const body = document.createElement("div");
    body.className = "lumo-season-panel__body";
    body.hidden = !open;
    panel.append(header, body);
    const setOpen = async (nextOpen) => {
      header.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      body.hidden = !nextOpen;
      panel.classList.toggle("is-open", nextOpen);
      if (nextOpen) await hydrateSeasonPanel(panel, series, season);
    };
    header.addEventListener("click", () => setOpen(header.getAttribute("aria-expanded") !== "true"));
    if (open) requestAnimationFrame(() => setOpen(true));
    return panel;
  }

  async function buildSeriesDetailPage(item) {
    const root = createDetailRoot(item);
    root.className = "lumo-detail-page lumo-detail-page--series";
    const backdrop = document.createElement("div");
    backdrop.className = "lumo-series-detail__backdrop";
    const backdropUrl = detailBackdrop(item);
    if (backdropUrl) backdrop.style.backgroundImage = `url("${backdropUrl.replace(/"/g, "%22")}")`;
    const veil = document.createElement("div");
    veil.className = "lumo-series-detail__veil";
    const shell = document.createElement("div");
    shell.className = "lumo-series-detail__shell";
    const poster = document.createElement("div");
    poster.className = "lumo-series-detail__poster";
    const posterImg = document.createElement("img");
    posterImg.alt = item.Name || "Série";
    posterImg.decoding = "async";
    posterImg.draggable = false;
    applyImageCandidates(posterImg, [detailPosterUrl(item, 700)]);
    poster.appendChild(posterImg);
    const info = document.createElement("div");
    info.className = "lumo-series-detail__info";
    const logo = document.createElement("img");
    logo.className = "lumo-series-detail__logo";
    logo.alt = "";
    logo.decoding = "async";
    logo.draggable = false;
    const title = document.createElement("h1");
    title.className = "lumo-series-detail__title";
    setDetailLogoOrTitle(logo, title, item);
    const meta = document.createElement("div");
    meta.className = "lumo-detail-meta";
    appendDetailMeta(meta, item);
    const actions = document.createElement("div");
    actions.className = "lumo-detail-actions";
    const play = makeDetailAction("Lecture", "play", null, true, item, "series-detail");
    actions.appendChild(play);
    const overview = document.createElement("p");
    overview.className = "lumo-detail-overview";
    overview.textContent = item.Overview || "";
    const genres = document.createElement("div");
    genres.className = "lumo-detail-genres";
    (item.Genres || []).slice(0, 5).forEach((name) => {
      const chip = document.createElement("span");
      chip.textContent = name;
      genres.appendChild(chip);
    });
    info.append(logo, title, meta, actions, overview, genres);
    shell.append(poster, info);

    const resumeSlot = document.createElement("div");
    resumeSlot.className = "lumo-series-resume-slot";

    const seasonsWrap = document.createElement("section");
    seasonsWrap.className = "lumo-series-seasons";
    const seasonsHeading = document.createElement("h2");
    seasonsHeading.textContent = "Saisons";
    const seasonsList = document.createElement("div");
    seasonsList.className = "lumo-series-seasons__list";
    const loading = document.createElement("p");
    loading.className = "lumo-series-seasons__loading";
    loading.textContent = "Chargement des saisons…";
    seasonsList.appendChild(loading);
    seasonsWrap.append(seasonsHeading, seasonsList);
    root.append(backdrop, veil, shell, resumeSlot, seasonsWrap);

    fetchSeriesResumeEpisode(item.Id).then((episode) => {
      if (!root.isConnected || !episode?.Id) return;
      resumeSlot.replaceChildren(buildSeriesResumeCard(episode, item));
    }).catch((error) => console.debug(LOG, "Reprise de série indisponible", error));

    fetchSeriesSeasons(item.Id).then((seasons) => {
      if (!root.isConnected) return;
      if (!seasons.length) {
        loading.textContent = "Aucune saison disponible.";
        return;
      }
      seasonsList.replaceChildren(...seasons.map((season, index) => makeSeasonPanel(
        item,
        season,
        Boolean(CONFIG.details.autoExpandFirstSeason && index === 0)
      )));
    }).catch((error) => {
      console.warn(LOG, "Saisons indisponibles", error);
      if (loading.isConnected) loading.textContent = "Impossible de charger les saisons pour le moment.";
    });
    return root;
  }

  function detailOverlayHost() {
    return $("#reactRoot") || $("#root") || document.body;
  }

  async function syncDetailPage() {
    const itemId = detailRouteId();

    /* Playback fallback deliberately uses Jellyfin's native detail page. Do
       not cover/inert it with the Lumo detail surface while its Play action is
       being located. MutationObserver may call mount many times, so key the
       retry loop by item id and start it only once. */
    if (itemId && nativePlaybackRequested()) {
      $("#lumo-detail-page")?.remove();
      detailPageKey = "";
      document.body?.classList.remove("lumo-detail-active");
      delete document.documentElement.dataset.lumoDetailType;
      setNativeDetailInert(false);
      if (!String(nativePlaybackAttemptKey || "").startsWith(`${itemId}:`)) {
        triggerNativeDetailPlayback(itemId);
      }
      return;
    }
    nativePlaybackAttemptKey = "";

    if (Date.now() < detailFallbackUntil) {
      document.body?.classList.remove("lumo-detail-active");
      setNativeDetailInert(false);
      return;
    }
    if (!itemId || !auth?.token || !auth?.userId) {
      if (!itemId) clearDetailPage();
      return;
    }

    document.body?.classList.add("lumo-detail-active");
    setNativeDetailInert(true);
    const existing = $("#lumo-detail-page");
    if (existing?.isConnected && detailPageKey === itemId && existing.dataset.itemId === itemId && existing.dataset.detailState !== "error") return;

    const requestId = ++detailRequest;
    detailPageKey = itemId;
    existing?.remove();

    const loading = document.createElement("section");
    loading.id = "lumo-detail-page";
    loading.className = "lumo-detail-page lumo-detail-page--loading";
    loading.dataset.itemId = itemId;
    loading.dataset.detailState = "loading";
    loading.innerHTML = '<div class="lumo-detail-loading"><span></span><span></span><span></span></div>';
    (detailOverlayHost() || document.body).appendChild(loading);

    try {
      const item = await fetchDetailItem(itemId);
      if (requestId !== detailRequest || detailRouteId() !== itemId || !item?.Id) return;
      if (!["Movie", "Series", "Episode"].includes(String(item.Type || ""))) {
        detailPageKey = "";
        loading.remove();
        document.body?.classList.remove("lumo-detail-active");
        setNativeDetailInert(false);
        return;
      }
      const root = item.Type === "Series" ? await buildSeriesDetailPage(item) : buildMovieDetailPage(item);
      if (requestId !== detailRequest || detailRouteId() !== itemId) return;
      detailRetryCount = 0;
      detailFallbackUntil = 0;
      document.documentElement.dataset.lumoDetailType = String(item.Type || "unknown").toLowerCase();
      const current = $("#lumo-detail-page");
      if (current?.isConnected) current.replaceWith(root);
      else (detailOverlayHost() || document.body).appendChild(root);
      try { root.scrollTo({ top: 0, behavior: "instant" }); } catch { root.scrollTop = 0; }
    } catch (error) {
      console.warn(LOG, "Page détail Lumo indisponible", error);
      if (requestId !== detailRequest || detailRouteId() !== itemId) return;
      loading.dataset.detailState = "error";
      loading.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className = "lumo-detail-error";
      fallback.textContent = "Impossible de charger cette fiche pour le moment.";
      loading.appendChild(fallback);
      scheduleDetailRetry();
    }
  }

  function createBrandShelf(title, groups, prefix) {
    const section = document.createElement("section");
    section.className = `noctafin-shelf${prefix === "network" ? " noctafin-shelf--featured" : ""}`;

    const heading = makeHeading("", title);
    const { shell, track, nav, update } = createTrackShell("noctafin-brand-track", title);
    heading.appendChild(nav);
    section.append(heading, shell);

    groups.forEach((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "noctafin-brand focusable";
      button.dataset.brand = norm(group.label).replace(/\s+/g, "-");
      button.style.setProperty("--brand-a", group.colors?.[0] || "#7c5cff");
      button.style.setProperty("--brand-b", group.colors?.[1] || "#25d7ff");
      if (group.darkText) button.style.color = "#080a11";

      const fallback = document.createElement("span");
      fallback.className = "noctafin-brand__name";
      fallback.textContent = group.label;
      button.appendChild(fallback);

      if (group.logo) {
        const frame = document.createElement("span");
        frame.className = "noctafin-brand__logo-frame";
        frame.style.setProperty("--lumo-brand-logo-filter", group.logoFilter || "none");
        const logo = document.createElement("img");
        logo.className = "noctafin-brand__logo";
        logo.alt = group.label;
        logo.loading = "eager";
        logo.decoding = "async";
        logo.draggable = false;
        logo.referrerPolicy = "no-referrer";
        logo.addEventListener("load", () => button.classList.add("has-logo"), { once: true });
        logo.addEventListener("error", () => {
          button.classList.remove("has-logo");
          frame.remove();
        }, { once: true });
        frame.appendChild(logo);
        button.appendChild(frame);
        logo.src = assetUrl(group.logo);
      }

      if (!group._ids?.length) {
        button.setAttribute("aria-disabled", "true");
        button.disabled = true;
        button.title = `Aucun média associé à ${group.label} dans cette bibliothèque`;
      } else {
        button.title = `Explorer ${group.label}`;
        button.addEventListener("click", () => navigateToNativeFilter(group, group.kind || (prefix === "network" ? "network" : "studio")));
      }
      track.appendChild(button);
    });

    requestAnimationFrame(update);
    return section;
  }

  function createLazyMediaRow({ kicker, title, id, query, onTitleClick = null, layout = "poster" }) {
    const section = document.createElement("section");
    section.className = `noctafin-media-row is-loading noctafin-media-row--${layout}`;
    section.id = id;
    section.dataset.noctafinQuery = JSON.stringify(query);
    section.dataset.noctafinLayout = layout;

    const heading = makeHeading(kicker, title, onTitleClick);
    const { shell, track, nav } = createTrackShell(`noctafin-card-track noctafin-card-track--${layout}`, title);
    heading.appendChild(nav);
    section.append(heading, shell);
    return section;
  }

  function localDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function hash32(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function uniqueItems(items) {
    const seen = new Set();
    return (items || []).filter((item) => {
      const id = String(item?.Id || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function dailySelection(items, query, limit) {
    const unique = uniqueItems(items);
    const identity = JSON.stringify({
      genreIds: [...(query.genreIds || [])].sort(),
      studioIds: [...(query.studioIds || [])].sort(),
      includeTypes: query.includeTypes || "Movie"
    });
    const seedText = `${auth?.serverId || "server"}|${auth?.userId || "user"}|${localDayKey()}|${identity}`;
    const random = seededRandom(hash32(seedText));
    const shuffled = unique.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, limit);
  }

  async function fetchRowItems(query) {
    /* Every non-resume rail exposes twelve media slots. Six are visible on
       desktop and the second six are reached via the arrow pair. The content
       is deterministic for the current local day, then changes next day. */
    const configuredLimit = Number(query?.limit ?? CONFIG.rows.rowLimit);
    const rowLimit = Math.max(1, Math.min(12, Number.isFinite(configuredLimit) ? configuredLimit : 12));

    if (query.resume) {
      const params = new URLSearchParams({
        Limit: String(Math.max(rowLimit * 5, 60)),
        Recursive: "true",
        IncludeItemTypes: query.includeTypes || "Movie,Episode",
        Fields: FIELDS,
        EnableImageTypes: "Primary,Backdrop,Thumb",
        ImageTypeLimit: "2",
        EnableTotalRecordCount: "false"
      });
      const result = (await fetchJson(`/Users/${auth.userId}/Items/Resume?${params}`)).Items || [];
      const seenSeries = new Set();
      return uniqueItems(result).filter((item) => {
        if (item.Type !== "Episode" || !item.SeriesId) return true;
        if (seenSeries.has(item.SeriesId)) return false;
        seenSeries.add(item.SeriesId);
        return true;
      }).slice(0, rowLimit);
    }

    const configuredPool = Number(CONFIG.rows.dailyPoolLimit) || 96;
    const poolLimit = Math.max(rowLimit, Math.min(180, Math.max(rowLimit * 4, configuredPool)));
    const params = new URLSearchParams({
      Limit: String(poolLimit),
      Recursive: "true",
      IncludeItemTypes: query.includeTypes || "Movie",
      Fields: FIELDS,
      SortBy: "DateCreated,SortName",
      SortOrder: "Descending",
      EnableImageTypes: "Primary,Backdrop,Thumb",
      ImageTypeLimit: "2",
      EnableTotalRecordCount: "false"
    });
    if (query.genreIds?.length) params.set("GenreIds", query.genreIds.join(","));
    if (query.studioIds?.length) params.set("StudioIds", query.studioIds.join(","));

    let items = [];
    try {
      items = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    } catch (error) {
      console.debug(LOG, "Sélection quotidienne: tri combiné indisponible, repli DateCreated", error);
      params.set("SortBy", "DateCreated");
      params.set("SortOrder", "Descending");
      items = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    }
    return dailySelection(items, query, rowLimit);
  }


  function uniqueUrls(urls) {
    return [...new Set((urls || []).filter(Boolean))];
  }

  function landscapeImageCandidates(item) {
    const candidates = [];
    const isEpisode = item?.Type === "Episode";

    if (isEpisode) {
      /* Prefer true landscape art. Episode Primary can be a poster depending
         on the metadata provider, so it is only a late fallback. */
      const backdropOwner = item.ParentBackdropItemId || item.SeriesId;
      if (item.Id) candidates.push(imageUrl(item.Id, "Thumb", null, 760));
      if (backdropOwner) candidates.push(imageUrl(backdropOwner, "Backdrop", 0, 760));
      if (item.SeriesId && item.SeriesId !== backdropOwner) candidates.push(imageUrl(item.SeriesId, "Backdrop", 0, 760));
      if (item.Id) candidates.push(imageUrl(item.Id, "Primary", null, 760));
      if (item.SeriesId) candidates.push(imageUrl(item.SeriesId, "Primary", null, 600));
    } else {
      if (item?.Id) candidates.push(imageUrl(item.Id, "Backdrop", 0, 760));
      if (item?.Id) candidates.push(imageUrl(item.Id, "Thumb", null, 760));
      if (item?.Id) candidates.push(imageUrl(item.Id, "Primary", null, 600));
    }

    return uniqueUrls(candidates);
  }

  function posterImageCandidates(item) {
    const isEpisode = item?.Type === "Episode";
    const artId = isEpisode ? (item.SeriesId || item.Id) : item?.Id;
    return uniqueUrls([imageUrl(artId, "Primary", null, 480)]);
  }

  function applyImageCandidates(img, candidates) {
    const queue = [...(candidates || [])];
    const loadNext = () => {
      const next = queue.shift();
      if (!next) {
        img.removeAttribute("src");
        img.classList.add("is-missing");
        return;
      }
      img.src = next;
    };
    img.addEventListener("error", loadNext);
    loadNext();
  }


  function makeCard(item, layout = "poster") {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `noctafin-card noctafin-card--${layout} focusable`;
    card.dataset.id = item.Id;
    const isEpisode = item.Type === "Episode";
    const title = isEpisode ? (item.SeriesName || item.Name) : item.Name;
    const rating = Number(item.CommunityRating);
    const season = Number(item.ParentIndexNumber);
    const episode = Number(item.IndexNumber);
    const episodeCode = isEpisode && (Number.isFinite(season) || Number.isFinite(episode))
      ? `S${Number.isFinite(season) ? season : "?"}:E${Number.isFinite(episode) ? episode : "?"}`
      : "";
    const subtitle = isEpisode
      ? [episodeCode, item.Name && item.Name !== title ? item.Name : ""].filter(Boolean).join(" – ")
      : "";
    const progress = Math.max(0, Math.min(100, Number(item.UserData?.PlayedPercentage) || 0));

    card.innerHTML = `
      <span class="noctafin-card__art">
        <img loading="lazy" alt="">
        <span class="noctafin-card__progress" ${progress > 0 ? "" : "hidden"}><span></span></span>
      </span>
      <span class="noctafin-card__title"></span>
      <span class="noctafin-card__subtitle"></span>
      <span class="noctafin-card__meta"><span class="noctafin-card__year"></span><span class="noctafin-card__rating"></span></span>
    `;
    const img = $("img", card);
    img.alt = title || "";
    if (layout === "landscape") {
      applyImageCandidates(img, landscapeImageCandidates(item));
    } else {
      applyImageCandidates(img, posterImageCandidates(item));
    }
    $(".noctafin-card__title", card).textContent = title || "Sans titre";
    const subtitleNode = $(".noctafin-card__subtitle", card);
    subtitleNode.textContent = subtitle;
    subtitleNode.hidden = !subtitle;
    $(".noctafin-card__year", card).textContent = item.ProductionYear || "";
    $(".noctafin-card__rating", card).textContent = Number.isFinite(rating) && rating > 0 ? `★ ${rating.toFixed(1)}` : "";
    const progressBar = $(".noctafin-card__progress > span", card);
    if (progressBar) progressBar.style.width = `${progress}%`;
    bindPlaybackTarget(card, item, { source: "rail" });
    if (["Movie", "Series", "Episode"].includes(item.Type)) {
      attachHoverPreview(card, item.Type === "Episode" ? (item.SeriesId || item.Id) : item.Id);
    }
    card.setAttribute("aria-label", `Lire ${title || "ce média"}`);
    return card;
  }

  async function previewItemId(itemId) {
    const session = auth;
    const key = `${session?.serverId || session?.base}:${session?.userId}:${itemId}`;
    const cached = previewCache.get(key);
    if (!cached || cached.expiresAt < Date.now()) {
      const request = (async () => {
        const trailers = await fetchJson(`/Users/${encodeURIComponent(session.userId)}/Items/${encodeURIComponent(itemId)}/LocalTrailers`, 4500).catch(() => []);
        if (trailers?.[0]?.Id) return trailers[0].Id;
        const themes = await fetchJson(`/Items/${encodeURIComponent(itemId)}/ThemeVideos?userId=${encodeURIComponent(session.userId)}`, 4500).catch(() => null);
        return themes?.Items?.[0]?.Id || "";
      })();
      const entry = { promise: request, expiresAt: Date.now() + 60_000 };
      previewCache.set(key, entry);
      request.then((id) => { entry.expiresAt = Date.now() + (id ? 10 * 60_000 : 60_000); });
      if (previewCache.size > 200) previewCache.delete(previewCache.keys().next().value);
    }
    return previewCache.get(key).promise;
  }

  function stopActivePreview() {
    if (!activePreview) return;
    activePreview.video.pause();
    activePreview.video.removeAttribute("src");
    activePreview.video.load();
    activePreview.video.remove();
    activePreview = null;
  }

  function attachHoverPreview(card, itemId) {
    if (!CONFIG.preview?.enabled || window.matchMedia?.("(pointer: coarse)")?.matches ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || navigator.connection?.saveData) return;
    let timer = null;
    let generation = 0;
    const stop = () => {
      generation += 1;
      clearTimeout(timer);
      if (activePreview?.card !== card) return;
      stopActivePreview();
    };
    card.addEventListener("mouseenter", () => {
      const current = ++generation;
      timer = setTimeout(async () => {
        if (!card.isConnected || current !== generation || !auth?.token) return;
        const previewId = await previewItemId(itemId);
        if (!previewId || !card.isConnected || current !== generation || !auth?.token) return;
        stopActivePreview();
        const art = card.querySelector(".noctafin-card__art");
        if (!art) return;
        const video = document.createElement("video");
        video.className = "lumo-hover-preview";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-hidden", "true");
        video.src = `${auth.base}/Videos/${encodeURIComponent(previewId)}/stream?static=true&ApiKey=${encodeURIComponent(auth.token)}`;
        video.addEventListener("error", stop, { once: true });
        art.appendChild(video);
        activePreview = { card, video };
        video.play().catch(stop);
      }, Math.max(350, Number(CONFIG.preview.delayMs) || 850));
    });
    card.addEventListener("mouseleave", stop);
    card.addEventListener("click", stop);
  }

  async function hydrateRow(section) {
    if (!section?.isConnected || section.dataset.loaded === "true") return;
    section.dataset.loaded = "true";
    try {
      const query = JSON.parse(section.dataset.noctafinQuery || "{}");
      const items = await fetchRowItems(query);
      if (!section.isConnected) return;
      const minItems = Number.isFinite(Number(query.minItems)) ? Number(query.minItems) : CONFIG.rows.minItems;
      if (items.length < minItems) {
        section.classList.remove("is-loading");
        section.classList.add("is-empty");
        return;
      }
      const track = $(".noctafin-card-track", section);
      const layout = section.dataset.noctafinLayout || "poster";
      track.replaceChildren(...items.map((item) => makeCard(item, layout)));
      section.classList.remove("is-loading");
      const shell = track.closest(".noctafin-track-shell");
      requestAnimationFrame(() => shell?._noctafinUpdateArrows?.());
    } catch (error) {
      console.warn(LOG, "Ligne indisponible", section.id, error);
      section.classList.remove("is-loading");
      section.classList.add("is-empty");
    }
  }

  function setupRowObserver(root) {
    rowObserver?.disconnect();
    if (!("IntersectionObserver" in window)) {
      $$(".noctafin-media-row", root).forEach(hydrateRow);
      return;
    }
    rowObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        rowObserver.unobserve(entry.target);
        hydrateRow(entry.target);
      });
    }, { rootMargin: "800px 0px" });
    $$(".noctafin-media-row", root).forEach((row) => rowObserver.observe(row));
  }

  async function initCustomRows(root) {
    try {
      const taxonomy = await getTaxonomies();
      if (!root.isConnected) return;

      const genres = CONFIG.genres.map((group) => ({ ...group, _ids: configuredGroupIds(group, taxonomy.genres) }));
      const studios = CONFIG.studios.map((group) => ({ ...group, _ids: configuredGroupIds(group, taxonomy.studios) }));
      const networks = CONFIG.networks.map((group) => ({ ...group, _ids: configuredGroupIds(group, taxonomy.studios) }));

      const fragment = document.createDocumentFragment();
      if (CONFIG.rows.showNetworkRail) fragment.appendChild(createBrandShelf("Studios & plateformes", networks.slice(0, 7), "network"));
      if (CONFIG.rows.showResumeRow) {
        fragment.appendChild(createLazyMediaRow({
          kicker: "",
          title: "Continuer de regarder",
          id: "noctafin-resume",
          query: { resume: true, includeTypes: "Movie,Episode", minItems: 1 },
          layout: "landscape"
        }));
      }
      if (CONFIG.rows.showStudioRail) fragment.appendChild(createBrandShelf("Studios", studios, "studio"));

      if (CONFIG.rows.showGenreRows) {
        genres.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "",
            title: group.label,
            id: rowId("genre", group.label),
            query: { genreIds: group._ids, includeTypes: "Movie" },
            onTitleClick: () => navigateToNativeFilter(group, "genre")
          }));
        });
      }

      if (CONFIG.rows.showStudioRows) {
        studios.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "",
            title: group.label,
            id: rowId("studio", group.label),
            query: { studioIds: group._ids, includeTypes: "Movie" },
            onTitleClick: () => navigateToNativeFilter(group, "studio")
          }));
        });
      }

      if (CONFIG.rows.showNetworkRows) {
        networks.filter((group) => group._ids.length && group.kind !== "studio").forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "",
            title: group.label,
            id: rowId("network", group.label),
            query: { studioIds: group._ids, includeTypes: "Series" },
            onTitleClick: () => navigateToNativeFilter(group, "network")
          }));
        });
      }

      root.replaceChildren(fragment);
      setupRowObserver(root);
    } catch (error) {
      console.warn(LOG, "Sections personnalisées indisponibles", error);
    }
  }

  function insertCustomRoot(sections, root) {
    sections.insertBefore(root, sections.firstChild || null);
  }

  function cleanupTransient() {
    if (heroTimer) clearTimeout(heroTimer);
    heroTimer = null;
    rowObserver?.disconnect();
    rowObserver = null;
    $$(".noctafin-track-shell").forEach((shell) => shell._noctafinResizeObserver?.disconnect?.());
    heroItems = [];
    heroIndex = 0;
    backgroundIndex = 0;
  }

  async function mount() {
    auth = getAuth();
    const playbackActive = syncPlaybackMode();
    syncLumoChrome();

    if (playbackActive || document.documentElement.classList.contains("lumo-playback-pending")) {
      stopActivePreview();
      currentHome = null;
      clearTaxonomyHero();
      if (heroTimer) clearTimeout(heroTimer);
      heroTimer = null;
      if (playbackActive) clearDetailPage();
      return;
    }

    /* Route parameters are authoritative because Jellyfin 12 keeps previous
       pages mounted. Details are handled first so a stale home/list subtree can
       never leak through or receive layout CSS while a film/series is open. */
    if (isDetailRoute()) {
      stopActivePreview();
      currentHome = null;
      clearTaxonomyHero();
      if (heroTimer) clearTimeout(heroTimer);
      heroTimer = null;
      await syncDetailPage();
      syncBackgroundMedia();
      return;
    }

    clearDetailPage();

    if (isTaxonomyRoute()) {
      stopActivePreview();
      currentHome = null;
      if (heroTimer) clearTimeout(heroTimer);
      heroTimer = null;
      await syncTaxonomyPageHero();
      syncBackgroundMedia();
      return;
    }

    const found = locateHome();
    if (!found) {
      stopActivePreview();
      currentHome = null;
      clearTaxonomyHero();
      syncBackgroundMedia();
      return;
    }

    clearTaxonomyHero();
    syncBackgroundMedia();

    if (currentHome?.homeTab === found.homeTab && $("#noctafin-custom-sections", found.homeTab)) {
      syncNativeRows(found.sections);
      return;
    }

    cleanupTransient();
    currentHome = found;
    auth = getAuth();
    syncLumoChrome();
    if (!auth?.token || !auth?.userId) {
      console.warn(LOG, "Session Jellyfin introuvable; le thème CSS reste actif mais les sections dynamiques ne peuvent pas charger.");
      return;
    }

    $("#noctafin-hero", found.homeTab)?.remove();
    $("#noctafin-custom-sections", found.homeTab)?.remove();

    if (CONFIG.hero.enabled) {
      const hero = createHero();
      found.homeTab.insertBefore(hero, found.sections);
      initHero(hero);
    }

    const root = document.createElement("div");
    root.id = "noctafin-custom-sections";
    root.className = "noctafin-custom-sections";
    insertCustomRoot(found.sections, root);
    syncNativeRows(found.sections);
    initCustomRows(root);
  }

  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    requestAnimationFrame(() => {
      mountScheduled = false;
      mount().catch((error) => console.warn(LOG, error));
    });
  }

  function boot() {
    $("#noctafin-browser-page")?.remove();
    document.body?.classList.remove("noctafin-browser-open");
    auth = getAuth();
    startAmbientReflections();
    installPlaybackDelegation();
    syncPlaybackMode();
    syncLumoChrome();
    scheduleMount();
    const lumoOwnedSelector = "#noctafin-hero,#noctafin-custom-sections,#lumo-detail-page,#lumo-taxonomy-hero,#lumo-background-layer,#lumo-header-brand,#lumo-playback-error,.lumo-native-playback-bridge";
    const observer = new MutationObserver((records) => {
      /* Ignore mutations produced by Lumo itself. React/Jellyfin route changes,
         native rows and player surfaces still schedule a mount, but hero/card
         animations and lazy images no longer create a self-triggering loop. */
      const external = records.some((record) => {
        const target = record.target?.nodeType === 1 ? record.target : record.target?.parentElement;
        return !target?.closest?.(lumoOwnedSelector);
      });
      syncPlaybackMode();
      if (external) scheduleMount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleMount();
    });
    window.addEventListener("hashchange", scheduleMount);
    window.addEventListener("popstate", scheduleMount);
    document.addEventListener("play", () => { syncPlaybackMode(); scheduleMount(); }, true);
    document.addEventListener("playing", () => { syncPlaybackMode(); scheduleMount(); }, true);
    document.addEventListener("ended", () => setTimeout(() => { syncPlaybackMode(); scheduleMount(); }, 120), true);
    window.addEventListener("resize", () => {
      $$(".noctafin-track-shell").forEach((shell) => shell._noctafinUpdateArrows?.());
    }, { passive: true });
    setInterval(() => {
      if (document.hidden) return;
      syncLumoChrome();
      /* Route/mutation listeners are authoritative. The low-frequency watchdog
         only repairs a page if Jellyfin replaced a whole view silently. */
      if (!currentHome || isDetailRoute() || isTaxonomyRoute()) scheduleMount();
    }, 5000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
