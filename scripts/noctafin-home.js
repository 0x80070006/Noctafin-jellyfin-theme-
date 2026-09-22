(() => {
  "use strict";

  const LOG = "[Lumo]";
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
    rows: {
      rowLimit: 20,
      minItems: 2,
      scrollFactor: 0.82,
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
    "DateCreated"
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
      Authorization: `MediaBrowser Client="Jellyfin Web", Device="Lumo", DeviceId="lumo-home", Version="1.4", Token="${auth.token}"`
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
    try {
      window.location.hash = route;
    } catch (error) {
      console.warn(LOG, "Navigation impossible", error);
    }
  }

  function visibleById(id) {
    const nodes = $$(`[id="${id}"]`);
    for (const node of nodes) {
      if (!node.isConnected || node.hidden || node.classList.contains("hide")) continue;
      return node;
    }
    return nodes[nodes.length - 1] || null;
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

  function ensureLumoHeader(name, logoHref, season) {
    const headers = $$(".skinHeader, [class*='MuiAppBar-root'], header").filter((el) => {
      try { return getComputedStyle(el).display !== "none"; } catch { return true; }
    });
    if (!headers.length) return;

    for (const header of headers) {
      /* Jellyfin 12 Modern uses a MUI Link/Button to "/" for the server brand.
         Do not replace its React-managed children: style the existing control instead. */
      const serverName = String(auth?.serverName || "").trim();
      const modernServerButton = $$("a[class*='MuiButton-root'], button[class*='MuiButton-root']", header).find((el) => {
        const href = String(el.getAttribute("href") || "");
        const text = String(el.textContent || "").trim();
        let homeHref = href === "/" || href === "./" || /\/web\/?$/.test(href);
        try {
          if (href) {
            const url = new URL(href, window.location.href);
            homeHref = homeHref || /\/web\/?$/.test(url.pathname) || url.pathname === "/";
          }
        } catch { /* ignore malformed hrefs */ }
        const serverText = serverName && norm(text) === norm(serverName);
        return homeHref || serverText || el.dataset.lumoBrand === "true";
      });
      if (modernServerButton) {
        modernServerButton.classList.add("lumo-modern-server-button");
        modernServerButton.dataset.lumoBrand = "true";
        modernServerButton.dataset.lumoSeason = season;
        modernServerButton.setAttribute("aria-label", name);
        modernServerButton.setAttribute("title", name);
        $("#lumo-header-brand", header)?.remove();
        continue;
      }

      /* Classic layout: replacing the home button is safe because it is not a React ServerButton. */
      const classicHome = $(".headerHomeButton", header);
      if (classicHome && replaceBrandContents(classicHome, name, logoHref, season)) {
        $("#lumo-header-brand", header)?.remove();
        continue;
      }

      const pageTitle = $(".pageTitleWithDefaultLogo, .pageTitleWithLogo, .pageTitle", header);
      if (pageTitle) {
        pageTitle.classList.add("lumo-page-title-brand");
        pageTitle.style.setProperty("--lumo-brand-logo", `url("${logoHref}")`);
        pageTitle.setAttribute("aria-label", name);
        pageTitle.dataset.lumoBrandName = name;
      }

      const host = $(".headerLeft", header) || $(".headerTop", header) || $("[class*='MuiToolbar-root']", header) || header;
      let fallback = $("#lumo-header-brand", header);
      if (!fallback) {
        fallback = document.createElement("button");
        fallback.type = "button";
        fallback.id = "lumo-header-brand";
        fallback.className = "lumo-brand-button lumo-brand-fallback focusable";
        fallback.addEventListener("click", () => navigate("/home.html"));
        host.prepend(fallback);
      }
      replaceBrandContents(fallback, name, logoHref, season);
    }
  }

  function syncLumoChrome() {
    const season = activeSeason();
    const assets = seasonAssets(season);
    const logoHref = assetUrl(assets.logo);
    const root = document.documentElement;
    root.dataset.lumoSeason = season;
    root.style.setProperty("--lumo-current-logo", `url("${logoHref}")`);
    root.style.setProperty("--lumo-season-blur", `${Math.max(0, Number(CONFIG.seasonal.backgroundBlurPx) || 0)}px`);
    root.style.setProperty("--lumo-season-brightness", String(Math.max(0.2, Math.min(1, Number(CONFIG.seasonal.backgroundBrightness) || 0.56))));
    if (assets.background) root.style.setProperty("--lumo-season-background", `url("${assetUrl(assets.background)}")`);
    else root.style.removeProperty("--lumo-season-background");
    updateDocumentBrand(CONFIG.brand.name || "Lumo", logoHref);
    ensureLumoHeader(CONFIG.brand.name || "Lumo", logoHref, season);
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
          <button type="button" class="noctafin-hero__button noctafin-hero__button--primary focusable" data-action="play">▶ <span>Lecture</span></button>
          <button type="button" class="noctafin-hero__button focusable" data-action="info">ⓘ <span>Plus d'infos</span></button>
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
      SortBy: "Random"
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

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "noctafin-track-arrow noctafin-track-arrow--prev focusable";
    previous.setAttribute("aria-label", `Faire défiler ${label} vers la gauche`);
    previous.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>`;

    const track = document.createElement("div");
    track.className = trackClass;
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", label);

    previous.hidden = true;

    const next = document.createElement("button");
    next.type = "button";
    next.className = "noctafin-track-arrow noctafin-track-arrow--next focusable";
    next.setAttribute("aria-label", `Faire défiler ${label} vers la droite`);
    next.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>`;
    next.hidden = true;

    shell.append(previous, track, next);

    const update = () => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const hasOverflow = max > 8;
      const atStart = track.scrollLeft <= 6;
      const atEnd = track.scrollLeft >= max - 6;
      shell.classList.toggle("has-overflow", hasOverflow);
      previous.disabled = !hasOverflow || atStart;
      next.disabled = !hasOverflow || atEnd;
      previous.hidden = !hasOverflow || atStart;
      next.hidden = !hasOverflow || atEnd;
    };

    const amount = () => Math.max(260, track.clientWidth * Math.max(0.45, Math.min(0.95, Number(CONFIG.rows.scrollFactor) || 0.82)));
    previous.addEventListener("click", () => track.scrollBy({ left: -amount(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: amount(), behavior: "smooth" }));
    track.addEventListener("scroll", update, { passive: true });

    shell._noctafinUpdateArrows = update;
    requestAnimationFrame(update);
    setTimeout(update, 180);
    return { shell, track, previous, next, update };
  }

  function rowId(prefix, label) {
    return `noctafin-${prefix}-${norm(label).replace(/\s+/g, "-")}`;
  }


  function navigateToNativeFilter(group, kind = "genre") {
    if (!group?._ids?.length) return;
    const id = group._ids.find(Boolean);
    if (!id) return;
    const params = new URLSearchParams();
    if (kind === "genre") params.set("genreId", id);
    else params.set("studioId", id);
    params.set("type", kind === "network" ? "Series" : "Movie,Series");
    if (auth?.serverId) params.set("serverId", auth.serverId);
    params.set("name", group.label || "");
    navigate(`/list.html?${params.toString()}`);
  }

  function createBrandShelf(title, groups, prefix) {
    const section = document.createElement("section");
    section.className = "noctafin-shelf";
    section.appendChild(makeHeading("", title));

    const { shell, track, update } = createTrackShell("noctafin-brand-track", title);
    section.appendChild(shell);

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
        const logo = document.createElement("img");
        logo.className = "noctafin-brand__logo";
        logo.alt = group.label;
        logo.loading = "eager";
        logo.decoding = "async";
        logo.draggable = false;
        logo.referrerPolicy = "no-referrer";
        if (group.logoFilter) logo.style.filter = group.logoFilter;
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
    section.appendChild(makeHeading(kicker, title, onTitleClick));

    const { shell, track } = createTrackShell(`noctafin-card-track noctafin-card-track--${layout}`, title);
    section.appendChild(shell);
    return section;
  }

  async function fetchRowItems(query) {
    if (query.resume) {
      const params = new URLSearchParams({
        Limit: String(CONFIG.rows.rowLimit),
        Recursive: "true",
        IncludeItemTypes: query.includeTypes || "Movie,Episode",
        Fields: FIELDS
      });
      return (await fetchJson(`/Users/${auth.userId}/Items/Resume?${params}`)).Items || [];
    }

    const params = new URLSearchParams({
      Limit: String(CONFIG.rows.rowLimit),
      Recursive: "true",
      IncludeItemTypes: query.includeTypes || "Movie,Series",
      Fields: FIELDS,
      SortBy: "Random"
    });
    if (query.genreIds?.length) params.set("GenreIds", query.genreIds.join(","));
    if (query.studioIds?.length) params.set("StudioIds", query.studioIds.join(","));

    try {
      return (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    } catch {
      params.set("SortBy", "DateCreated");
      params.set("SortOrder", "Descending");
      return (await fetchJson(`/Users/${auth.userId}/Items?${params}`)).Items || [];
    }
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
      img.src = imageUrl(item.Id, "Backdrop", 0, 760);
      img.addEventListener("error", () => {
        const fallbackId = isEpisode ? (item.SeriesId || item.Id) : item.Id;
        img.src = imageUrl(fallbackId, "Primary", null, 600);
      }, { once: true });
    } else {
      const artId = isEpisode ? (item.SeriesId || item.Id) : item.Id;
      img.src = imageUrl(artId, "Primary", null, 480);
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
    heroItems = [];
    heroIndex = 0;
    backgroundIndex = 0;
  }

  async function mount() {
    auth = getAuth() || auth;
    syncLumoChrome();
    const found = locateHome();
    if (!found) return;

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
