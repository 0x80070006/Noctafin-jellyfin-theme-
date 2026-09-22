# Changelog

## 1.6.0

- Refonte du rail `Continuer de regarder` en cartes 16:9 compactes de style Abyss.
- Images de reprise : `Thumb` / `Backdrop` prioritaires, image Primary portrait uniquement en fallback.
- Métadonnées visibles sous la carte sans scroll vertical interne.
- Flèches remplacées par une paire de chevrons minimalistes dans l'en-tête de chaque rail.
- Suppression des anciens contrôles gris flottants/pilules.
- Affiches 2:3 compactes et entièrement contenues.
- Logos Studios/Réseaux centrés et contenus dans leur tuile.
- Navigation Genre/Studio/Réseau vers les vues natives Jellyfin.
- Branding Lumo du header rendu indépendant des titres de pages pour éviter le gros logo dans Paramètres.
- Logo du drawer/admin borné à une taille sûre ; favicon Lumo.
- Fond global Lumo désormais disponible également dans le client moderne / Paramètres.
- Halloween et Noël conservent l'assombrissement et le flou ; fond normal animé sans flou.
- CSS complet copié dans `jellyfin-web/ui/lumo/` et injecté dans `index.html`.
- Installation idempotente, backup `index.html.pre-lumo.bak`, validation des SVG téléchargés et conservation des logos existants si le réseau échoue.
- Anciennes feuilles `lumo.css` / `abyss-rails.css` retirées du paquet afin d'éviter les conflits de cascade.

## 1.5.0

- Correctifs Jellyfin 12 sur le header, les logos, les rails et la navigation native.
