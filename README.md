# Lumo — thème cinématique pour Jellyfin 12

Lumo transforme la page d'accueil Jellyfin 12 en interface cinématique : gros hero rotatif, ligne `Continuer de regarder`, rails Studios / Réseaux TV / Genres, navigation horizontale avec flèches et branding saisonnier automatique.

Le dépôt garde les noms de scripts `noctafin-*.js` pour rester compatible avec les installations précédentes, mais l'interface visible s'appelle désormais **Lumo**.

## Nouveautés v1.3.0

- Les logos Studios / Réseaux TV sont réellement centrés dans leurs tuiles, avec une taille maximale qui évite tout débordement.
- Les flèches des rails sont remplacées par des contrôles ronds modernes avec icônes SVG, centrés verticalement aux deux extrémités de chaque ligne.
- Les jaquettes verticales sont plus compactes et affichées en entier avec `object-fit: contain`, sans recadrage de l'affiche.
- Les titres, années et notes restent hors de l'image et ne nécessitent aucun défilement vertical.
- Les titres de genres sont désormais simplement `Aventure`, `Action`, etc. : plus de libellé `Genre` ni de flèche `→` à côté du texte.
- Le nom du genre lui-même reste cliquable et ouvre le catalogue complet du genre.
- Les libellés de l'interface Lumo ne sont plus sélectionnables à la souris.
- Le branding Lumo, le hero, les fonds saisonniers, les Studios / Réseaux TV et la ligne `Continuer de regarder` restent inchangés.

## Ordre de la page d'accueil

1. Hero cinématique rotatif
2. Continuer de regarder
3. Studios
4. Réseaux TV
5. Genres
6. Lignes par Studio
7. Lignes par Réseau TV

Les rails natifs Jellyfin ne sont plus affichés sur la page d'accueil.

## Studios et réseaux inclus

Studios : Pixar, Marvel, Disney, 20th Century, Columbia, Paramount.

Réseaux TV : Apple TV+, Netflix, BBC, Cartoon Network, ABC, MTV.

## Installation CSS

Dépôt GitHub actuel :

`https://github.com/0x80070006/Noctafin-jellyfin-theme-`

Dans `Jellyfin → Tableau de bord → Général / Branding → Custom CSS` :

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.3.0");
```

## Installation dans un LXC Jellyfin / Proxmox

Après avoir envoyé cette version sur GitHub :

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Puis fais `Ctrl+F5` dans le navigateur.

L'installateur copie :

- `noctafin-config.js` ;
- `noctafin-home.js` ;
- les logos Lumo bleu / Halloween / Noël ;
- les deux fonds saisonniers ;
- les logos Studios / Réseaux TV.

Les assets sont placés sous :

```text
/usr/share/jellyfin/web/ui/noctafin-assets/
```

## Saison automatique

La saison est choisie à partir du mois du navigateur :

- octobre → `halloween` ;
- décembre → `christmas` ;
- le reste de l'année → `default`.

Tu peux tester une saison sans changer la date dans `scripts/noctafin-config.js` :

```js
seasonal: {
  enabled: true,
  forceSeason: "halloween", // auto | default | halloween | christmas
  backgroundBlurPx: 8,
  backgroundBrightness: 0.56
}
```

Remets ensuite :

```js
forceSeason: "auto"
```

`backgroundBlurPx` contrôle le flou saisonnier et `backgroundBrightness` l'assombrissement. Le fond normal n'est pas affecté par ces deux réglages.

## Nom et logos Lumo

Toujours dans `scripts/noctafin-config.js` :

```js
brand: {
  name: "Lumo",
  logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.png",
  logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.png",
  logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.png"
}
```

Le script modifie la marque visible de la barre supérieure et le favicon chargé dans la session Web.

## Configuration de la page d'accueil

```js
rows: {
  rowLimit: 20,
  minItems: 2,
  browsePageLimit: 120,
  scrollFactor: 0.82,
  hideNativeHomeRows: true,
  showResumeRow: true,
  showStudioRail: true,
  showNetworkRail: true,
  showGenreRows: true,
  showStudioRows: true,
  showNetworkRows: true
}
```

Si tu veux récupérer un jour les sections natives Jellyfin :

```js
hideNativeHomeRows: false
```

## Métadonnées

Les Genres et Studios proviennent des métadonnées réelles de ta bibliothèque Jellyfin. Si un studio n'apparaît pas, ajoute le nom utilisé par ton fournisseur de métadonnées dans `aliases`.

Exemple :

```js
{
  label: "PIXAR",
  aliases: ["Pixar", "Pixar Animation Studios"]
}
```

## Mise à jour ultérieure

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

Une mise à jour du paquet Jellyfin peut remplacer `index.html`; il suffit alors de relancer l'installateur.

## Désinstallation

```bash
cd /opt/Noctafin-jellyfin-theme-
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/uninstall.sh
systemctl restart jellyfin
```

Retire ensuite l'`@import` Lumo du Custom CSS.

## Vérification du code

```bash
npm run check
bash -n install/install.sh
```

## Inspirations

- NetFin — https://github.com/ya0903/NetFin
- Abyss — https://github.com/AumGupta/abyss-jellyfin
- Jellyfish — https://github.com/n00bcodr/Jellyfish

## Licence

MIT — voir `LICENSE`.
