# Changelog

## 1.4.0

- Correction du branding du header Jellyfin 12 Modern : ciblage du ServerButton natif et habillage CSS Lumo sans casser le DOM React.
- Ajout d'un fallback pour le header classique Jellyfin.
- Cache-busting des scripts injectés avec `?v=1.4.0`.
- Refonte du centrage des logos Studios/Réseaux avec un `logo-frame` dédié.
- Correction de la course de chargement qui laissait parfois le nom du studio au-dessus du logo.
- Refonte des flèches de rails : chevrons SVG, boutons ronds, positionnement aux bords du rail ; les boutons inactifs utilisent désormais `hidden` afin d’éliminer définitivement les petites pilules grises.
- Jaquettes verticales recalculées selon la hauteur de viewport ; ratio 2:3, image complète, aucun scroll vertical interne.
- Titres, année et note directement visibles sous la jaquette.
- Navigation Genres/Studios/Réseaux vers la page native Jellyfin `list.html` filtrée par `genreId` / `studioId`.
- Désactivation de l'ancien navigateur plein écran Lumo qui pouvait se superposer incorrectement à l'accueil.
- Titres de lignes cliquables et non sélectionnables.

## 1.3.0

- Centrage initial des logos Studios/Réseaux.
- Flèches SVG de rails.
- Affiches non recadrées.
- Titres de genres simplifiés.

## 1.2.0

- Branding Lumo et saisons automatiques.
- Fonds Halloween et Noël assombris/floutés.
- Ligne Continuer de regarder avant les Studios.
- Masquage des lignes natives Jellyfin sur l'accueil.

## 1.1.0

- Studios, Réseaux TV et Genres dynamiques.
- Logos de marques locaux.
- Fond animé Lumo.
