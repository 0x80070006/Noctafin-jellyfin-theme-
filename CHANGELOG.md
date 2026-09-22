# Changelog

## 1.9.0

- IDs exacts ajoutés pour Pixar, Paramount, Marvel, Walt Disney, Columbia, 20th Century Fox, Apple TV+, Netflix, BBC, Cartoon Network, ABC et MTV.
- Navigation Studios/Réseaux corrigée vers les routes natives `#/list?studioId=...&serverId=...`.
- Navigation Genres corrigée vers `#/list?genreId=...&serverId=...`.
- Le contexte de route est maintenant prioritaire sur les anciennes pages React encore montées dans le DOM.
- Hero + ambiance colorée générés pour n'importe quel `studioId` ou `genreId` Jellyfin, pas seulement les éléments configurés sur l'accueil.
- Résolution du nom natif par ID via `/Studios` et `/Genres` pour les taxonomies non configurées.
- Logos officiels conservés dans le hero pour les studios/réseaux configurés ; fallback typographique cinématique pour tous les autres.
- 12 médias maximum par rail, 6 visibles sur desktop.
- Contenu des rails stable pendant une journée et renouvelé quotidiennement à partir d'un pool de 96 médias récents.
- Refonte du déplacement des flèches par page avec correction de compatibilité WebView.
- Les événements de molette verticale ne sont plus annulés par les rails.
- Correction d'un doublon `année/note` dans les cartes.
- Validation automatique des 12 IDs serveur ajoutée à `npm run check`.

## 1.8.0

- 12 médias maximum par ligne.
- Hero cinématique Genre/Studio/Réseau sur les pages natives filtrées.
