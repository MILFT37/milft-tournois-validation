# MILFT Tournois V1.1 — MAJ 62 — Parité stricte entre validation et candidate de production

Date : 19 novembre 2026. Complément au protocole MAJ 47–61. **Aucune publication sur le dépôt officiel `MILFT37/milft-tournois` et aucune modification de données Drive.**

## Demande utilisateur et périmètre
L'utilisateur a demandé « Go » après l'annonce d'une comparaison finale de la candidate de production avec la dernière V1.1 validée. Ce GO autorise la comparaison et la consolidation **sur le dépôt de validation**, mais il ne constitue pas une autorisation explicite de promotion ni de restauration de données réelles.

## Comparaison exacte exécutée
- Sources : `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html` (3 418 lignes) et `candidate-production-v11/MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html` (3 226 lignes).
- L'algorithme de comparaison LCS a identifié **10 zones de différence**, aucune modification du moteur métier commun ni des styles principaux.
- Les zones voulues : titre/manifeste ; bannière Drive ; texte explicatif du panneau Google Drive ; six variables/dossiers de stockage isolant les données de validation et de production ; section terminale de l'ancien adaptateur Drive de validation contre le nouveau module Drive importé par la candidate et le service worker PWA de production.
- Les différences d'interface de la bannière et du panneau de sauvegarde ont été harmonisées dans la validation et dans la candidate (commits `3f55a9d61a39cb8acc3731f1fca5ccffc50f1f48` et `cfb015948838738fe715d3edf7e3a6d57a5f850e`). Désormais le bandeau visible dit **« SAUVEGARDE LOCALE ACTIVE • Google Drive facultatif : connexion et sauvegardes dans Paramètres »**. Le panneau précise les archives visibles dans `Appli MILFT / MILFT Tournoi / MILFT Tournois / Sauvegardes` sans prétendre qu'elles sont en mode lecture seule.
- La candidate de production préserve **obligatoirement** les clés locales `milft_prod_v11_20261117_...` et sa base IndexedDB distincte pour éviter d'écraser les données de validation. Les 42 joueurs / 7 objets de tournoi du Samsung ne sont **pas** transférés automatiquement par la mise à jour du site.
- Le module Drive visible et ses nouveaux réglages sont testés à part (MAJ 61) : fréquence 5/10/15/30/60 min, défaut 15, 200 sauvegardes automatiques/jour/appareil, sauvegardes manuelles disponibles, activation volontaire, ni synchronisation temps réel ni partage multi-appareils V1.1.

## Nouveau test anti-régression de parité
- `tests/production-candidate-parity.cjs` compare strictement les **3 222 premières lignes métier et visuelles** après normalisation des **huit substitutions autorisées** (titre/manifeste et six stockages propres à chaque origine). Tout autre écart futur échoue explicitement.
- Le script refuse le retour de messages trompeurs « Google Drive désactivé » et la présence de `drive.appdata` dans le noyau de la candidate.
- Workflow `.github/workflows/production-candidate.yml` : nouveau contrôle de parité exécuté **avant** les contrôles statiques, Chromium et WebKit. Commit `5e263cdd9dca34788690ef1c2ce6261c890cf94a`.
- **Workflow candidate de production n°16 SUCCESS** — run `44541655749`, SHA `5e263cdd9dca34788690ef1c2ce6261c890cf94a`. Le nouveau test de parité stricte, le test statique, le test Chromium et le test WebKit/Safari ont **tous réussi**, sans compte Google réel.
- Contrôles précédents sur l'harmonisation de bannière : Drive n°40, Chromium mobile n°259, Pages n°239, PWA n°15 et championnat annuel n°321 : **SUCCESS**.
- La production officielle était toujours au commit `76a19f14a0af8a0ef2bf2154e7918004545d9214` à la comparaison initiale.

## Reprise et décision de publication
1. Lire le résultat de la candidate n°16 ; corriger si besoin **dans la validation seulement**.
2. Conserver toutes les validations déjà réalisées et les captures Android ; ne pas demander de refaire les tests.
3. La comparaison garantie par le nouveau test porte sur le noyau commun de la candidate et le jeu de différences autorisées, et non sur l'état initial des sauvegardes locales de l'utilisateur en production.
4. **Un GO distinct et explicite de mise en production est encore requis.** L'archive réelle du 19/11/2026 de 42 joueurs / 7 enregistrements ne doit pas être restaurée automatiquement, ni remplacée par des essais.
5. Le projet multi-appareils partageant simultanément les scores reste reporté à V2.0.

## Clôture vérifiée
- Run candidate n°16 : **SUCCESS** (statut completed).
- Dépôt de production officiel : **main 76a19f14a0af8a0ef2bf2154e7918004545d9214**, inchangé depuis la revue précédente.
- **Parité validée ; aucune promotion production ni restauration réelle effectuée par ce jalon.**
