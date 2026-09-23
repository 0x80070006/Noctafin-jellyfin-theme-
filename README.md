# Lumo pour Jellyfin 12

Thème cinématique + extension d'interface pour Jellyfin 12. L'installation complète injecte le CSS local et le runtime JavaScript directement dans `jellyfin-web`.

## Nouveautés 1.13.0

### Bus de lecture unique, inspiré du pattern Abyss Spotlight

Les six points d'entrée de lecture passent maintenant par **une seule liaison `itemId` → lecture native Jellyfin** :

- Hero de l'accueil ;
- jaquettes des rails ;
- fiche Film ;
- fiche Série ;
- bloc **Lecture en cours** ;
- cartes épisodes.

Chaque nœud cliquable porte son propre `data-lumo-play-id`. Un seul listener délégué en phase capture lit cet ID **au moment exact du clic**. Il n'existe donc plus de closure de bouton conservant un ancien objet média après un remount React.

La séquence de démarrage est désormais :

1. rechercher une action native Jellyfin `play`/`resume` liée au **même `data-id`**, comme le fait Abyss Spotlight ;
2. si elle n'existe pas ou ne monte pas le lecteur, recharger le média exact depuis l'API à partir de l'ID cliqué ;
3. pour une Série, résoudre d'abord un épisode concret (reprise → Next Up → premier épisode) ;
4. appeler `PlaybackManager.play()` avec **un seul item concret** ;
5. vérifier qu'une vraie surface lecteur/OSD apparaît ;
6. en dernier secours, ouvrir la fiche native du média exact et cliquer son bouton Lecture.

Aucune route `/video` synthétique n'est utilisée. Si la lecture échoue encore, la fiche native reste ouverte et Lumo affiche un message discret au lieu de renvoyer à l'accueil.

### Protection contre les désynchronisations

- verrou global anti-double lancement ;
- les clics concurrents ne peuvent plus lancer deux médias différents en parallèle ;
- les timers/fallbacks sont associés à un numéro de transaction et ne peuvent plus agir sur une lecture plus récente ;
- la cible API est rafraîchie au clic afin de récupérer la progression et l'état utilisateur actuels ;
- les actions natives génériques ne sont utilisées que si l'URL courante correspond exactement à l'item attendu.

### Tests playback

`npm run check` valide désormais explicitement les six points d'entrée et vérifie qu'ils passent tous par le bus central, qu'aucune route `/video` synthétique ne subsiste et que le fallback natif exact est présent.

Toutes les fonctions précédentes restent actives : isolation du lecteur, fond spatial + Halloween/Noël, Hero dédupliqué, Heroes Studio/Genre, saisons accordéon, Lecture en cours, 12 médias par rail / 6 visibles et branding Lumo.

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
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.13.0" data-lumo-theme="1.13.0">
<script src="ui/noctafin-config.js?v=1.13.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.13.0" data-noctafin-home></script>
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
grep -n "1.13.0" /usr/share/jellyfin/web/index.html
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

Prévisualisation uniquement, sans les fonctions JavaScript :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.13.0");
```

Le mode CSS-only ne peut pas fournir les fiches cinématiques, les Heroes dynamiques ni les rails Studio/Genre/Réseau.
