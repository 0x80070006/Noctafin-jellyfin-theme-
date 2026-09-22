# Dépannage

## Le CSS s'applique mais je n'ai ni hero ni lignes supplémentaires

C'est normal si seul `@import` a été ajouté. CSS ne peut pas créer de nouvelles sections ni interroger l'API Jellyfin. Exécute `install/install.sh` (Linux/macOS) ou `install/install.ps1` (Windows) pour injecter les scripts NoctaFin.

## Rien ne change après installation

1. Vérifie que le thème Jellyfin est en mode sombre.
2. Fais un rechargement forcé (`Ctrl+F5`).
3. Vide le cache du client Web/Jellyfin Media Player.
4. Vérifie que `ui/noctafin-config.js` et `ui/noctafin-home.js` existent dans le dossier `jellyfin-web`.
5. Vérifie dans `index.html` la présence des deux balises marquées `data-noctafin-*`.

## Les lignes Studio/Réseau sont absentes

Le script s'appuie sur les métadonnées Studio de Jellyfin. Ouvre une fiche média et vérifie que le studio/réseau attendu existe bien dans ses métadonnées. Ajoute un alias dans `scripts/noctafin-config.js` si ton fournisseur utilise un autre nom.

## Docker

Le dossier web d'une image Docker peut être recréé au redémarrage ou à la mise à jour. Dans ce cas, réexécute l'installateur dans le conteneur ou mets en place un montage/init persistant adapté à ton image Docker.

## Mise à jour Jellyfin

Une mise à jour peut remplacer `index.html`. Relance simplement l'installateur NoctaFin après la mise à jour.
