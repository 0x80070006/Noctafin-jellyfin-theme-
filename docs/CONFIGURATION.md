# Configuration Lumo

La configuration principale se trouve dans `scripts/noctafin-config.js`.

## Rails

```js
rows: {
  rowLimit: 12,
  dailyPoolLimit: 96
}
```

`rowLimit` est volontairement plafonné à 12 dans le moteur. Sur desktop, le CSS affiche 6 cartes à la fois. `dailyPoolLimit` définit la taille du pool récent dans lequel Lumo effectue sa sélection déterministe quotidienne.

## Studios / Réseaux

Chaque entrée peut contenir un `id`. Lorsqu'il est présent, cet ID est prioritaire sur la résolution par nom :

```js
{
  label: "PIXAR",
  id: "a1384420050b89ea581e04c0dd9a83a8",
  aliases: ["Pixar", "Pixar Animation Studios"],
  logo: "ui/noctafin-assets/logos/pixar.svg",
  colors: ["#00b9ff", "#1555e8"]
}
```

Le clic ouvre la page native Jellyfin correspondant exactement à cet ID. Les aliases restent utiles comme fallback pour un autre serveur.

## Hero universel

Toute URL native contenant `genreId` ou `studioId` active automatiquement le hero Lumo. Les éléments non présents dans la configuration sont résolus par l'API Jellyfin et reçoivent une palette déterministe basée sur leur nom.
