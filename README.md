# Lumo — thème cinématique pour Jellyfin 12

Lumo remplace l'accueil Jellyfin par une interface sombre et cinématique avec hero rotatif, **Continuer de regarder** façon Abyss, rails Studios/Réseaux/Genres, branding Lumo et habillage saisonnier.

## Nouveautés 1.8.0

- Chaque ligne média charge **12 films/séries maximum** : 6 restent visibles sur desktop et les 6 suivants sont accessibles avec les flèches.
- 6 cartes visibles par ligne sur desktop, 4 sur tablette, 2 sur mobile.
- `Continuer de regarder` en 16:9, titres et métadonnées toujours dans le flux de page.
- Aucune carte ne possède de scroll vertical interne.
- Le zoom de survol reste strictement à l'intérieur de la vignette ou de la carte studio.
- Les rails horizontaux ne bloquent plus la molette verticale de la page.
- Flèches type Abyss : chevrons en haut à droite, pas de défilement calculé à partir de la largeur réelle des cartes, animation au clic.
- Bouton `Lecture` du hero en SVG et correctifs des boutons Play natifs Jellyfin.
- Fond vidéo nocturne japonais sur l'accueil en saison normale, compressé en H.264 1080p/24 fps sans audio (~0,8 Mo) avec overlay sombre.
- Octobre conserve le fond Halloween, décembre le fond Noël.
- Pages Genres / Studios / Réseaux : la grille et les filtres restent **natifs Jellyfin**, Lumo injecte uniquement un hero cinématique au-dessus.
- Hero Genre : backdrop prioritairement issu d'un **film aléatoire du genre**, léger flou cinématique et nom du genre en très grand.
- Hero Studio/Réseau : backdrop aléatoire + **logo officiel local contenu sans débordement** + ambiance de page teintée avec les couleurs configurées.
- Le hero de taxonomie possède des fallbacks : tri aléatoire puis récent, backdrop puis image principale, fond coloré si aucune image n'est disponible.

## Installation complète recommandée

Le mode complet est nécessaire pour le hero, les rails, le fond vidéo et les pages Genres/Studios personnalisées.

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Dans **Tableau de bord → Branding → CSS personnalisé**, laisse le champ **vide**. Un ancien `@import` jsDelivr peut charger une ancienne version en parallèle et provoquer des bugs visuels.

Après installation, Lumo est injecté localement :

```text
/usr/share/jellyfin/web/ui/lumo/theme.css
/usr/share/jellyfin/web/ui/noctafin-config.js
/usr/share/jellyfin/web/ui/noctafin-home.js
/usr/share/jellyfin/web/ui/noctafin-assets/background/lumo-japan-night-1080p.mp4
```

Recharge ensuite le navigateur avec `Ctrl+Shift+R` ou `Ctrl+F5`.

## Ordre de l'accueil

1. Hero cinématique
2. Continuer de regarder
3. Studios
4. Réseaux TV
5. Genres
6. Lignes par studio
7. Lignes par réseau TV

Les sections natives Jellyfin de l'accueil sont masquées lorsque `hideNativeHomeRows: true`.

## Configuration

Modifie `scripts/noctafin-config.js` avant de relancer l'installateur. Les principaux réglages sont :

```js
background: {
  video: "ui/noctafin-assets/background/lumo-japan-night-1080p.mp4",
  videoOpacity: 0.62,
  overlayOpacity: 0.54,
  homeOnly: true
},

taxonomyHero: {
  enabled: true,
  maxItems: 18
},

rows: {
  rowLimit: 12, // 12 éléments chargés, 6 visibles sur desktop
  minItems: 2
},
```

Les aliases Studios/Réseaux/Genres doivent correspondre aux métadonnées présentes dans ta bibliothèque Jellyfin.

## Mise à jour

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Après une mise à jour de Jellyfin, relance l'installateur si `index.html` a été remplacé.

## Désinstallation

```bash
cd /opt/Noctafin-jellyfin-theme-
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/uninstall.sh
systemctl restart jellyfin
```

## Mode CSS uniquement

Disponible uniquement pour prévisualiser l'apparence générale. Les fonctionnalités JavaScript ne seront pas présentes :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.8.0");
```
