(() => {
  "use strict";

  const LOG = "[Lumo]";
  const VERSION = "1.8.0";
  const DEFAULTS = {
    locale: "fr-FR",
    brand: {
      name: "Lumo",
      logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.png",
      logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.png",
      logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.png"
    },
    seasonal: {
      enabled: true,
      forceSeason: "auto",
      halloweenMonth: 10,
      christmasMonth: 12,
      halloweenBackground: "ui/noctafin-assets/seasonal/background-halloween.png",
      christmasBackground: "ui/noctafin-assets/seasonal/background-christmas.png",
      backgroundBlurPx: 8,
      backgroundBrightness: 0.56
    },
    hero: { enabled: true, rotateEveryMs: 7000, maxItems: 8 },
    background: {
      video: "ui/noctafin-assets/background/lumo-japan-night-1080p.mp4",
      videoOpacity: 0.62,
      overlayOpacity: 0.54,
      homeOnly: true
    },
    taxonomyHero: { enabled: true, maxItems: 18 },
    rows: {
      rowLimit: 12,
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
    brand: { ...DEFAULTS.brand, ...(source.brand || {}) },
    seasonal: { ...DEFAULTS.seasonal, ...(source.seasonal || {}) },
    hero: { ...DEFAULTS.hero, ...(source.hero || {}) },
    background: { ...DEFAULTS.background, ...(source.background || {}) },
    taxonomyHero: { ...DEFAULTS.taxonomyHero, ...(source.taxonomyHero || {}) },
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
    "SeriesPrimaryImageTag"
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
  let taxonomyHeroKey = "";
  let taxonomyHeroRequest = 0;

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
      const server = servers.find((entry) => entry.AccessToken && entry.UserId && sameServer(entry))
        || servers.find((entry) => entry.AccessToken && entry.UserId);
      if (!server) return null;
      return { base, token: server.AccessToken, userId: server.UserId, serverId: server.Id || "", serverName: server.Name || "" };
    } catch {
      return null;
    }
  }

  function headers() {
    if (!auth?.token) return {};
    return {
      Authorization: `MediaBrowser Client="Jellyfin Web", Device="Lumo", DeviceId="lumo-home", Version="1.7", Token="${auth.token}"`
    };
  }

  async function fetchJson(path) {
    const response = await fetch(`${auth.base}${path}`, { headers: headers() });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path}`);
    return response.json();
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
      #lumo-background-layer{position:fixed!important;inset:0!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important}
      #lumo-background-art,#lumo-background-video,#lumo-background-shade{position:absolute!important;pointer-events:none!important}
      #lumo-background-art{inset:-30px!important;background-color:#02030a!important;will-change:transform,filter,background-position}
      #lumo-background-video{inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;opacity:0!important}
      #lumo-background-shade{inset:0!important;background:linear-gradient(180deg,rgba(1,2,7,.05),rgba(1,2,7,.18) 60%,rgba(1,2,7,.32))!important}
      html[data-lumo-season="halloween"] #lumo-background-art,html[data-lumo-season="christmas"] #lumo-background-art{background-image:var(--lumo-season-background)!important;background-size:cover!important;background-position:center!important;filter:blur(var(--lumo-season-blur,8px)) brightness(var(--lumo-season-brightness,.56)) saturate(.92)!important;transform:scale(1.07)!important}
      html[data-lumo-season="default"] #lumo-background-art{background-image:radial-gradient(circle at 13% 17%,rgba(124,92,255,.26),transparent 43%),radial-gradient(circle at 83% 12%,rgba(37,215,255,.20),transparent 44%),radial-gradient(circle at 75% 79%,rgba(255,79,163,.18),transparent 43%),linear-gradient(180deg,#03040a,#010207)!important;background-size:82vmax 82vmax,76vmax 76vmax,84vmax 84vmax,100% 100%!important;background-position:-28vmax -26vmax,68vw -28vmax,62vw 62vh,center!important}
      html.lumo-ui #reactRoot,html.lumo-ui #root,html.lumo-ui .mainAnimatedPages,html.lumo-ui .page,html.lumo-ui .backgroundContainer,html.lumo-ui main,html.lumo-ui main.MuiBox-root,html.lumo-ui #reactRoot>div,html.lumo-ui #reactRoot>div>.MuiBox-root{background-color:transparent!important;background-image:none!important}
      html.lumo-ui #reactRoot,html.lumo-ui #root,html.lumo-ui .mainAnimatedPages{position:relative!important;z-index:1!important}
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

      const video = document.createElement("video");
      video.id = "lumo-background-video";
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.disablePictureInPicture = true;
      video.setAttribute("tabindex", "-1");
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("error", () => document.documentElement.classList.add("lumo-video-failed"));

      const shade = document.createElement("div");
      shade.id = "lumo-background-shade";
      layer.append(art, video, shade);
      document.body.prepend(layer);
    }
    return layer;
  }

  function shouldUseHomeVideo() {
    if (!CONFIG.background.video) return false;
    if (activeSeason() !== "default") return false;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!CONFIG.background.homeOnly) return true;
    const found = locateHome();
    if (!found?.homeTab?.isConnected) return false;
    try {
      const style = getComputedStyle(found.homeTab);
      return style.display !== "none" && style.visibility !== "hidden" && !found.homeTab.hidden;
    } catch {
      return true;
    }
  }

  function syncBackgroundMedia() {
    const layer = ensureBackgroundLayer();
    const video = layer?.querySelector?.("#lumo-background-video");
    if (!video) return;

    const enabled = shouldUseHomeVideo();
    document.documentElement.classList.toggle("lumo-video-active", enabled);
    document.documentElement.style.setProperty("--lumo-video-opacity", String(Math.max(0, Math.min(1, Number(CONFIG.background.videoOpacity) || 0.62))));
    document.documentElement.style.setProperty("--lumo-video-overlay", String(Math.max(0, Math.min(0.95, Number(CONFIG.background.overlayOpacity) || 0.54))));

    if (enabled) {
      const src = assetUrl(CONFIG.background.video);
      if (video.getAttribute("src") !== src) video.setAttribute("src", src);
      if (video.paused) {
        const promise = video.play?.();
        if (promise?.catch) promise.catch(() => {});
      }
    } else {
      try { video.pause?.(); } catch { /* ignore */ }
    }
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

    const headers = $$(".skinHeader, header.MuiAppBar-root, header").filter((header, index, list) => {
      if (!header.isConnected || list.some((other, i) => i < index && other.contains(header))) return false;
      try { return getComputedStyle(header).display !== "none"; } catch { return true; }
    });

    for (const header of headers) {
      const candidates = [
        $(".headerHomeButton", header),
        ...$$("a,button", header).filter(looksLikeNativeServerBrand),
        ...$$(".pageTitleWithDefaultLogo,.pageTitleWithLogo", header).filter(looksLikeNativeServerBrand)
      ].filter(Boolean);
      const nativeBrand = candidates[0] || null;
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
    ensureBackgroundLayer();

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
    syncBackgroundMedia();
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
    [...resume, ...random].forEach((item) => {
      if (item?.Id && !merged.has(item.Id)) merged.set(item.Id, item);
    });

    return Array.from(merged.values()).slice(0, CONFIG.hero.maxItems);
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
    play.onclick = () => {
      if (item.Type === "Series") navigate(`/details?id=${encodeURIComponent(item.Id)}`);
      else navigate(`/video?id=${encodeURIComponent(item.Id)}`);
    };

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
    if (taxonomyCache) return taxonomyCache;
    const [genresResult, studiosResult] = await Promise.allSettled([
      fetchJson(`/Genres?UserId=${encodeURIComponent(auth.userId)}&Recursive=true&IncludeItemTypes=Movie,Series&Limit=500`),
      fetchJson(`/Studios?UserId=${encodeURIComponent(auth.userId)}&Recursive=true&Limit=800`)
    ]);
    taxonomyCache = {
      genres: genresResult.status === "fulfilled" ? (genresResult.value.Items || []) : [],
      studios: studiosResult.status === "fulfilled" ? (studiosResult.value.Items || []) : []
    };
    return taxonomyCache;
  }

  function resolveIds(entries, aliases) {
    const aliasNorms = (aliases || []).map(norm).filter(Boolean);
    return entries
      .filter((entry) => {
        const name = norm(entry.Name);
        return aliasNorms.some((alias) => name === alias || name.includes(alias) || alias.includes(name));
      })
      .map((entry) => entry.Id)
      .filter(Boolean);
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
      if (!first) return { max, step: Math.max(240, track.clientWidth) };
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      const cardWidth = first.getBoundingClientRect().width || first.clientWidth || 1;
      const visible = clamp(Math.floor((track.clientWidth + gap + 1) / (cardWidth + gap)), 1, 12);
      return { max, step: Math.max(cardWidth + gap, visible * (cardWidth + gap)) };
    };

    const update = () => {
      const { max } = metrics();
      const hasOverflow = max > 6;
      const atStart = track.scrollLeft <= 4;
      const atEnd = track.scrollLeft >= max - 4;
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
      setTimeout(() => button.classList.remove("is-clicked"), 190);
    };

    const scrollPage = (direction, button) => {
      const { max, step } = metrics();
      if (max <= 0) return;
      const target = clamp(track.scrollLeft + direction * step, 0, max);
      pulse(button);
      track.scrollTo({ left: target, behavior: "smooth" });
      setTimeout(update, 360);
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

    /* Vertical wheel intent must always keep scrolling the page. A horizontal
       track must never trap the user on the home page. */
    track.addEventListener("wheel", (event) => {
      const dx = Math.abs(event.deltaX);
      const dy = Math.abs(event.deltaY);
      if (dy < 1 || dy <= dx * 1.15) return;

      let scroller = track.parentElement;
      while (scroller && scroller !== document.body) {
        const css = getComputedStyle(scroller);
        const scrollable = /(auto|scroll|overlay)/.test(css.overflowY) && scroller.scrollHeight > scroller.clientHeight + 4;
        if (scrollable) break;
        scroller = scroller.parentElement;
      }
      if (!scroller || scroller === document.body) scroller = document.scrollingElement || document.documentElement;
      if (!scroller) return;

      const unit = event.deltaMode === 1 ? 32 : (event.deltaMode === 2 ? window.innerHeight : 1);
      const delta = event.deltaY * unit;
      if (event.cancelable) event.preventDefault();
      if (scroller === document.scrollingElement || scroller === document.documentElement) {
        window.scrollBy({ top: delta, behavior: "auto" });
      } else {
        scroller.scrollTop += delta;
      }
    }, { passive: false });

    track.addEventListener("scroll", update, { passive: true });

    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => requestAnimationFrame(update)) : null;
    resizeObserver?.observe(track);
    shell._noctafinResizeObserver = resizeObserver;
    shell._noctafinUpdateArrows = update;
    requestAnimationFrame(update);
    setTimeout(update, 80);
    setTimeout(update, 320);
    return { shell, track, nav, previous, next, update };
  }

  function rowId(prefix, label) {
    return `noctafin-${prefix}-${norm(label).replace(/\s+/g, "-")}`;
  }


  function navigateToNativeFilter(group, kind = "genre") {
    if (!group?._ids?.length) return;
    const id = group._ids.find(Boolean);
    if (!id) return;

    const context = {
      kind,
      id,
      ids: group._ids.filter(Boolean),
      label: group.label || "",
      colors: Array.isArray(group.colors) ? group.colors.slice(0, 2) : [],
      logo: group.logo || "",
      logoFilter: group.logoFilter || "none"
    };
    try { sessionStorage.setItem("lumo.taxonomyContext", JSON.stringify(context)); } catch { /* ignore */ }

    const params = new URLSearchParams();
    if (kind === "genre") params.set("genreId", id);
    else params.set("studioId", id);
    params.set("type", kind === "network" ? "Series" : "Movie,Series");
    if (auth?.serverId) params.set("serverId", auth.serverId);
    if (group.label) params.set("name", group.label);

    const page = isModernJellyfin() ? "/list" : "/list.html";
    navigate(`${page}?${params.toString()}`);
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

  function taxonomyPalette(label) {
    const palettes = [
      ["#7c5cff", "#25d7ff"], ["#ff4fa3", "#7c5cff"], ["#ff8a34", "#ff3f81"],
      ["#34e3b5", "#1f8fff"], ["#e9bf46", "#ff713d"], ["#8d68ff", "#d84fff"]
    ];
    let hash = 0;
    for (const char of String(label || "")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return palettes[Math.abs(hash) % palettes.length];
  }

  async function resolveTaxonomyContext() {
    if (!CONFIG.taxonomyHero.enabled) return null;
    const params = getRouteParams();
    const genreId = params.get("genreId") || params.get("GenreId");
    const studioId = params.get("studioId") || params.get("StudioId");
    if (!genreId && !studioId) return null;

    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem("lumo.taxonomyContext") || "null"); } catch { stored = null; }
    const routeId = genreId || studioId;
    if (stored && (stored.id === routeId || stored.ids?.includes?.(routeId))) {
      return { ...stored, id: routeId, ids: stored.ids?.length ? stored.ids : [routeId] };
    }

    const taxonomy = await getTaxonomies();
    if (genreId) {
      for (const group of CONFIG.genres) {
        const ids = resolveIds(taxonomy.genres, group.aliases);
        if (ids.includes(genreId)) return { kind: "genre", id: genreId, ids, label: group.label, colors: group.colors || taxonomyPalette(group.label), logo: "" };
      }
      return { kind: "genre", id: genreId, ids: [genreId], label: params.get("name") || "Genre", colors: taxonomyPalette(params.get("name") || genreId), logo: "" };
    }

    const groups = [...CONFIG.studios.map((g) => ({ ...g, kind: "studio" })), ...CONFIG.networks.map((g) => ({ ...g, kind: "network" }))];
    for (const group of groups) {
      const ids = resolveIds(taxonomy.studios, group.aliases);
      if (ids.includes(studioId)) return { kind: group.kind, id: studioId, ids, label: group.label, colors: group.colors || taxonomyPalette(group.label), logo: group.logo || "", logoFilter: group.logoFilter || "none" };
    }
    return { kind: "studio", id: studioId, ids: [studioId], label: params.get("name") || "Studio", colors: taxonomyPalette(params.get("name") || studioId), logo: "", logoFilter: "none" };
  }

  function findTaxonomyHost() {
    const selectors = [
      "#reactRoot main[role='main']",
      "#reactRoot main",
      "main[role='main']",
      "main.MuiBox-root",
      ".mainAnimatedPage:not(.hide)",
      ".page:not(.hide)",
      "main"
    ];
    const candidates = [];
    const seen = new Set();
    for (const selector of selectors) {
      for (const node of $$(selector)) {
        if (!node?.isConnected || seen.has(node)) continue;
        seen.add(node);
        if (node.id === "indexPage" || node.closest?.("#indexPage")) continue;
        if (node.closest?.("header,nav,aside,[role='navigation']")) continue;
        try {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
          if (rect.width < 320 || rect.height < 120) continue;
          const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
          const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
          const viewportArea = visibleWidth * visibleHeight;
          const contentBonus = node.querySelector?.("[class*='card'],[class*='grid'],[data-testid],.itemsContainer") ? 1.2 : 1;
          candidates.push({ node, score: viewportArea * contentBonus + rect.width * 100 });
        } catch { /* ignore */ }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.node || null;
  }

  function clearTaxonomyHero() {
    taxonomyHeroKey = "";
    taxonomyHeroRequest += 1;
    $("#lumo-taxonomy-hero")?.remove();
    const root = document.documentElement;
    delete root.dataset.lumoTaxonomyKind;
    root.style.removeProperty("--lumo-taxonomy-a");
    root.style.removeProperty("--lumo-taxonomy-b");
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

    /* Genres should look cinematic: prefer an actual film with a backdrop.
       Studio/network pages may use films or series. Random is attempted first,
       with a deterministic recent-items fallback for Jellyfin builds that do
       not expose Random sorting on this endpoint. */
    const typePlans = context.kind === "genre"
      ? ["Movie", "Movie,Series"]
      : [context.kind === "network" ? "Series" : "Movie,Series"];

    for (const includeTypes of typePlans) {
      for (const sortBy of ["Random", "DateCreated"]) {
        try {
          const items = await fetchTaxonomyCandidates(context, includeTypes, sortBy);
          if (!items.length) continue;
          const preferred = items.filter(hasBackdropArt);
          const pool = preferred.length ? preferred : items;
          return pool[Math.floor(Math.random() * pool.length)] || pool[0] || null;
        } catch (error) {
          console.debug(LOG, "Hero taxonomie: essai suivant", context.label, includeTypes, sortBy, error);
        }
      }
    }
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

  async function syncTaxonomyPageHero() {
    if (!auth?.token || !auth?.userId) return;
    if (locateHome()) {
      clearTaxonomyHero();
      return;
    }
    const context = await resolveTaxonomyContext();
    if (!context) {
      clearTaxonomyHero();
      return;
    }

    const host = findTaxonomyHost();
    if (!host) return;
    const key = `${context.kind}:${context.id}`;
    const existing = $("#lumo-taxonomy-hero");
    if (existing?.isConnected && taxonomyHeroKey === key && existing.dataset.key === key) return;

    const requestId = ++taxonomyHeroRequest;
    const item = await fetchTaxonomyHeroItem(context).catch(() => null);
    if (requestId !== taxonomyHeroRequest) return;

    $("#lumo-taxonomy-hero")?.remove();
    taxonomyHeroKey = key;
    const colors = context.colors?.length >= 2 ? context.colors : taxonomyPalette(context.label);
    const root = document.documentElement;
    root.dataset.lumoTaxonomyKind = context.kind;
    root.style.setProperty("--lumo-taxonomy-a", colors[0] || "#7c5cff");
    root.style.setProperty("--lumo-taxonomy-b", colors[1] || colors[0] || "#25d7ff");
    host.prepend(buildTaxonomyHero(context, item));
    syncBackgroundMedia();
  }

  function createBrandShelf(title, groups, prefix) {
    const section = document.createElement("section");
    section.className = "noctafin-shelf";

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
      } else {
        button.addEventListener("click", () => navigateToNativeFilter(group, prefix === "network" ? "network" : "studio"));
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

  async function fetchRowItems(query) {
    /* Contract: a media rail contains at most twelve items. CSS keeps six
       visible on desktop; the second six are reached with the rail arrows. */
    const configuredLimit = Number(query?.limit ?? CONFIG.rows.rowLimit);
    const rowLimit = Math.max(1, Math.min(12, Number.isFinite(configuredLimit) ? configuredLimit : 12));
    if (query.resume) {
      const params = new URLSearchParams({
        Limit: String(rowLimit),
        Recursive: "true",
        IncludeItemTypes: query.includeTypes || "Movie,Episode",
        Fields: FIELDS,
        EnableImageTypes: "Primary,Backdrop,Thumb",
        ImageTypeLimit: "2",
        EnableTotalRecordCount: "false"
      });
      const result = (await fetchJson(`/Users/${auth.userId}/Items/Resume?${params}`)).Items || [];
      return result.slice(0, rowLimit);
    }

    const params = new URLSearchParams({
      Limit: String(rowLimit),
      Recursive: "true",
      IncludeItemTypes: query.includeTypes || "Movie,Series",
      Fields: FIELDS,
      SortBy: "Random",
      EnableImageTypes: "Primary,Backdrop,Thumb",
      ImageTypeLimit: "2",
      EnableTotalRecordCount: "false"
    });
    if (query.genreIds?.length) params.set("GenreIds", query.genreIds.join(","));
    if (query.studioIds?.length) params.set("StudioIds", query.studioIds.join(","));

    try {
      const result = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
      return result.slice(0, rowLimit);
    } catch {
      params.set("SortBy", "DateCreated");
      params.set("SortOrder", "Descending");
      const result = (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
      return result.slice(0, rowLimit);
    }
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
    card.addEventListener("click", () => {
      navigate(`/details?id=${encodeURIComponent(detailsId(item))}`);
    });
    return card;
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

      const genres = CONFIG.genres.map((group) => ({ ...group, _ids: resolveIds(taxonomy.genres, group.aliases) }));
      const studios = CONFIG.studios.map((group) => ({ ...group, _ids: resolveIds(taxonomy.studios, group.aliases) }));
      const networks = CONFIG.networks.map((group) => ({ ...group, _ids: resolveIds(taxonomy.studios, group.aliases) }));

      const fragment = document.createDocumentFragment();
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
      if (CONFIG.rows.showNetworkRail) fragment.appendChild(createBrandShelf("Réseaux TV", networks, "network"));

      if (CONFIG.rows.showGenreRows) {
        genres.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "",
            title: group.label,
            id: rowId("genre", group.label),
            query: { genreIds: group._ids, includeTypes: "Movie,Series" },
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
            query: { studioIds: group._ids, includeTypes: "Movie,Series" },
            onTitleClick: () => navigateToNativeFilter(group, "studio")
          }));
        });
      }

      if (CONFIG.rows.showNetworkRows) {
        networks.filter((group) => group._ids.length).forEach((group) => {
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
    auth = getAuth() || auth;
    syncLumoChrome();
    const found = locateHome();
    if (!found) {
      currentHome = null;
      await syncTaxonomyPageHero();
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
    auth = getAuth() || auth;
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
    auth = getAuth() || auth;
    syncLumoChrome();
    scheduleMount();
    const observer = new MutationObserver(scheduleMount);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleMount();
    });
    window.addEventListener("hashchange", scheduleMount);
    window.addEventListener("popstate", scheduleMount);
    window.addEventListener("resize", () => {
      $$(".noctafin-track-shell").forEach((shell) => shell._noctafinUpdateArrows?.());
    }, { passive: true });
    setInterval(() => {
      syncLumoChrome();
      scheduleMount();
    }, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
