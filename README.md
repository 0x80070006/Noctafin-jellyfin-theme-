# Lumo pour Jellyfin 12

Thème cinématique + extension d'interface pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript directement dans `jellyfin-web`.

## Nouveautés 1.12.0

### Lecteur Jellyfin protégé du thème

Lumo traite désormais le lecteur comme une surface isolée :

- détection de la lecture par route Jellyfin, OSD, conteneur vidéo et `<video>` actif ;
- fond spatial/saisonnier masqué avant le montage du lecteur ;
- canvas vidéo noir plein écran et image vidéo `contain`, sans filtre ni transformation du thème ;
- aucun header Lumo injecté dans le header/OSD vidéo ;
- les contrôles du lecteur gardent leur géométrie native ;
- nettoyage automatique de la fiche Lumo sous-jacente dès que la lecture démarre.

### Lecture des épisodes

Les épisodes, films, boutons Hero et cartes de reprise utilisent une seule fonction de lecture :

1. utilisation du `PlaybackManager` natif Jellyfin lorsque disponible ;
2. contrôle qu'un vrai lecteur/OSD se monte ;
3. en secours, ouverture de la vraie fiche native de l'épisode puis clic sur son bouton Lecture ;
4. aucune navigation vers une route `/video` inventée, ce qui évite le retour accidentel à l'accueil.

### Séries

Au-dessus des saisons, **Lecture en cours** affiche le dernier épisode reprenable de cette série avec :

- vignette 16:9 ;
- Sxx/Exx et titre ;
- durée et progression ;
- bouton Reprendre ;
- démarrage via la même pile de lecture robuste.

Toutes les saisons restent visibles avec leur jaquette et leurs panneaux accordéon. Les épisodes sont chargés uniquement à l'ouverture de la saison.

### Hero d'accueil

La boucle est dédupliquée à plusieurs niveaux : ID de série, titre normalisé, type et année. Un épisode en cours et la série correspondante ne peuvent donc plus occuper deux slides, et les doublons de bibliothèque sont également filtrés.

### Performances / robustesse

- aucune vidéo décorative de fond ;
- fond spatial WebP léger ;
- cache court des détails/saisons/épisodes ;
- CSS playback chargé en dernier pour neutraliser les anciennes règles ;
- retry borné et watchdogs, sans boucle infinie ;
- fonctionnalités précédentes conservées : Heroes Studio/Genre, saisons Halloween/Noël, rails de 12 médias avec 6 visibles, studios/réseaux et branding Lumo.

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
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.12.0" data-lumo-theme="1.12.0">
<script src="ui/noctafin-config.js?v=1.12.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.12.0" data-noctafin-home></script>
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
grep -n "1.12.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
ls -lh /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.12.css
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
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.12.0");
```

Le mode CSS-only ne peut pas fournir les fiches cinématiques, les Heroes dynamiques ni les rails Studio/Genre/Réseau.
