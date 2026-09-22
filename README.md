# NoctaFin — thème cinématique pour Jellyfin 12

NoctaFin est un thème sombre et cinématique pour Jellyfin 12, avec une direction artistique violet/cyan/rose, un hero rotatif et une page d'accueil enrichie de rails Genres / Studios / Réseaux TV.

Il fonctionne en deux couches :

- `theme.css` : design chargé par le Custom CSS de Jellyfin ;
- `scripts/noctafin-home.js` : hero, rails personnalisés, navigation et page complète par genre.

## Nouveautés v1.1

- Correction des affiches : le titre, l'année et la note restent visibles sous la jaquette sans devoir faire défiler verticalement la ligne.
- Flèches gauche/droite sur les rails Studios, Réseaux TV et médias sur desktop.
- Fond très sombre avec halos violet/cyan/rose animés lentement.
- Les titres des lignes de genres sont cliquables et ouvrent une page plein écran contenant tout le genre.
- Page de genre avec pagination (`Charger plus`).
- Logos de marque pour Pixar, Marvel Studios, Disney, 20th Century Studios, Columbia Pictures, Paramount Pictures, Apple TV+, Netflix, BBC, Cartoon Network, ABC et MTV.
- Les logos sont téléchargés localement dans `jellyfin-web/ui/noctafin-assets/logos` lors de l'installation afin d'éviter les restrictions CSP et de ne pas dépendre d'images distantes pendant l'utilisation.

## Fonctionnalités

- Gros hero cinématique rotatif avec backdrop, logo Jellyfin du média, année, classification, durée, note, genres, synopsis et boutons en français.
- Conservation des sections natives comme `Continuer de regarder` et `À suivre`.
- Détection et masquage des doublons de sections natives portant le même titre.
- Rail `Studios` : Pixar, Marvel, Disney, 20th Century, Columbia, Paramount.
- Rail `Réseaux TV` : Apple TV+, Netflix, BBC, Cartoon Network, ABC, MTV.
- Lignes médias par genre : Action, Aventure, Animation, Comédie, Crime, Drame, Fantastique, Horreur, Science-fiction, Thriller.
- Lignes médias supplémentaires par studio et réseau TV.
- Navigation souris, clavier et tactile.
- Chargement paresseux pour les rails afin de limiter les requêtes API.

## 1. Import CSS

Dépôt prévu :

`https://github.com/0x80070006/Noctafin-jellyfin-theme-`

Dans `Jellyfin → Tableau de bord → Général / Branding → Custom CSS` :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.1.0");
```

Le paramètre `?v=1.1.0` aide à contourner un ancien cache du navigateur/CDN après une mise à jour.

## 2. Installer le JavaScript + les logos

### Linux / LXC / Proxmox

Depuis le dossier du dépôt :

```bash
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

L'installateur :

1. copie `noctafin-config.js` et `noctafin-home.js` dans `jellyfin-web/ui/` ;
2. télécharge les logos dans `jellyfin-web/ui/noctafin-assets/logos/` ;
3. injecte les deux scripts avant `</body>` dans `index.html`.

Après installation, fais un rechargement forcé du navigateur : `Ctrl+F5`.

### Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
$env:JELLYFIN_WEB_DIR="C:\Program Files\Jellyfin\Server\jellyfin-web"
.\install\install.ps1
```

## 3. Mise à jour depuis GitHub dans un LXC

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Puis fais `Ctrl+F5` dans le navigateur.

## 4. Configuration

Édite :

`scripts/noctafin-config.js`

Tu peux modifier :

- la vitesse du hero ;
- le nombre d'affiches par ligne ;
- le nombre de médias chargés dans la page complète d'un genre ;
- les genres, studios, réseaux et leurs alias Jellyfin ;
- les couleurs de chaque tuile ;
- les chemins des logos et leurs filtres CSS.

Documentation détaillée : `docs/CONFIGURATION.md`.

## Métadonnées

NoctaFin utilise les Genres et Studios réellement présents dans ta bibliothèque Jellyfin. Si tes métadonnées utilisent un autre nom, ajoute-le à `aliases`.

Exemple :

```js
{
  label: "PIXAR",
  aliases: ["Pixar", "Pixar Animation Studios"]
}
```

## Logos et marques

Les fichiers sont récupérés par l'installateur depuis Wikimedia Commons, à partir de fichiers de logos attribués aux détenteurs des marques. Les marques, noms et logos restent la propriété de leurs détenteurs respectifs. Les pages source sont notamment :

- Pixar : https://commons.wikimedia.org/wiki/File:Pixar_logo.svg
- Marvel Studios : https://commons.wikimedia.org/wiki/File:Marvel_Studios_2025.svg
- Disney : https://commons.wikimedia.org/wiki/File:Walt_Disney_Pictures_text_logo.svg
- 20th Century Studios : https://commons.wikimedia.org/wiki/File:20th_Century_Studios_(2021).svg
- Columbia Pictures : https://commons.wikimedia.org/wiki/File:Columbia_Pictures.svg
- Paramount Pictures : https://commons.wikimedia.org/wiki/File:Paramount_Pictures_Logo_2025.svg
- Apple TV+ : https://commons.wikimedia.org/wiki/File:Apple_TV_Plus_Logo.svg
- Netflix : https://commons.wikimedia.org/wiki/File:Netflix_2015_logo.svg
- BBC : https://commons.wikimedia.org/wiki/File:BBC_Logo_2021.svg
- Cartoon Network : https://commons.wikimedia.org/wiki/File:Cartoon_Network.svg
- ABC : https://commons.wikimedia.org/wiki/File:ABC-2021-LOGO_(3).svg
- MTV : https://commons.wikimedia.org/wiki/File:MTV-2021.svg

## Compatibilité

Cible principale : Jellyfin 12 Web. Le thème s'appuie sur `#indexPage`, `#homeTab` et `.sections`, avec plusieurs règles de repli pour l'interface legacy.

Une mise à jour Jellyfin peut remplacer `index.html`. Dans ce cas, relance simplement `install/install.sh`.

## Désinstallation

Linux :

```bash
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/uninstall.sh
systemctl restart jellyfin
```

Puis retire l'`@import` NoctaFin du Custom CSS.

## Vérification du code

```bash
npm run check
```

## Inspirations

- NetFin — https://github.com/ya0903/NetFin
- Abyss — https://github.com/AumGupta/abyss-jellyfin
- Jellyfish — https://github.com/n00bcodr/Jellyfish

## Licence

MIT — voir `LICENSE`.
