# Changelog

## 1.10.0

- Suppression complète du fond vidéo Lumo et de son coût de décodage.
- Nouveau fond spatial statique fourni par l'utilisateur, compressé en WebP.
- Conversion des logos/fonds saisonniers en WebP pour alléger les transferts et le stockage.
- Halloween et Noël restent activés automatiquement aux mois configurés.
- Refonte de la détection des pages Studio/Genre pour Jellyfin 12 legacy + React/MUI.
- Suppression de l'exclusion `#indexPage` qui pouvait empêcher l'apparition du Hero sur les pages `#/list?...`.
- Détection basée sur les contenus réellement visibles et exclusion des anciennes vues hors écran/inertes.
- Hero placeholder injecté immédiatement sur toute route `studioId`/`genreId`, puis hydraté avec un média dès que l'API répond.
- Retry progressif si la page native Jellyfin n'est pas encore montée.
- Réinsertion automatique si React remonte la page.
- Résolution de nom universelle : mapping local pour les studios connus, API Jellyfin pour tous les autres, titre natif en dernier fallback.
- Palette générée pour tout studio inconnu ; couleurs configurées conservées pour les studios/réseaux connus.
- Hero de genre stable pour la journée afin d'éviter les changements visuels durant les remounts.
- Variables RGB ajoutées pour éviter de dépendre de `color-mix()` dans l'ambiance de page.
- Les pages Studio/Genre gardent leur grille native Jellyfin et reçoivent uniquement l'habillage Lumo.
- Les rails 12/6 et la sélection quotidienne restent inchangés.

## 1.9.0

- IDs exacts ajoutés pour Pixar, Paramount, Marvel, Walt Disney, Columbia, 20th Century Fox, Apple TV+, Netflix, BBC, Cartoon Network, ABC et MTV.
- Navigation native Jellyfin vers les routes `studioId` / `genreId`.
- Hero universel initial pour les pages Studio/Genre.
- 12 médias maximum par rail, 6 visibles sur desktop.
