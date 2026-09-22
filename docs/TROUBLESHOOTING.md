# Dépannage Lumo 1.6

## Les anciennes flèches grises ou l'ancien gros logo reviennent

La cause la plus fréquente est un ancien `@import` jsDelivr encore présent dans **Dashboard → Branding → CSS personnalisé**.

Avec l'installation complète v1.6, retire cet ancien import. Lumo charge désormais son CSS local via `index.html`.

Vérifie :

```bash
grep -n "lumo/theme.css?v=1.6.0\|noctafin-home.js?v=1.6.0" /usr/share/jellyfin/web/index.html
```

Puis fais `Ctrl+F5`.

## Le fond ne change pas dans Paramètres

Vérifie que le CSS local a été copié et injecté :

```bash
ls -lh /usr/share/jellyfin/web/ui/lumo/theme.css
grep -n "data-lumo-theme" /usr/share/jellyfin/web/index.html
```

Puis relance :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Continuer de regarder affiche encore des posters verticaux

Vérifie que `noctafin-home.js?v=1.6.0` est injecté, puis fais un rechargement sans cache. La v1.6 privilégie les images `Thumb` / `Backdrop` et impose un cadre 16:9.

## Le titre du serveur affiche encore jellyfin-lucas

Vérifie que le script est chargé :

```bash
grep -n "noctafin-home.js?v=1.6.0" /usr/share/jellyfin/web/index.html
```

Dans la console navigateur, une erreur avant le chargement de Lumo peut empêcher le remplacement du branding. Recharge sans cache après redémarrage Jellyfin.

## Les logos Studios/Réseaux restent en texte

```bash
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/logos/
```

L'installateur tente de télécharger les SVG. En cas de panne réseau, il conserve les versions déjà présentes. Si aucun logo n'est disponible, le texte de secours est volontairement affiché.

## Tester Halloween ou Noël

Dans `scripts/noctafin-config.js` :

```js
forceSeason: "halloween"
```

ou :

```js
forceSeason: "christmas"
```

Relance ensuite l'installateur et recharge le client. Remets `auto` après le test.

## Mise à jour Jellyfin

Une mise à jour peut remplacer `index.html`. Relance l'installateur Lumo après la mise à jour.
