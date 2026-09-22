# Lumo — thème cinématique pour Jellyfin 12

Lumo personnalise l'accueil Jellyfin 12 avec un hero rotatif, `Continuer de regarder`, des rails Studios / Réseaux TV / Genres, un branding saisonnier automatique et une interface sombre animée.

Le dépôt conserve les noms techniques `noctafin-*.js` pour rester compatible avec les installations précédentes, mais l'application visible s'appelle **Lumo**.

## v1.4.0 — correctif de stabilité Jellyfin 12

Cette version corrige spécifiquement les problèmes observés sur Jellyfin 12 :

- le bouton serveur du header moderne est maintenant ciblé directement et habillé en **Lumo + logo saisonnier** sans modifier ses enfants React ;
- fallback supplémentaire pour le header classique `.pageTitleWithDefaultLogo` / `.pageTitleWithLogo` ;
- les scripts injectés ont désormais `?v=1.4.0`, ce qui évite de garder un ancien JS en cache avec un CSS plus récent ;
- logos Studios / Réseaux placés dans un conteneur flex dédié : ils restent entièrement visibles et centrés ;
- le texte de secours `PIXAR`, `MARVEL`, etc. disparaît dès que le logo est chargé ;
- les flèches gauche/droite sont de vrais boutons ronds avec chevrons SVG, centrés sur l'artwork aux deux extrémités du rail ; les états inactifs sont réellement retirés du rendu pour supprimer les petites pilules grises ;
- les jaquettes utilisent une hauteur calculée selon la hauteur de l'écran, restent au ratio 2:3 et sont affichées en entier avec `object-fit: contain` ;
- aucune jaquette Lumo n'a de défilement vertical interne ; titre, année et note restent directement sous l'affiche ;
- les titres `Action`, `Aventure`, `Pixar`, `Netflix`, etc. sont du texte cliquable moderne et non sélectionnable ;
- un clic sur un genre, un studio ou une tuile Studio/Réseau ouvre maintenant la **liste native Jellyfin** filtrée (`#/list.html?...`) au lieu de l'ancienne page plein écran Lumo qui pouvait casser la mise en page ;
- les anciennes pages plein écran Lumo sont désactivées.

## Ordre de l'accueil

1. Hero cinématique
2. Continuer de regarder
3. Studios
4. Réseaux TV
5. Genres
6. Lignes par studio
7. Lignes par réseau TV

Les lignes d'accueil natives Jellyfin sont masquées lorsque `hideNativeHomeRows: true`.

## Installation CSS

Dépôt actuel :

`https://github.com/0x80070006/Noctafin-jellyfin-theme-`

Dans **Jellyfin → Tableau de bord → Général / Branding → CSS personnalisé** :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.4.0");
```

## Mise à jour dans ton LXC Jellyfin / Proxmox

Après avoir envoyé cette version sur GitHub :

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Vérifie ensuite que le nouveau JS est bien injecté :

```bash
grep -n "noctafin-.*v=1.4.0" /usr/share/jellyfin/web/index.html
```

Tu dois voir :

```html
<script src="ui/noctafin-config.js?v=1.4.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.4.0" data-noctafin-home></script>
```

Puis fais **Ctrl+F5** dans le navigateur.

## Branding Lumo et saisons

La saison est choisie d'après le mois du navigateur :

- octobre → Halloween ;
- décembre → Noël ;
- le reste de l'année → logo bleu + fond sombre avec halos violet/cyan/rose animés.

Configuration : `scripts/noctafin-config.js`.

```js
brand: {
  name: "Lumo",
  logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.png",
  logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.png",
  logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.png"
}
```

Les fonds Halloween/Noël restent assombris et floutés via :

```js
backgroundBlurPx: 8,
backgroundBrightness: 0.56
```

## Navigation Genres / Studios

Lumo récupère les vrais identifiants de genres et studios via l'API Jellyfin. Les clics passent ensuite par une page native Jellyfin :

```text
#/list.html?genreId=<ID>
#/list.html?studioId=<ID>
```

Cela évite de superposer un second navigateur de médias au-dessus de l'accueil Jellyfin.

## Studios et réseaux inclus

Studios : Pixar, Marvel, Disney, 20th Century, Columbia, Paramount.

Réseaux TV : Apple TV+, Netflix, BBC, Cartoon Network, ABC, MTV.

Les alias se règlent dans `scripts/noctafin-config.js`.

## Mise à jour ultérieure

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Une mise à jour de Jellyfin peut remplacer `index.html`. Dans ce cas, relance simplement l'installateur.

## Désinstallation

```bash
cd /opt/Noctafin-jellyfin-theme-
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/uninstall.sh
systemctl restart jellyfin
```

Retire ensuite l'`@import` du CSS personnalisé.

## Vérification

```bash
npm run check
bash -n install/install.sh
```

## Inspirations

- NetFin — https://github.com/ya0903/NetFin
- Abyss — https://github.com/AumGupta/abyss-jellyfin
- Jellyfish — https://github.com/n00bcodr/Jellyfish

## Licence

MIT — voir `LICENSE`.
