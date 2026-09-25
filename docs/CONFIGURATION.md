# Configuration Lumo

La configuration principale se trouve dans `scripts/noctafin-config.js`.

## Fond

```js
background: {
  image: "",
  imageBrightness: 0.72,
  overlayOpacity: 0.50
}
```

Le fond normal est noir avec deux reflets colorés dont les positions évoluent toutes les 24 secondes. L'animation est suspendue lorsque la page est cachée et désactivée si l'utilisateur demande moins de mouvement. Les fonds Halloween et Noël restent gérés séparément par `seasonal`.

## Rails

```js
rows: {
  rowLimit: 12,
  dailyPoolLimit: 96
}
```

`rowLimit` est plafonné à 12 dans le moteur. Sur desktop, le CSS affiche 6 cartes à la fois. La sélection reste stable pendant une journée puis change le lendemain.

## Studios / Réseaux

Chaque entrée définit des noms de studio à rechercher dans le serveur courant, un logo et deux couleurs :

```js
{
  label: "PIXAR",
  aliases: ["Pixar", "Pixar Animation Studios"],
  logo: "ui/noctafin-assets/logos/pixar.svg",
  colors: ["#00b9ff", "#1555e8"]
}
```

Les `aliases` sont examinés dans cet ordre et comparés exactement aux noms que renvoie Jellyfin. L'ID du studio trouvé sert ensuite à la route native `studioId` et aux requêtes des lignes. Aucun ID de bibliothèque n'est partagé dans le thème.

Pour une entrée configurée, le Hero utilise le logo local et cette palette. Pour un studio non configuré, Lumo récupère son nom natif via Jellyfin et génère une palette déterministe.

## Hero universel Studio/Genre

Toute route native contenant `genreId` ou `studioId` déclenche le système. Le Hero est d'abord créé sans attendre l'API, puis hydraté avec un backdrop. Cela garantit un affichage même si la requête média échoue ou si Jellyfin remonte plusieurs fois la vue.
