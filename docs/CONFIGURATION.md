# Configuration Lumo 1.7

La configuration dynamique est dans `scripts/noctafin-config.js`.

## Fond vidéo

```js
background: {
  video: "ui/noctafin-assets/background/lumo-japan-night-1080p.mp4",
  videoOpacity: 0.62,
  overlayOpacity: 0.54,
  homeOnly: true
}
```

Le fond vidéo est utilisé uniquement sur l'accueil en saison `default`. Halloween et Noël gardent les fonds saisonniers statiques.

## Heroes Genres / Studios

```js
taxonomyHero: {
  enabled: true,
  maxItems: 12
}
```

Lumo conserve la page native Jellyfin filtrée et injecte un hero au-dessus. Le média du hero est choisi aléatoirement dans le filtre courant.

## Rails

Sur desktop, Lumo affiche exactement 6 cartes par viewport de rail. Le responsive passe à 4 puis 2 cartes sur les écrans plus étroits. Le pas des flèches est calculé automatiquement à partir de la largeur réelle des cartes.

## Studios / Réseaux

Chaque entrée peut définir :

- `label`
- `aliases`
- `colors`: deux couleurs utilisées par la carte et le fond de la page studio
- `logo`: chemin local vers le logo
- `logoFilter`: filtre CSS optionnel

Exemple :

```js
{
  label: "PIXAR",
  aliases: ["Pixar", "Pixar Animation Studios"],
  colors: ["#00b9ff", "#1555e8"],
  logo: "ui/noctafin-assets/logos/pixar.svg",
  logoFilter: "brightness(0) invert(1)"
}
```
