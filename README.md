# Lumo pour Jellyfin 12

Thème cinématique + extension d'interface pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript directement dans `jellyfin-web`.

## Nouveautés 1.15.0

- Fond normal noir avec reflets violets et cyan qui changent lentement de position. Les fonds saisonniers gardent leur image.
- Rail de sept jaquettes « Studios & plateformes » placé sous le Hero, avant « Continuer de regarder ». Logos embarqués pour fonctionner hors ligne ; les cartes ouvrent le filtre natif quand le serveur possède la métadonnée correspondante.
- Flèches accessibles sur le Hero, aperçu vidéo muet sur les cartes après un délai, avec priorité à la bande-annonce locale puis à une vidéo de thème fournie par Jellyfin.
- Ligne « Continuer de regarder » limitée à un épisode par série dans Lumo. L'identité de l'épisode est conservée pour reprendre au bon endroit.
- La sélection d'un compte Jellyfin ne réutilise plus le jeton d'un autre serveur sauvegardé dans le navigateur.

Voir [les fonctions et limites de Jellyfin 12](docs/INTEGRATIONS.md) avant l'installation.

## Base conservée de la v1.14

### Lecture : priorité au gestionnaire natif Jellyfin

Les six points d'entrée restent raccordés à un seul bus `itemId` : Hero accueil, rails, fiche Film, fiche Série, **Lecture en cours** et cartes épisodes.

La v1.14 ne dépend plus d'un objet média JavaScript capturé lors du rendu. Au clic :

1. Lumo relit l'`itemId` sur le nœud réellement cliqué.
2. Une Série est d'abord résolue vers un épisode concret : reprise, sinon Next Up, sinon premier épisode.
3. Lumo crée une `itemAction` native temporaire avec l'ID, le serveur, le type, le média, l'action Play/Resume et la position de reprise.
4. Cette action est insérée dans un conteneur Jellyfin déjà géré par son système de shortcuts puis cliquée.
5. Si ce pont n'est pas disponible, Lumo essaie une action native exacte déjà rendue.
6. Ensuite seulement, `PlaybackManager.play()` est utilisé avec `ids:[resolvedId]`, `serverId` et `startPositionTicks`.
7. La fiche native exacte reste le dernier fallback. Aucun retour forcé vers l'accueil.

Un clic plus récent annule désormais proprement une tentative précédente. L'état `playback-pending` ne masque plus l'interface avant que le vrai lecteur existe.

### Rails et scroll

- 12 médias maximum par rail, 6 visibles sur desktop.
- Desktop : navigation horizontale par flèches ; le rail ne capture plus la molette verticale.
- Tactile : swipe horizontal natif conservé.
- Posters affichés entièrement avec `object-fit: contain`.
- Le zoom est limité à l'image **à l'intérieur** du cadre fixe : la carte ne sort plus de sa ligne.
- Même confinement pour les logos Studios/Réseaux.
- Ancien navigateur plein écran/scroll-lock retiré.
- MutationObserver et watchdog allégés pour réduire les remounts inutiles.

### Chaîne CSS 1.14

`theme.css` charge, dans cet ordre, `tokens`, `core`, `header`, `home`, `details`, `player`, `responsive`, puis les couches de compatibilité `lumo-v1.10.css` à `lumo-v1.13.css`, toutes cache-bustées en `?v=1.15.0`.

### Validation

`npm run check` contrôle la configuration, les six points d'entrée playback et les invariants de layout/scroll. Les installateurs Shell sont également vérifiés séparément.

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
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.15.0" data-lumo-theme="1.15.0">
<script src="ui/noctafin-config.js?v=1.15.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.15.0" data-noctafin-home></script>
```

## Mise à jour

Extrais la nouvelle archive, puis relance l'installateur depuis son dossier :

```bash
cd /chemin/vers/Lumo-Jellyfin-v1.15.0
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Vérification

```bash
grep -n "1.15.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
ls -lh /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.12.css
ls -lh /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.13.css
```

## Tests du dépôt

```bash
npm run check
bash -n install/install.sh
bash -n install/uninstall.sh
```

## CSS-only

Le dépôt public propose aussi cet import distant :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css");
```

L'installation complète décrite ci-dessus charge déjà le même CSS localement et ajoute
le JavaScript nécessaire aux vues cinématiques. Dans ce cas, ne répète pas cet import
dans le champ CSS personnalisé : cela chargerait la feuille deux fois.

Après avoir copié `theme.css` et `styles/` sous `jellyfin-web/ui/lumo/`, le CSS personnalisé peut charger le style seul :

```css
@import url("ui/lumo/theme.css?v=1.15.0");
```

Le mode CSS-only ne peut pas fournir les fiches cinématiques, les Heroes dynamiques ni les rails Studio/Genre/Réseau.
