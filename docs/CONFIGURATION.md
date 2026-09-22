# Configuration Lumo 1.6

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

Le flou et l'assombrissement ne s'appliquent qu'aux fonds Halloween/Noël. Le fond par défaut garde les halos animés.

## Hero

- `enabled` : active/désactive le hero.
- `rotateEveryMs` : délai entre deux contenus.
- `maxItems` : nombre maximal de contenus dans la rotation.

## Lignes

- `rowLimit` : nombre de médias demandés par ligne.
- `minItems` : masque une ligne si elle contient trop peu d'éléments.
- `scrollFactor` : portion de largeur parcourue par les chevrons.
- `hideNativeHomeRows` : masque les sections natives de l'accueil.
- `showResumeRow` : affiche `Continuer de regarder` en 16:9 avant Studios.
- `showStudioRail`, `showNetworkRail` : tuiles de navigation.
- `showGenreRows`, `showStudioRows`, `showNetworkRows` : lignes dynamiques.

## Métadonnées et alias

Lumo utilise les Genres et Studios réellement présents dans Jellyfin. Ajoute un alias lorsque ton fournisseur de métadonnées emploie un autre nom :

```js
{ label: "PIXAR", aliases: ["Pixar", "Pixar Animation Studios"] }
```

## CSS local

L'installation complète copie :

```text
jellyfin-web/ui/lumo/theme.css
jellyfin-web/ui/lumo/styles/*.css
```

N'ajoute pas simultanément un ancien `@import` jsDelivr dans le Custom CSS.
