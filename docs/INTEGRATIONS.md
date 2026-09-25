# Intégrations Jellyfin 12

Lumo agit dans l'interface **Jellyfin Web**. Le thème ne remplace pas les plugins serveur ni les clients natifs Android TV, Roku ou iOS.

| Projet demandé | Dans Lumo 1.15 | Dépendance serveur ou limite |
| --- | --- | --- |
| [HoverTrailer](https://github.com/Fovty/HoverTrailer) | Aperçu muet au survol des cartes, bande-annonce locale puis vidéo de thème, arrêt à la sortie du pointeur. | Les bandes-annonces YouTube, le transcodage et les réglages avancés du plugin ne sont pas inclus. Seuls les formats que le navigateur lit directement démarrent. |
| [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) | Navigation et rails Lumo, raccourcis natifs de lecture, améliorations visuelles. | Les fonctions serveur telles que Seerr, Sonarr/Radarr, avis, liste de souhaits et stockage des préférences exigent ce plugin ou des services associés. Elles ne sont pas fournies par Lumo. |
| [GetAvatar](https://github.com/cedev-1/jellyfin-plugin-GetAvatar) | Les avatars et réglages de profil natifs restent accessibles. | La galerie partagée et les packs d'avatars exigent un plugin serveur adapté à Jellyfin 12. Le dépôt cité annonce des tests sur 10.11 seulement. |
| [Intro Skipper](https://github.com/intro-skipper/intro-skipper) | Le lecteur Jellyfin et ses commandes de saut restent natifs et visibles. | La détection des intros/outros nécessite un fournisseur de segments et une analyse de bibliothèque. Intro Skipper annonce Jellyfin 12.0+ ; activer les actions de saut dans les réglages de lecture. |
| [Continue Watching Deduplicator](https://github.com/SloMR/jellyfin-plugin-dedupe-continue-watching) | La ligne de reprise Lumo ne montre qu'un épisode par série. | Les autres clients et les lignes natives nécessitent le plugin serveur. |
| [AnimeThemes](https://github.com/EusthEnoptEron/jellyfin-plugin-animethemes) | L'aperçu Lumo peut lire la première vidéo de thème exposée par Jellyfin. | La recherche et l'import des OP/ED depuis AnimeThemes nécessitent un fournisseur serveur compatible Jellyfin 12 et l'identifiant AniDB. Le dépôt cité ne documente pas encore Jellyfin 12. |

La version 12 du serveur cible .NET 10. Ne réutilisez pas un binaire de plugin compilé pour Jellyfin 10.11 ; installez uniquement une version qui annonce explicitement la compatibilité 12.

## Vérification sur le serveur cible

1. Sauvegarder `jellyfin-web/index.html` et le répertoire de données Jellyfin avant toute mise à jour du serveur.
2. Installer Lumo avec `install/install.sh` ou `install/install.ps1`, puis redémarrer Jellyfin et recharger le navigateur sans cache.
3. Vérifier l'accueil sur bureau et téléphone : Hero, sept jaquettes, flèches, reprise, fiches, lecture et retour du lecteur.
4. Pour les aperçus, ajouter une bande-annonce locale ou une vidéo de thème à un film ou une série ; survoler sa carte. Aucun aperçu n'est lancé sur écran tactile, avec économie de données ou préférence de mouvement réduit.
5. Pour le saut d'intro, installer un fournisseur de segments compatible 12, lancer l'analyse des segments et activer le saut dans les préférences de lecture Jellyfin.

`npm run check` vérifie la syntaxe et des invariants du projet. Il ne constitue pas une validation de lecture, de plugins ou de rendu sur votre serveur.
