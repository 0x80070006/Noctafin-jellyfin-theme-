# NoctaFin — thème cinématique pour Jellyfin 12

NoctaFin est un thème sombre et très contrasté pour Jellyfin 12, avec une direction artistique vive violet/cyan/rose et une page d'accueil de type service de streaming.

Il est conçu en deux couches :

- `theme.css` : le thème visuel, chargé par `@import` depuis GitHub/jsDelivr ;
- `scripts/noctafin-home.js` : la couche dynamique qui ajoute le hero rotatif et les lignes Genres / Studios / Réseaux TV.

Le code est une implémentation originale. L'architecture générale est inspirée de l'approche modulaire de NetFin, Abyss et Jellyfish, sans reprendre leur feuille de style.

## Ce que NoctaFin ajoute

- Gros hero cinématique rotatif en haut de l'accueil, avec backdrop, logo Jellyfin du média, note, année, durée, genres et boutons en français.
- Conservation des sections natives `Continuer de regarder` et `À suivre`.
- Suppression visuelle des doublons de sections natives portant le même titre.
- Rail `Studios` : Pixar, Marvel, Disney, 20th Century, Columbia, Paramount.
- Rail `Réseaux TV` : Apple TV+, Netflix, BBC, Cartoon Network, ABC, MTV.
- Lignes médias par genre : Action, Aventure, Animation, Comédie, Crime, Drame, Fantastique, Horreur, Science-fiction, Thriller.
- Lignes médias par studio et par réseau TV.
- Chargement paresseux des lignes pour ne pas charger toute la bibliothèque d'un coup.
- Mise en page responsive et navigation clavier/TV de base.

## 1. Publier le dépôt sur GitHub

Décompresse ce projet et envoie **le contenu du dossier** à la racine d'un dépôt, par exemple `NoctaFin`.

Une fois publié, remplace `VOTRE_GITHUB` par ton nom GitHub dans l'import suivant :

```css
@import url("https://cdn.jsdelivr.net/gh/VOTRE_GITHUB/NoctaFin@main/theme.css");
```

Colle cette ligne dans :

`Jellyfin → Tableau de bord → Général / Branding → Custom CSS`

Puis active le thème sombre dans les paramètres d'affichage.

> L'import CSS change l'apparence. Il ne peut pas, à lui seul, créer un hero ou des lignes dynamiques. Pour ces éléments, installe la couche JavaScript ci-dessous.

## 2. Installer le hero + Studios + Genres + Réseaux

### Linux / macOS

Depuis le dossier du dépôt :

```bash
chmod +x install/install.sh
sudo ./install/install.sh
```

Si Jellyfin est installé dans un chemin non standard :

```bash
sudo JELLYFIN_WEB_DIR=/chemin/vers/jellyfin-web ./install/install.sh
```

### Windows PowerShell

Ouvre PowerShell en administrateur puis :

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install\install.ps1
```

Pour un chemin non standard :

```powershell
$env:JELLYFIN_WEB_DIR="C:\chemin\vers\jellyfin-web"
.\install\install.ps1
```

L'installateur copie :

- `scripts/noctafin-config.js` → `jellyfin-web/ui/noctafin-config.js`
- `scripts/noctafin-home.js` → `jellyfin-web/ui/noctafin-home.js`

puis ajoute les deux scripts juste avant `</body>` dans `jellyfin-web/index.html`.

Après installation, redémarre Jellyfin puis fais un rechargement forcé du navigateur (`Ctrl+F5`).

## 3. Personnaliser les genres, studios et réseaux

Édite :

`scripts/noctafin-config.js`

Tu peux modifier les listes, les alias, les couleurs, le nombre d'éléments et activer/désactiver les lignes Studio/Réseau.

Documentation : `docs/CONFIGURATION.md`.

## Compatibilité

Cible principale : **Jellyfin 12 Web**, avec les conteneurs d'accueil `#indexPage`, `#homeTab` et `.sections` utilisés par l'interface Web actuelle. Les parties CSS contiennent aussi des sélecteurs de repli pour l'interface legacy.

Le thème est pensé pour le client Web et les clients qui embarquent Jellyfin Web. Les clients natifs qui n'utilisent pas la feuille Custom CSS ne reprendront pas nécessairement le thème.

## Important pour Docker

Selon l'image Docker, le dossier `jellyfin-web` peut être recréé au redémarrage ou lors d'une mise à jour. Il faudra alors réinjecter les scripts ou les rendre persistants via ta configuration Docker. Voir `docs/TROUBLESHOOTING.md`.

## Désinstallation

Linux / macOS :

```bash
sudo ./install/uninstall.sh
```

Windows :

```powershell
.\install\uninstall.ps1
```

Puis retire l'`@import` NoctaFin du Custom CSS.

## Développement

Vérification syntaxique JavaScript :

```bash
npm run check
```

## Inspirations

- NetFin — https://github.com/ya0903/NetFin
- Abyss — https://github.com/AumGupta/abyss-jellyfin
- Jellyfish — https://github.com/n00bcodr/Jellyfish

## Licence

MIT — voir `LICENSE`.
