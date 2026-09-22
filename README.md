# Lumo — thème cinématique pour Jellyfin 12

Lumo transforme l'accueil Jellyfin 12 avec un hero rotatif, un rail **Continuer de regarder** inspiré d'Abyss, des raccourcis Studios / Réseaux TV, des lignes par Genre / Studio / Réseau, un branding Lumo et des saisons automatiques.

Le dépôt conserve les noms techniques `noctafin-*.js` pour rester compatible avec les versions précédentes.

## v1.6.0 — refonte robuste des rails, du branding et du fond

Cette version corrige les problèmes visibles avec les anciennes versions :

- **Continuer de regarder en 16:9** : cartes horizontales comme Abyss, titre/épisode/année/note visibles directement sous l'image ;
- Lumo privilégie `Thumb` et `Backdrop` avant les images portrait pour les épisodes ;
- aucune carte Lumo n'a de scroll vertical interne ;
- affiches des lignes Genres/Studios réduites et contenues en ratio 2:3 ;
- navigation des rails avec une **paire de chevrons minimalistes en haut à droite**, comme Abyss ;
- suppression des anciens boutons/pilules gris qui pouvaient apparaître sur le bord gauche ;
- logos Studios/Réseaux centrés avec `object-fit: contain`, sans second watermark ;
- `Action`, `Aventure`, `Pixar`, `Netflix`, etc. ouvrent la **liste native Jellyfin filtrée** ;
- branding du header remplacé proprement par **logo Lumo + Lumo** sans transformer les titres des pages Paramètres en gros logo ;
- logo Lumo borné dans le drawer/admin et remplacement du favicon ;
- fond Lumo injecté globalement, y compris sur les vues modernes / Paramètres : halos sombres animés par défaut, Halloween en octobre, Noël en décembre ;
- fonds saisonniers assombris + flou gaussien, fond normal non flouté ;
- CSS complet installé **localement dans jellyfin-web**, ce qui évite les incohérences du cache jsDelivr et permet d'habiller les écrans où le Custom CSS Jellyfin n'est pas suffisant ;
- installateur idempotent avec sauvegarde d'`index.html`, CSS/JS versionnés et conservation des logos déjà téléchargés en cas de panne réseau.

## Ordre de l'accueil

1. Hero cinématique
2. Continuer de regarder
3. Studios
4. Réseaux TV
5. Genres
6. Lignes par studio
7. Lignes par réseau TV

Les lignes d'accueil natives Jellyfin sont masquées lorsque `hideNativeHomeRows: true`.

## Installation recommandée — complète

Sur le serveur Jellyfin :

```bash
cd /opt/Noctafin-jellyfin-theme-
git pull --ff-only
chmod +x install/install.sh
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

L'installateur ajoute automatiquement :

```html
<link rel="stylesheet" href="ui/lumo/theme.css?v=1.6.0" data-lumo-theme="1.6.0">
<script src="ui/noctafin-config.js?v=1.6.0" data-noctafin-config></script>
<script src="ui/noctafin-home.js?v=1.6.0" data-noctafin-home></script>
```

### Important après une ancienne version

Pour l'installation complète, **supprime l'ancien `@import` jsDelivr dans Dashboard → Branding → CSS personnalisé**. Sinon un vieux CSS mis en cache peut remettre les anciennes flèches ou les anciennes règles de logo par-dessus la v1.6.0.

Puis fais `Ctrl+F5` / `Ctrl+Shift+R`.

## Vérification

```bash
grep -n "lumo/theme.css?v=1.6.0\|noctafin-home.js?v=1.6.0" /usr/share/jellyfin/web/index.html
ls -lh /usr/share/jellyfin/web/ui/lumo/theme.css
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/seasonal/
ls -lh /usr/share/jellyfin/web/ui/noctafin-assets/logos/
```

## CSS-only via GitHub/jsDelivr

Cette méthode ne fournit que l'apparence statique. Elle ne crée ni Hero, ni rails dynamiques, ni branding saisonnier complet.

```css
@import url("https://cdn.jsdelivr.net/gh/0x80070006/Noctafin-jellyfin-theme-@main/theme.css?v=1.6.0");
```

N'utilise pas cet import en même temps que l'installation complète ci-dessus.

## Branding et saisons

La saison est choisie d'après le mois du navigateur :

- octobre → logo Halloween + fond cimetière ;
- décembre → logo Noël + fond Noël ;
- le reste de l'année → logo bleu + fond très sombre avec halos violet/cyan/rose animés.

Configuration : `scripts/noctafin-config.js`.

```js
seasonal: {
  enabled: true,
  forceSeason: "auto",
  halloweenMonth: 10,
  christmasMonth: 12,
  backgroundBlurPx: 8,
  backgroundBrightness: 0.56
}
```

`forceSeason` accepte `auto`, `default`, `halloween` ou `christmas`.

## Studios et réseaux inclus

Studios : Pixar, Marvel, Disney, 20th Century, Columbia, Paramount.

Réseaux TV : Apple TV+, Netflix, BBC, Cartoon Network, ABC, MTV.

Les alias sont configurables dans `scripts/noctafin-config.js`.

## Navigation Genres / Studios

Lumo récupère les identifiants réels depuis l'API Jellyfin puis ouvre une vue native filtrée avec `genreId` ou `studioId`. Aucune page catalogue Lumo n'est superposée au client Jellyfin.

## Mise à jour Jellyfin

Une mise à jour du paquet Jellyfin peut remplacer `index.html`. Dans ce cas, relance simplement :

```bash
cd /opt/Noctafin-jellyfin-theme-
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/install.sh
systemctl restart jellyfin
```

## Désinstallation

```bash
cd /opt/Noctafin-jellyfin-theme-
JELLYFIN_WEB_DIR=/usr/share/jellyfin/web ./install/uninstall.sh
systemctl restart jellyfin
```

Retire aussi tout ancien `@import` Lumo/NoctaFin du CSS personnalisé.

## Contrôles développeur

```bash
npm run check
bash -n install/install.sh
bash -n install/uninstall.sh
```

## Inspirations

- NetFin — https://github.com/ya0903/NetFin
- Abyss — https://github.com/AumGupta/abyss-jellyfin
- Jellyfish — https://github.com/n00bcodr/Jellyfish

## Licence

MIT — voir `LICENSE`.
