# Changelog

## 1.11.0

- Refonte complète des fiches Films/Séries pour supprimer définitivement le grand espace vide provoqué par les règles de détail héritées.
- Les routes `#/details?id=...` sont maintenant détectées avant les anciennes vues Jellyfin conservées dans le DOM.
- Nouvelle fiche Film cinématique plein écran : backdrop, logo Jellyfin du média (ou titre en fallback), métadonnées, bouton Lecture, synopsis et genres.
- Nouvelle fiche Série cinématique : backdrop assombri/flouté, grande jaquette, logo/titre, métadonnées, lecture du prochain épisode disponible, synopsis et genres.
- Toutes les saisons d'une série sont visibles avec leur jaquette dans des panneaux accordéon.
- Les panneaux Saison se déplient/replient avec un petit chevron ; les épisodes sont chargés uniquement à l'ouverture pour réduire les requêtes et accélérer la page.
- La première saison peut être ouverte automatiquement (`details.autoExpandFirstSeason`).
- Cartes épisodes 16:9 avec titre, durée, note, résumé et lecture directe.
- Cache local court pour fiches, saisons et épisodes afin de limiter les appels API pendant les remounts React de Jellyfin 12.
- Les vues natives sous-jacentes sont rendues `inert` uniquement pendant une fiche Lumo et sont restaurées à la navigation.
- Suppression de la règle `padding-top` native qui pouvait casser une fiche si le runtime JavaScript n'était pas encore prêt.
- Boutons Lecture / Plus d'infos du Hero d'accueil durcis : dimensions explicites, SVG isolés, états hover/active/disabled et lecture série via Next Up avec fallback.
- Ajout d'un fondu noir en haut du Hero d'accueil pour une transition plus douce avec le header.
- Le Hero d'accueil repose désormais sur un canvas noir opaque de mêmes dimensions : le fond spatial ne transparaît plus derrière lui.
- Conservation de toutes les fonctions v1.10 : fond spatial, Halloween/Noël automatiques, Heroes Studio/Genre, 12 médias par rail / 6 visibles, sélection quotidienne, studios/réseaux et branding Lumo.

## 1.10.0

- Fond spatial statique WebP et suppression du fond vidéo.
- Heroes Studio/Genre renforcés pour Jellyfin 12 legacy + React/MUI.
- Résolution universelle des studios/genres et retry lors des remounts React.
- Les rails gardent 12 médias avec 6 visibles sur desktop.

## 1.9.0

- IDs exacts ajoutés pour Pixar, Paramount, Marvel, Walt Disney, Columbia, 20th Century Fox, Apple TV+, Netflix, BBC, Cartoon Network, ABC et MTV.
- Navigation native Jellyfin vers les routes `studioId` / `genreId`.
