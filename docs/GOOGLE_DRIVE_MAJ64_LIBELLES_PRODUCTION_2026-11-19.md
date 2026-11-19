# MILFT Tournois V1.1 — MAJ 64 — En-tête général corrigé en production

**Date : jeudi 19 novembre 2026.** Complément aux MAJ 47–63, selon le protocole de reprise autonome.

## Validation utilisateur
- Après ouverture réelle du site officiel sur Samsung, l'utilisateur signale que « V1.1 CHAMPIONNAT SIMPLE » est un ancien libellé qui ne correspond pas à l'application complète.
- Il répond **GO** à la proposition de deux changements purement visuels :
  - Sous-titre : **« Gestion des tournois de football de table »**.
  - Pastille : **« MILFT Tournois V1.1 »**.
- Ne pas modifier le titre MILFT Tournois, les formats, les scores, les joueurs ou les archives à cette occasion.

## Modifications techniques
- Validation : commit `71ddcfcaf889d1cf206af94f39dc03e12f958435`. Deux libellés modifiés dans `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html`, la candidate dans `candidate-production-v11/`, les versions de cache PWA et le test de parité `tests/production-candidate-parity.cjs`.
- Candidate de production n°17 : **SUCCESS**, run `44547082964` sur ce commit. La parité visuelle/moteur et les tests statiques, Chromium, WebKit simulé ont réussi.
- Dépôt officiel `MILFT37/milft-tournois`, branche `main`. Ancien commit `77da71bb97978939feff21e650db608a8f621e74` ; nouveau commit **`0ef73bbb85cae5e2aacabd3f219c02b7c2013a7b`**.
- Production : modification atomique du HTML principal, de `sw.production.js` et de `tests/production-release.cjs`. Cache PWA neuf `milft-production-shell-v1-20261119-header-v11-01` afin de renouveler la page hors connexion.
- Aucune modification de `milft-drive-v11-production.js`, des clés `localStorage`, des bases IndexedDB, des règles métier, des icônes et de l'organisation Drive.

## Contrôles après publication
- **Verification PWA production V1.1 n°7** — run `44547381352` : **completed / SUCCESS** sur le commit `0ef73bbb...`. Le test de production vérifie explicitement les deux nouveaux libellés et l'absence des anciens.
- **pages build and deployment n°20** — run `44547379995` : **completed / SUCCESS** sur le même commit. Jobs build, deploy et report-build-status tous SUCCESS.
- La mise en ligne GitHub Pages est confirmée par le workflow, mais aucune seconde capture réelle de Samsung n'a été demandée pour cette modification purement visuelle.
- Adresse officielle inchangée : `https://milft37.github.io/milft-tournois/`.

## Protection des données, suite
- La précédente capture réelle du Samsung (19/11/2026, 15 h 40) montrait déjà **42 joueurs** et **4 tournois à suivre** sur la production. Cela confirme qu'il existe des données dans ce navigateur de production, sans prouver à lui seul l'identité complète de toutes les archives.
- **Aucune restauration Drive** : conserver l'archive du 19 novembre (42 joueurs et 7 enregistrements techniques) comme point de sécurité. Ne pas proposer une restauration susceptible d'écraser les quatre tournois présents.
- Les sauvegardes automatiques restent **désactivées par défaut** ; l'utilisateur peut les activer volontairement, fréquence 5/10/15/30/60 min, plafond 200 envois automatiques/jour et par appareil, sauvegarde manuelle disponible.
- Le partage simultané du même tournoi entre appareils est reporté à V2.0 ; la V1.1 n'est pas une synchronisation en temps réel.
- **Ne pas refaire les vérifications déjà réussies** ni demander de recharger pour confirmer une simple correction. Les seuls jalons ouverts seront ceux explicitement signalés ultérieurement par l'utilisateur.
