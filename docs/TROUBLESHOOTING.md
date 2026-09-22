# Dépannage Lumo

## Le CSS s'applique mais je n'ai ni hero ni lignes supplémentaires

Le CSS seul ne peut pas créer les sections. Exécute l'installateur JavaScript :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Rien ne change après mise à jour

1. Vérifie que Git contient bien la v1.3.0.
2. Relance `install/install.sh`.
3. Vérifie l'import CSS avec `?v=1.3.0`.
4. Fais `Ctrl+F5`.
5. Vérifie les deux scripts dans `jellyfin-web/ui/`.

## Vérifier les assets Lumo

```bash
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/seasonal/
```

Tu dois avoir :

- `lumo-blue.png`
- `lumo-halloween.png`
- `background-halloween.png`
- `lumo-christmas.png`
- `background-christmas.png`

## Tester Halloween ou Noël immédiatement

Dans `scripts/noctafin-config.js` :

```js
forceSeason: "halloween"
```

ou :

```js
forceSeason: "christmas"
```

Relance ensuite l'installateur et recharge Jellyfin. Remets `auto` quand le test est terminé.

## Les sections natives apparaissent encore

Vérifie :

```js
hideNativeHomeRows: true
```

et que `noctafin-home.js` v1.3.0 est bien copié dans `jellyfin-web/ui/`.

## Les logos Studios/Réseaux restent en texte

Relance l'installateur. Il télécharge les SVG vers :

```text
/usr/share/jellyfin/web/ui/noctafin-assets/logos/
```

Le LXC doit avoir `curl` ou `wget` et un accès Internet pour ces logos. Les assets saisonniers, eux, sont déjà inclus dans le dépôt.

## Mise à jour Jellyfin

Une mise à jour peut remplacer `index.html`. Relance l'installateur Lumo après la mise à jour.
