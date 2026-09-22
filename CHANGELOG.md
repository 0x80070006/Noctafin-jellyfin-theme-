# Changelog

## 1.8.0

- Les lignes média sont désormais bornées à **12 éléments maximum** côté API et côté rendu ; 6 restent visibles sur desktop et les 6 suivants sont accessibles avec les flèches.
- Le nombre de 12 est appliqué aussi à `Continuer de regarder` lorsqu'au moins 12 éléments sont disponibles.
- Renforcement des heroes des pages Genre / Studio / Réseau sans remplacer la page native Jellyfin.
- Hero Genre : priorité aux **films** possédant un backdrop, sélection aléatoire, fallback sur films/séries récents, léger flou du backdrop et nom du genre en grand.
- Hero Studio/Réseau : logo officiel local agrandi mais strictement contenu, backdrop aléatoire, fond global teinté par la palette de la marque.
- Fallback de hero renforcé : si aucune image n'est disponible, Lumo génère un fond coloré plutôt qu'une zone vide.
- Détection du conteneur de page taxonomie renforcée : sélection du meilleur `main` visible afin de limiter les injections dans un ancien écran conservé par le routeur Jellyfin 12.
- Les rails restent à 6/4/2 éléments visibles selon la largeur, avec navigation par page basée sur la géométrie réelle des cartes.

## 1.7.0

- Refonte robuste des rails : exactement 6 cartes visibles sur desktop, 4 sur tablette, 2 sur mobile.
- Les cartes gardent leur ratio natif (16:9 pour « Continuer de regarder », 2:3 pour les affiches) et n'ont plus aucun scroll vertical interne.
- Le zoom au survol se fait uniquement à l'intérieur du cadre de l'image : aucune jaquette ni aucun logo ne peut sortir de sa ligne.
- Correction du blocage du scroll vertical de la page au-dessus des rails horizontaux ; la molette verticale est explicitement rendue au scroller parent.
- Flèches de rails façon Abyss fiabilisées : calcul du pas à partir de la largeur réelle des cartes, état disabled correct, animation de zoom au clic.
- Correction du bouton Lecture du hero et des boutons Play natifs : icônes SVG, géométrie bornée, suppression des backgrounds hérités.
- Nouveau fond vidéo principal fourni par l'utilisateur, compressé en H.264 1080p/24 fps sans audio (~0,8 Mo), avec overlay sombre et fallback automatique.
- Le fond vidéo ne s'active que sur l'accueil en saison normale ; Halloween et Noël gardent leurs fonds saisonniers.
- Les pages Genre / Studio / Réseau restent des pages natives Jellyfin filtrées mais reçoivent maintenant un hero cinématique Lumo.
- Hero Genre : backdrop aléatoire d'un média du genre + nom du genre.
- Hero Studio/Réseau : backdrop aléatoire + logo du studio/réseau, avec teinte de page dérivée de ses couleurs configurées.
- Mémorisation du contexte de navigation en session pour rendre les heroes de taxonomie plus fiables sur le routeur Jellyfin 12.
- Détection des pages visibles renforcée afin d'éviter d'injecter l'accueil sur une vue masquée conservée dans le DOM.
- Installation Linux/Windows mise à jour pour copier le fond vidéo localement dans `jellyfin-web/ui/noctafin-assets/background/`.

## 1.6.0

- Stabilisation du branding Lumo, du background global et des rails.
- CSS complet injecté localement dans Jellyfin Web.
