# Lumo pour Jellyfin 12

Thème cinématique + extension d'interface pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript directement dans `jellyfin-web`.

## Nouveautés 1.11.0

### Fiches Films

Les routes natives `#/details?id=...` sont remplacées visuellement par une fiche Lumo isolée et stable :

- backdrop plein écran ;
- logo du film lorsque Jellyfin en possède un, titre texte en fallback ;
- année, durée, classification et note ;
- bouton **Lecture** ;
- synopsis, tagline et genres ;
- gradients cinématiques permettant de garder les textes lisibles.

La règle de mise en page qui produisait un très grand espace vide dans les versions précédentes a été supprimée. Si le JavaScript ne charge pas, la fiche native Jellyfin reste donc exploitable.

### Fiches Séries

- backdrop assombri et légèrement flouté ;
- grande jaquette 2:3 ;
- logo ou titre de la série ;
- bouton Lecture qui tente d'abord le prochain épisode (`Next Up`) puis retombe sur le premier épisode disponible ;
- synopsis et genres ;
- toutes les saisons affichées avec leur jaquette ;
- panneaux Saison repliables via un petit chevron ;
- chargement des épisodes uniquement quand une saison est ouverte ;
- première saison ouverte automatiquement par défaut ;
- épisodes en cartes 16:9 avec durée, note, résumé et lecture directe.

### Hero d'accueil

- boutons Lecture / Plus d'infos reconstruits avec dimensions et SVG explicites ;
- état disabled pendant la recherche du prochain épisode d'une série ;
- fond noir opaque strictement limité à la surface du Hero ;
- fondu noir supérieur pour éviter la coupure visuelle avec le header.

### Robustesse / fluidité

- les routes Détails sont traitées avant les anciennes vues Home/List laissées montées par Jellyfin 12 ;
- la fiche Lumo est une couche isolée, scrollable indépendamment, sans modifier les dimensions de la fiche native ;
- le contenu natif sous-jacent est `inert` uniquement pendant la fiche Lumo puis restauré ;
- cache court des métadonnées, saisons et épisodes ;
- épisodes chargés à la demande ;
- les animations respectent `prefers-reduced-motion` ;
- les fonctions précédentes restent actives : Heroes Studio/Genre, fond spatial, Halloween/Noël, rails quotidiens de 12 médias avec 6 visibles, studios/réseaux et branding Lumo.

## Configuration des saisons

Dans `scripts/noctafin-config.js` :

```js
seasonal: {
  enabled: true,
  forceSeason: "auto",
  halloweenMonth: 10,
  christmasMonth: 12
}
```

Pour tester manuellement : `forceSeason: "halloween"`, `"christmas"` ou `"default"`.

## Configuration des fiches séries

```js
details: {
  enabled: true,
  autoExpandFirstSeason: true,
  episodePageSize: 60
}
```

## Installation Linux / LXC

Depuis le dossier du dépôt :

```bash
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Recharge ensuite le navigateur avec `Ctrl+Shift+R`.

Pour l'installation complète, laisse le champ **CSS personnalisé** de Jellyfin vide. L'installateur ajoute automatiquement :

```html
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.11.0" data-lumo-theme="1.11.0">
<script src="ui/noctafin-config.js?v=1.11.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.11.0" data-noctafin-home></script>
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
grep -n "1.11.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
ls -lh /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.11.css
```

## Tests du dépôt

```bash
npm run check
bash -n install/install.sh
bash -n install/uninstall.sh
```

## CSS-only

Prévisualisation uniquement, sans les fonctions JavaScript :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.11.0");
```

Le mode CSS-only ne peut pas fournir les fiches cinématiques, les Heroes dynamiques ni les rails Studio/Genre/Réseau.
