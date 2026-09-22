# Configuration NoctaFin

La configuration de la page d'accueil se trouve dans `scripts/noctafin-config.js`.

## Hero

- `enabled`: active ou désactive le hero.
- `rotateEveryMs`: délai entre deux contenus.
- `maxItems`: nombre maximal de contenus dans la rotation.

Le hero mélange les contenus en reprise et des films/séries de la bibliothèque. Il utilise les Backdrops et Logos Jellyfin quand ils existent.

## Lignes

- `rowLimit`: nombre d'affiches demandées par ligne.
- `minItems`: une ligne est cachée si elle contient moins de médias.
- `dedupeNativeRows`: masque les doublons de sections natives portant le même titre.
- `showStudioRail`: affiche les grandes tuiles Studios.
- `showNetworkRail`: affiche les grandes tuiles Réseaux TV.
- `showGenreRows`: affiche une ligne de médias par genre.
- `showStudioRows`: affiche une ligne de médias par studio.
- `showNetworkRows`: affiche une ligne de séries par réseau TV.

## Correspondance des métadonnées

NoctaFin ne fabrique pas les métadonnées. Les genres et studios/réseaux sont résolus à partir des valeurs réellement présentes dans Jellyfin. Chaque groupe possède plusieurs `aliases` pour couvrir les noms anglais et français.

Exemple :

```js
{ label: "PIXAR", aliases: ["Pixar", "Pixar Animation Studios"] }
```

Si un studio n'apparaît pas dans ta bibliothèque, sa tuile reste visible mais désactivée, et sa ligne média n'est pas créée.

## Couleurs

Les couleurs globales sont dans `styles/tokens.css`. Les tuiles Studios/Réseaux utilisent les deux valeurs `colors` de `noctafin-config.js`.
