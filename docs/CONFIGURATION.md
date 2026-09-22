# Configuration Lumo

La configuration principale se trouve dans `scripts/noctafin-config.js`.

## Branding

```js
brand: {
  name: "Lumo",
  logoBlue: "ui/noctafin-assets/seasonal/lumo-blue.png",
  logoHalloween: "ui/noctafin-assets/seasonal/lumo-halloween.png",
  logoChristmas: "ui/noctafin-assets/seasonal/lumo-christmas.png"
}
```

## Saisons

```js
seasonal: {
  enabled: true,
  forceSeason: "auto",
  halloweenMonth: 10,
  christmasMonth: 12,
  halloweenBackground: "ui/noctafin-assets/seasonal/background-halloween.png",
  christmasBackground: "ui/noctafin-assets/seasonal/background-christmas.png",
  backgroundBlurPx: 8,
  backgroundBrightness: 0.56
}
```

`forceSeason` accepte `auto`, `default`, `halloween` ou `christmas`.

Le flou et l'assombrissement ne s'appliquent qu'aux fonds Halloween/Noël. Le fond par défaut conserve les halos animés violet/cyan/rose.

## Hero

- `enabled` : active ou désactive le hero.
- `rotateEveryMs` : délai entre deux contenus.
- `maxItems` : nombre maximal de contenus dans la rotation.

## Lignes

- `rowLimit` : nombre de médias demandés par ligne.
- `minItems` : une ligne standard est cachée si elle contient moins de médias.
- `browsePageLimit` : nombre d'éléments chargés dans la page complète d'un genre.
- `scrollFactor` : portion de largeur parcourue par les flèches.
- `hideNativeHomeRows` : masque les sections natives Jellyfin sur l'accueil.
- `showResumeRow` : affiche `Continuer de regarder` juste avant les Studios.
- `showStudioRail` : affiche les grandes tuiles Studios.
- `showNetworkRail` : affiche les grandes tuiles Réseaux TV.
- `showGenreRows` : affiche une ligne par genre.
- `showStudioRows` : affiche une ligne par studio.
- `showNetworkRows` : affiche une ligne de séries par réseau TV.

## Genres cliquables

Le titre d'une ligne de genre ouvre une vue plein écran Lumo contenant tous les médias du genre. `Échap` ou le bouton retour ferment cette vue.

## Métadonnées et alias

Lumo utilise les Genres et Studios présents dans Jellyfin. Ajoute des alias quand ton fournisseur de métadonnées utilise un autre nom.

```js
{ label: "PIXAR", aliases: ["Pixar", "Pixar Animation Studios"] }
```

## Logos Studios / Réseaux

Les logos de marques sont téléchargés localement lors de l'installation dans :

```text
jellyfin-web/ui/noctafin-assets/logos/
```

Les assets Lumo saisonniers sont copiés depuis le dépôt dans :

```text
jellyfin-web/ui/noctafin-assets/seasonal/
```
