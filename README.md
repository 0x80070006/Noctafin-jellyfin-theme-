# Lumo pour Jellyfin 12

Thème cinématique + extension d'accueil pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript dans `jellyfin-web`.

## Nouveautés 1.9.0

- 12 médias maximum par ligne, avec 6 cartes visibles à la fois sur desktop.
- Sélection quotidienne déterministe : une ligne reste stable toute la journée puis change le lendemain.
- Flèches de rail renforcées : calcul d'une page réelle, fallback pour les WebViews qui ignorent `scrollTo`, état gauche/droite recalculé après chaque déplacement.
- Aucun blocage de molette verticale au-dessus d'une ligne : Lumo ne capture plus le scroll vertical.
- Les raccourcis Studios/Réseaux de l'accueil utilisent les IDs exacts du serveur fournis dans `noctafin-config.js`.
- Navigation native Jellyfin via `#/list?studioId=...&serverId=...` ou `#/list?genreId=...&serverId=...`.
- Hero cinématique et fond contextualisé sur **toute page de genre ou de studio Jellyfin**, même si le genre/studio n'est pas présent dans la liste personnalisée de l'accueil.
- Les 6 studios et 6 réseaux configurés utilisent leur logo officiel local dans le hero ; les autres studios utilisent leur nom Jellyfin avec le même traitement cinématique.
- Les genres utilisent un film du genre comme backdrop, légèrement flouté, avec le nom du genre en grand.
- Le routeur est désormais prioritaire sur le DOM : une ancienne page d'accueil encore montée par React ne peut plus empêcher l'injection du hero d'une page Studio/Genre.
- Correction d'un doublon de métadonnées dans les cartes.

## IDs Studios / Réseaux configurés

| Libellé | ID Jellyfin |
| --- | --- |
| Pixar | `a1384420050b89ea581e04c0dd9a83a8` |
| Paramount | `2672ed34a3f2b0bb6b4257c2ab9875b7` |
| Marvel | `92e087260fb84bbba21ef249122925df` |
| Walt Disney | `ff966337d51b0e006da6e16df7cb7ca1` |
| Columbia | `3e8c9b438ab4664dc15b8cdbfce57134` |
| 20th Century Fox | `da8c4e8ad6d11fba2241aebbf643bed7` |
| Apple TV+ | `865e87e3544b4bcd5f1fcd3f7b8358e8` |
| Netflix | `411cb7d6c12c8bf0d3c1caed22120c6f` |
| BBC | `c39802fd4af78383c08c5ef2056d2ca7` |
| Cartoon Network | `05d703671f62d4d6ee1a3636b89add52` |
| ABC | `96b48893d56b599270991d22c7a88280` |
| MTV | `ec5ae1b12f4efbf619aa77ca1bcd2d6f` |

## Installation Linux / LXC

Depuis le dossier du dépôt :

```bash
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Puis recharge complètement le navigateur (`Ctrl+Shift+R`).

Pour l'installation complète, laisse le champ **CSS personnalisé** de Jellyfin vide. L'installateur ajoute automatiquement :

```html
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.9.0" data-lumo-theme="1.9.0">
<script src="ui/noctafin-config.js?v=1.9.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.9.0" data-noctafin-home></script>
```

## Mise à jour

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Vérification locale

```bash
npm run check
bash -n install/install.sh
bash -n install/uninstall.sh
```

La validation vérifie notamment les 12 IDs Studio/Réseau, la limite de 12 médias par rail et la présence du hero universel.

## CSS-only

Pour une simple prévisualisation du style, sans Hero/Studios/Genres dynamiques :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.9.0");
```

Le mode CSS-only ne peut pas fournir les fonctions JavaScript de Lumo.
