# Lumo pour Jellyfin 12

Thème cinématique + extension d'accueil pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript directement dans `jellyfin-web`.

## Nouveautés 1.10.0

- Le fond vidéo est entièrement supprimé.
- Nouveau fond spatial statique compressé en WebP (~150 Ko) pour réduire la charge CPU/GPU et améliorer la fluidité du scroll.
- Les fonds Halloween et Noël restent automatiques en octobre/décembre, avec leur assombrissement et flou gaussien.
- Les assets saisonniers ont été convertis en WebP pour réduire fortement leur poids tout en gardant la transparence des logos.
- Hero Studio/Genre renforcé pour Jellyfin 12 : prise en charge des pages legacy `list.html` et des wrappers React/MUI.
- L'ancien filtre qui pouvait ignorer les pages montées sous `#indexPage` a été supprimé.
- Détection du bon conteneur à partir des grilles/cartes réellement visibles, avec rejet des pages hors écran, cachées ou `aria-hidden`.
- Un Hero de secours est injecté immédiatement avant même la réponse API : toute route valide `studioId` / `genreId` reçoit donc un Hero et une ambiance de page.
- Retry progressif si Jellyfin n'a pas encore fini de monter la page.
- Les Heroes sont remis en place automatiquement si React remonte la vue.
- Pour les studios/réseaux connus : logo officiel local + palette configurée.
- Pour n'importe quel autre studio Jellyfin : nom natif récupéré via l'API (ou titre de page en fallback), backdrop d'un média et palette déterministe générée automatiquement.
- Pour tous les genres Jellyfin : backdrop provenant d'un média du genre, léger flou et nom du genre en grand.
- Le média du Hero est choisi de façon stable pour la journée afin d'éviter les changements lors des remounts React.
- Les pages Studio/Genre gardent leur grille native Jellyfin ; Lumo ne remplace que l'habillage et ajoute le Hero.
- Les rails restent limités à 12 médias, avec 6 visibles à la fois sur desktop et une sélection renouvelée chaque jour.

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
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.10.0" data-lumo-theme="1.10.0">
<script src="ui/noctafin-config.js?v=1.10.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.10.0" data-noctafin-home></script>
```

## Mise à jour

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Vérification

```bash
grep -n "1.10.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/background/lumo-space.webp
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
```

Le fond vidéo de l'ancienne version est supprimé automatiquement par l'installateur.

## Tests du dépôt

```bash
npm run check
bash -n install/install.sh
bash -n install/uninstall.sh
```

La validation vérifie les IDs configurés, la limite de 12 médias, le fond spatial statique et les éléments nécessaires au Hero universel.

## CSS-only

Pour une simple prévisualisation du style, sans Hero/Studios/Genres dynamiques :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.10.0");
```

Le mode CSS-only ne peut pas fournir les fonctions JavaScript de Lumo.
