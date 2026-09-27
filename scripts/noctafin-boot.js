/* Executed in <head> before Jellyfin's deferred bundles. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("lumo-boot-enabled", "lumo-transitioning");
  if (document.getElementById("lumo-page-loader")) return;
  const loader = document.createElement("div");
  loader.id = "lumo-page-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.dataset.mode = "startup";
  loader.dataset.startedAt = String(performance.now());
  loader.dataset.generation = "1";
  loader.innerHTML = '<div class="lumo-liquid-loader" aria-hidden="true">' +
    Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}"></i>`).join("") +
    '</div><span class="lumo-page-loader__label">Chargement de Lumo</span>';
  root.appendChild(loader);
  /* The app must remain usable if the main runtime cannot start. */
  setTimeout(() => {
    if (!loader.isConnected || loader.dataset.mode !== "startup") return;
    loader.classList.add("is-done");
    root.classList.remove("lumo-transitioning");
    setTimeout(() => loader.remove(), 650);
  }, 12000);
})();
