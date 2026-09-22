# Dépannage Lumo 1.12

## Une ancienne apparence revient

Vérifie que **CSS personnalisé Jellyfin est vide**. Ne mélange pas l'installation complète locale et un ancien `@import` jsDelivr.

```bash
grep -n "1.12.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/lumo/theme.css
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
```

Recharge avec `Ctrl+Shift+R`.

## Le fond spatial n'apparaît pas

```bash
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/background/lumo-space.webp
```

Relance ensuite l'installation :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

En octobre et décembre, le fond spatial est volontairement remplacé par le fond saisonnier.


## Le lecteur affiche le fond Lumo au lieu de la vidéo

La 1.12 isole explicitement `.videoPlayerContainer`, `.htmlvideoplayer` et l'OSD Jellyfin. Vérifie d'abord que le nouveau CSS est réellement installé :

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

La 1.12 n'utilise plus de route `/video` synthétique. Elle passe d'abord par le `PlaybackManager` de Jellyfin puis, en secours, par le vrai bouton Lecture de la fiche native de l'épisode. Vérifie que le runtime chargé est bien la 1.12 :

```bash
grep -n "noctafin-home.js?v=1.12.0" /usr/share/jellyfin/web/index.html
```

## Le Hero Studio/Genre n'apparaît pas

Vérifie d'abord que l'URL contient bien `studioId=` ou `genreId=` puis ouvre la console navigateur. Le runtime 1.12 tente plusieurs conteneurs Jellyfin 12 et réessaie automatiquement pendant le montage de la page.

Vérifie la version réellement chargée :

```bash
grep -n "noctafin-home.js?v=1.12.0" /usr/share/jellyfin/web/index.html
```

Après une mise à jour du paquet Jellyfin, relance toujours `install/install.sh`, car `index.html` peut être remplacé.

## Les flèches ne défilent pas

Une ligne doit contenir plus de médias que le nombre visible. Sur desktop, Lumo affiche 6 cartes et peut charger jusqu'à 12 médias. Réinstalle le JavaScript après toute mise à jour :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```
