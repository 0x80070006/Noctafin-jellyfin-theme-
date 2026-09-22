# Dépannage Lumo 1.7

## Une ancienne apparence revient

Vérifie que **CSS personnalisé Jellyfin est vide**. Ne mélange pas l'installation complète locale et un ancien `@import` jsDelivr.

Puis :

```bash
grep -n "1.7.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/lumo/theme.css
ls -lh /usr/share/jellyfin/web/ui/noctafin-home.js
```

Recharge avec `Ctrl+Shift+R`.

## Le fond vidéo n'apparaît pas

```bash
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/background/lumo-japan-night-1080p.mp4
```

Le fond vidéo est volontairement désactivé en octobre, en décembre, hors de l'accueil et lorsque `prefers-reduced-motion` est activé dans le système.

## Les flèches ne défilent pas

Vérifie qu'une ligne contient plus d'éléments que les 6 visibles. Les flèches sont désactivées aux extrémités du rail. Une réinstallation est nécessaire après mise à jour du JavaScript :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Un Studio ou Genre ouvre une page non filtrée

Vérifie les `aliases` dans `scripts/noctafin-config.js`. Lumo résout les IDs réels depuis l'API Jellyfin avant de construire la navigation.
