# Dépannage Lumo 1.15

## Une ancienne apparence revient

Vérifie que **CSS personnalisé Jellyfin est vide**. Ne mélange pas l'installation complète locale et un ancien `@import` jsDelivr.

```bash
grep -n "1.15.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/lumo/theme.css
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
```

Recharge avec `Ctrl+Shift+R`.

## Le fond normal ou les reflets ne s'affichent pas

```bash
grep -n 'Quiet ambient light' /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.13.css
```

Relance ensuite l'installation :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

En octobre et décembre, l'image saisonnière remplace les reflets par défaut. Vérifie `forceSeason` dans `scripts/noctafin-config.js` pour tester le mode normal.


## Le lecteur affiche le fond Lumo au lieu de la vidéo

La 1.14 isole explicitement `.videoPlayerContainer`, `.htmlvideoplayer` et l'OSD Jellyfin. Vérifie d'abord que le nouveau CSS est réellement installé :

```bash
grep -n "lumo-v1.12.css" /usr/share/jellyfin/web/ui/lumo/theme.css
grep -n "htmlvideoplayer" /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.12.css
```

Puis réinstalle et recharge sans cache :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Dans Jellyfin, le champ **CSS personnalisé** doit être vide. Un ancien `@import` peut réintroduire les règles de player d'une version précédente.

## Un épisode renvoie vers l'accueil au lieu de démarrer

La 1.14 n'utilise aucune route `/video` synthétique. Elle remet d'abord la cible exacte au système de shortcuts natif Jellyfin via une `itemAction` temporaire, puis essaie une action native exacte et enfin `PlaybackManager(ids)`. La fiche native n'est utilisée qu'en dernier recours. Vérifie que le runtime chargé est bien la 1.14 :

```bash
grep -n "noctafin-home.js?v=1.15.0" /usr/share/jellyfin/web/index.html
```

## Le Hero Studio/Genre n'apparaît pas

Vérifie d'abord que l'URL contient bien `studioId=` ou `genreId=` puis ouvre la console navigateur. Le runtime 1.14 tente plusieurs conteneurs Jellyfin 12 et réessaie automatiquement pendant le montage de la page.

Vérifie la version réellement chargée :

```bash
grep -n "noctafin-home.js?v=1.15.0" /usr/share/jellyfin/web/index.html
```

Après une mise à jour du paquet Jellyfin, relance toujours `install/install.sh`, car `index.html` peut être remplacé.

## Les flèches ne défilent pas

Une ligne doit contenir plus de médias que le nombre visible. Sur desktop, Lumo affiche 6 cartes et peut charger jusqu'à 12 médias. Réinstalle le JavaScript après toute mise à jour :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```


## La page ne défile plus quand le pointeur est sur une ligne

En 1.14, les rails desktop sont pilotés par les flèches et ne prennent plus possession du scroll horizontal natif ; la molette verticale reste donc celle de la page. Sur tactile, le swipe horizontal reste actif.

Vérifie que la couche finale 1.14 est présente :

```bash
grep -n "touch-action: pan-y pinch-zoom" /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.13.css
grep -n "overflow-x: hidden" /usr/share/jellyfin/web/ui/lumo/styles/lumo-v1.13.css
```

Si un ancien CSS personnalisé importe Abyss ou une ancienne version Lumo, retire-le : l'installation complète charge déjà son CSS local.
