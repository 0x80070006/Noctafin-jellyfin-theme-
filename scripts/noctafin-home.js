(() => {
  "use strict";

  const LOG = "[NoctaFin]";
  const DEFAULTS = {
    locale: "fr-FR",
    hero: { enabled: true, rotateEveryMs: 7000, maxItems: 8 },
    rows: {
      rowLimit: 20,
      minItems: 2,
      browsePageLimit: 120,
      scrollFactor: 0.82,
      dedupeNativeRows: true,
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
      return { base, token: server.AccessToken, userId: server.UserId };
    } catch {
      return null;
    }
  }

  function headers() {
    if (!auth?.token) return {};
    return {
      Authorization: `MediaBrowser Client="Jellyfin Web", Device="NoctaFin", DeviceId="noctafin-home", Version="1.0", Token="${auth.token}"`
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
      api_key: auth.token,
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

    const kickerNode = document.createElement("span");
    kickerNode.className = "noctafin-section-kicker";
    kickerNode.textContent = kicker;
    text.appendChild(kickerNode);

    if (typeof onTitleClick === "function") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "noctafin-section-title noctafin-section-title-button focusable";
      button.innerHTML = `<span class="noctafin-section-title__label"></span><span class="noctafin-section-title__arrow" aria-hidden="true">→</span>`;
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
    previous.innerHTML = `<span aria-hidden="true">‹</span>`;

    const track = document.createElement("div");
    track.className = trackClass;
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", label);

    const next = document.createElement("button");
    next.type = "button";
    next.className = "noctafin-track-arrow noctafin-track-arrow--next focusable";
    next.setAttribute("aria-label", `Faire défiler ${label} vers la droite`);
    next.innerHTML = `<span aria-hidden="true">›</span>`;

    shell.append(previous, track, next);

    const update = () => {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const hasOverflow = max > 8;
      shell.classList.toggle("has-overflow", hasOverflow);
      previous.disabled = !hasOverflow || track.scrollLeft <= 6;
      next.disabled = !hasOverflow || track.scrollLeft >= max - 6;
    };

    const amount = () => Math.max(260, track.clientWidth * Math.max(0.45, Math.min(0.95, Number(CONFIG.rows.scrollFactor) || 0.82)));
    previous.addEventListener("click", () => track.scrollBy({ left: -amount(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: amount(), behavior: "smooth" }));
    track.addEventListener("scroll", update, { passive: true });

    shell._noctafinUpdateArrows = update;
    requestAnimationFrame(update);
    return { shell, track, previous, next, update };
  }

  function rowId(prefix, label) {
    return `noctafin-${prefix}-${norm(label).replace(/\s+/g, "-")}`;
  }

  function createBrandShelf(title, groups, prefix) {
    const section = document.createElement("section");
    section.className = "noctafin-shelf";
    section.appendChild(makeHeading("Explorer", title));

    const { shell, track, update } = createTrackShell("noctafin-brand-track", title);
    section.appendChild(shell);

    groups.forEach((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "noctafin-brand focusable";
      button.style.setProperty("--brand-a", group.colors?.[0] || "#7c5cff");
      button.style.setProperty("--brand-b", group.colors?.[1] || "#25d7ff");
      if (group.darkText) button.style.color = "#080a11";

      const fallback = document.createElement("span");
      fallback.className = "noctafin-brand__name";
      fallback.textContent = group.label;
      button.appendChild(fallback);

      if (group.logo) {
        const logo = document.createElement("img");
        logo.className = "noctafin-brand__logo";
        logo.alt = group.label;
        logo.loading = "lazy";
        logo.decoding = "async";
        logo.referrerPolicy = "no-referrer";
        logo.src = group.logo;
        if (group.logoFilter) logo.style.filter = group.logoFilter;
        logo.addEventListener("load", () => button.classList.add("has-logo"), { once: true });
        logo.addEventListener("error", () => logo.remove(), { once: true });
        button.appendChild(logo);
      }

      if (!group._ids?.length) {
        button.setAttribute("aria-disabled", "true");
      } else {
        button.addEventListener("click", () => {
          document.getElementById(rowId(prefix, group.label))?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      track.appendChild(button);
    });

    requestAnimationFrame(update);
    return section;
  }

  function createLazyMediaRow({ kicker, title, id, query, onTitleClick = null }) {
    const section = document.createElement("section");
    section.className = "noctafin-media-row is-loading";
    section.id = id;
    section.dataset.noctafinQuery = JSON.stringify(query);
    section.appendChild(makeHeading(kicker, title, onTitleClick));

    const { shell, track } = createTrackShell("noctafin-card-track", title);
    section.appendChild(shell);
    return section;
  }

  async function fetchRowItems(query) {
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

  async function fetchBrowseItems(query, startIndex = 0) {
    const params = new URLSearchParams({
      StartIndex: String(Math.max(0, startIndex)),
      Limit: String(Math.max(24, Number(CONFIG.rows.browsePageLimit) || 120)),
      Recursive: "true",
      IncludeItemTypes: query.includeTypes || "Movie,Series",
      Fields: FIELDS,
      SortBy: "SortName",
      SortOrder: "Ascending"
    });
    if (query.genreIds?.length) params.set("GenreIds", query.genreIds.join(","));
    if (query.studioIds?.length) params.set("StudioIds", query.studioIds.join(","));
    return fetchJson(`/Users/${auth.userId}/Items?${params}`);
  }

  function closeBrowserPage() {
    $("#noctafin-browser-page")?.remove();
    document.body.classList.remove("noctafin-browser-open");
  }

  async function openGenreBrowser(group) {
    if (!group?._ids?.length) return;
    closeBrowserPage();

    const page = document.createElement("section");
    page.id = "noctafin-browser-page";
    page.className = "noctafin-browser-page";
    page.innerHTML = `
      <div class="noctafin-browser-page__ambient" aria-hidden="true"></div>
      <header class="noctafin-browser-page__header">
        <button type="button" class="noctafin-browser-page__back focusable" aria-label="Retour">←</button>
        <div>
          <span class="noctafin-section-kicker">Genre</span>
          <h1 class="noctafin-browser-page__title"></h1>
          <p class="noctafin-browser-page__count">Chargement…</p>
        </div>
      </header>
      <div class="noctafin-browser-page__grid" aria-live="polite"></div>
      <div class="noctafin-browser-page__footer">
        <button type="button" class="noctafin-browser-page__more focusable" hidden>Charger plus</button>
      </div>
    `;

    $(".noctafin-browser-page__title", page).textContent = group.label;
    const back = $(".noctafin-browser-page__back", page);
    const grid = $(".noctafin-browser-page__grid", page);
    const count = $(".noctafin-browser-page__count", page);
    const more = $(".noctafin-browser-page__more", page);
    back.addEventListener("click", closeBrowserPage);

    document.body.appendChild(page);
    document.body.classList.add("noctafin-browser-open");
    page.scrollTop = 0;
    back.focus({ preventScroll: true });

    let startIndex = 0;
    let total = 0;
    let loading = false;
    const query = { genreIds: group._ids, includeTypes: "Movie,Series" };

    const load = async () => {
      if (loading) return;
      loading = true;
      more.disabled = true;
      more.textContent = "Chargement…";
      try {
        const data = await fetchBrowseItems(query, startIndex);
        const items = data.Items || [];
        total = Number(data.TotalRecordCount) || items.length;
        grid.append(...items.map(makeCard));
        startIndex += items.length;
        count.textContent = `${total.toLocaleString(CONFIG.locale)} titre${total > 1 ? "s" : ""}`;
        more.hidden = !items.length || startIndex >= total;
        more.textContent = "Charger plus";
      } catch (error) {
        console.warn(LOG, "Page de genre indisponible", error);
        count.textContent = "Impossible de charger ce genre.";
        more.hidden = true;
      } finally {
        loading = false;
        more.disabled = false;
      }
    };

    more.addEventListener("click", load);
    await load();
  }

  function makeCard(item) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "noctafin-card focusable";
    card.dataset.id = item.Id;
    const title = item.Type === "Episode" ? (item.SeriesName || item.Name) : item.Name;
    const rating = Number(item.CommunityRating);
    card.innerHTML = `
      <span class="noctafin-card__art"><img loading="lazy" alt=""></span>
      <span class="noctafin-card__title"></span>
      <span class="noctafin-card__meta"><span class="noctafin-card__year"></span><span class="noctafin-card__rating"></span></span>
    `;
    const img = $("img", card);
    img.alt = title || "";
    img.src = imageUrl(item.Id, "Primary", null, 480);
    $(".noctafin-card__title", card).textContent = title || "Sans titre";
    $(".noctafin-card__year", card).textContent = item.ProductionYear || "";
    $(".noctafin-card__rating", card).textContent = Number.isFinite(rating) && rating > 0 ? `★ ${rating.toFixed(1)}` : "";
    card.addEventListener("click", () => {
      if (card.closest("#noctafin-browser-page")) closeBrowserPage();
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
      if (items.length < CONFIG.rows.minItems) {
        section.classList.remove("is-loading");
        section.classList.add("is-empty");
        return;
      }
      const track = $(".noctafin-card-track", section);
      track.replaceChildren(...items.map(makeCard));
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
      if (CONFIG.rows.showStudioRail) fragment.appendChild(createBrandShelf("Studios", studios, "studio"));
      if (CONFIG.rows.showNetworkRail) fragment.appendChild(createBrandShelf("Réseaux TV", networks, "network"));

      if (CONFIG.rows.showGenreRows) {
        genres.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "Genre",
            title: group.label,
            id: rowId("genre", group.label),
            query: { genreIds: group._ids, includeTypes: "Movie,Series" },
            onTitleClick: () => openGenreBrowser(group)
          }));
        });
      }

      if (CONFIG.rows.showStudioRows) {
        studios.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "Studio",
            title: group.label,
            id: rowId("studio", group.label),
            query: { studioIds: group._ids, includeTypes: "Movie,Series" }
          }));
        });
      }

      if (CONFIG.rows.showNetworkRows) {
        networks.filter((group) => group._ids.length).forEach((group) => {
          fragment.appendChild(createLazyMediaRow({
            kicker: "Réseau TV",
            title: group.label,
            id: rowId("network", group.label),
            query: { studioIds: group._ids, includeTypes: "Series" }
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
    const native = Array.from(sections.children).filter((el) => el !== root && !el.classList.contains("noctafin-custom-sections"));
    const anchor = native[1] || native[0] || null;
    if (anchor?.nextSibling) sections.insertBefore(root, anchor.nextSibling);
    else sections.appendChild(root);
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
    const found = locateHome();
    if (!found) return;

    if (currentHome?.homeTab === found.homeTab && $("#noctafin-custom-sections", found.homeTab)) {
      dedupeNativeRows(found.sections);
      return;
    }

    cleanupTransient();
    currentHome = found;
    auth = getAuth();
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
    dedupeNativeRows(found.sections);
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
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && $("#noctafin-browser-page")) closeBrowserPage();
    });
    setInterval(scheduleMount, 2500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
