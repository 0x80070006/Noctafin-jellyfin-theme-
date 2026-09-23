# Changelog

## 1.13.0

- Port du pattern de liaison Abyss Spotlight : priorité à l'action native Jellyfin `play`/`resume` portant le même `data-id` que le média cliqué.
- Nouveau bus de lecture unique fondé sur `data-lumo-play-id`, installé une seule fois en délégation d'événement capture afin de survivre aux remounts React sans conserver de closure obsolète.
- Les 6 points d'entrée sont raccordés au même bus : Hero accueil, rails, fiche Film, fiche Série, Lecture en cours et cartes épisodes.
- Les jaquettes des rails lancent désormais directement le média correspondant via ce bus de lecture déterministe.
- Rafraîchissement API de la cible au moment du clic : l'ID du nœud cliqué est la source de vérité, plus l'objet JavaScript éventuellement ancien ayant servi au rendu.
- Pour une Série, résolution explicite vers un épisode concret avant `PlaybackManager` : épisode reprenable, sinon Next Up, sinon premier épisode réel.
- `PlaybackManager.play()` reçoit un seul item concret pour réduire les erreurs de traduction/queue et les risques de démarrer un autre épisode.
- Verrou transactionnel anti-double clic et anti-course entre deux médias ; les fallbacks/timers anciens sont invalidés par un numéro de transaction.
- Fallback natif durci : recherche d'abord un bouton exact lié au même ID ; le bouton générique d'une fiche n'est accepté que si la route courante contient cet ID.
- Échec propre : aucune route `/video` synthétique, aucun retour forcé à l'accueil ; la fiche native exacte reste ouverte et un toast Lumo informe l'utilisateur.
- Nouveau validateur `scripts/validate-playback.mjs` couvrant les 6 points d'entrée et les invariants du pipeline de lecture.
- Nouvelle couche CSS `lumo-v1.13.css` pour l'état de démarrage et le message d'échec, sans modification de géométrie des cartes/boutons.
- Toutes les fonctionnalités v1.12 sont conservées sans régression fonctionnelle attendue.


## 1.12.0

- Isolation renforcée du lecteur Jellyfin : le fond spatial Lumo, les fiches custom et le header principal sont automatiquement retirés du compositing pendant la lecture.
- Détection playback redondante par route, DOM lecteur/OSD, balise `<video>` et fallback CSS `:has()` afin d'éviter le cas où seul le fond Lumo reste visible derrière les contrôles.
- Le conteneur vidéo natif est remis sur un canvas noir plein écran et la vidéo conserve `object-fit: contain`, sans filtre, opacité ou transform hérités du thème.
- Le header Lumo n'est plus injecté dans l'OSD du lecteur : suppression du double bandeau observé pendant les épisodes.
- Les boutons de l'OSD ne reçoivent plus les transformations hover globales du thème.
- Nouvelle passerelle de lecture robuste : priorité au `PlaybackManager` natif Jellyfin ; si celui-ci n'est pas exposé, Lumo ouvre la vraie fiche native de l'item et déclenche son bouton Lecture au lieu d'utiliser une route `/video` synthétique susceptible de renvoyer vers l'accueil.
- Watchdog de démarrage : si `PlaybackManager.play()` ne monte pas le lecteur, la passerelle native prend automatiquement le relais sans boucle de navigation.
- Les cartes d'épisodes et la carte de reprise utilisent cette même pile de lecture, avec verrouillage anti-double-clic.
- Ajout de **Lecture en cours** au-dessus des saisons pour le dernier épisode réellement reprenable de la série, avec progression et lancement direct.
- Déduplication du Hero d'accueil renforcée par série, titre normalisé et année afin d'éviter qu'un même film/show apparaisse deux fois dans la boucle, y compris en présence de doublons de bibliothèque.
- Conservation de la fiche Film/Série cinématique, saisons accordéon, Heroes Studio/Genre, fond spatial, Halloween/Noël, 12 médias par rail / 6 visibles et sélection quotidienne.

## 1.10.0

- Fond spatial statique WebP et suppression du fond vidéo.
- Heroes Studio/Genre renforcés pour Jellyfin 12 legacy + React/MUI.
- Résolution universelle des studios/genres et retry lors des remounts React.
- Les rails gardent 12 médias avec 6 visibles sur desktop.

## 1.9.0

- IDs exacts ajoutés pour Pixar, Paramount, Marvel, Walt Disney, Columbia, 20th Century Fox, Apple TV+, Netflix, BBC, Cartoon Network, ABC et MTV.
- Navigation native Jellyfin vers les routes `studioId` / `genreId`.
