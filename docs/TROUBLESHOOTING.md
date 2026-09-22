# Dépannage Lumo 1.10

## Une ancienne apparence revient

Vérifie que **CSS personnalisé Jellyfin est vide**. Ne mélange pas l'installation complète locale et un ancien `@import` jsDelivr.

```bash
grep -n "1.10.0" /usr/share/jellyfin/web/index.html
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

## Le Hero Studio/Genre n'apparaît pas

Vérifie d'abord que l'URL contient bien `studioId=` ou `genreId=` puis ouvre la console navigateur. Le runtime 1.10 tente plusieurs conteneurs Jellyfin 12 et réessaie automatiquement pendant le montage de la page.

Vérifie la version réellement chargée :

```bash
grep -n "noctafin-home.js?v=1.10.0" /usr/share/jellyfin/web/index.html
```

Après une mise à jour du paquet Jellyfin, relance toujours `install/install.sh`, car `index.html` peut être remplacé.

## Les flèches ne défilent pas

Une ligne doit contenir plus de médias que le nombre visible. Sur desktop, Lumo affiche 6 cartes et peut charger jusqu'à 12 médias. Réinstalle le JavaScript après toute mise à jour :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```
