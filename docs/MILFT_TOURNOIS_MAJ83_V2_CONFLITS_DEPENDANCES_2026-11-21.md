# MILFT Tournois — MAJ83 — Déblocage sûr après conflit de scores dépendants

**21 novembre 2026 — GO utilisateur.** Reprise à partir de la MAJ82 validée, document de référence : `docs/MILFT_TOURNOIS_MAJ82_V2_CHAINE_SCORES_HORS_LIGNE_2026-11-20.md`.

## Problème identifié dans la file de partage
La MAJ82 conserve volontairement les scores locaux dépendant d'un événement
qui rencontre un conflit Firebase. Mais le premier descendant reste `pending`,
sans reçu de son prédécesseur, ce qui bloque toute la file FIFO, **y compris les
nouvelles saisies indépendantes** effectuées après la résolution du conflit.

## Correctif ciblé dans V2 uniquement
- `v2/outbox-idb.js` : pendant `claimNext`, dans une **transaction IndexedDB
  unique**, un descendant dont le prédécesseur est définitivement `conflict`
  ou `blocked` est déplacé vers `conflict`, avec raison explicite, **sans
  suppression de brouillon**. Les descendants en chaîne sont conservés et
  traités successivement avant de considérer un événement indépendant.
- Un bail `sending` encore valide continue de bloquer l'envoi ; si le statut
  d'un prédécesseur est inconnu, aucune transmission anticipée n'est autorisée.
- Pendant `enqueue(chainLocalScore)`, une ancienne opération `pending` qui
  dépend, directement ou indirectement, d'un parent refusé ne devient plus la
  source de version d'une nouvelle saisie. La nouvelle opération se base sur la
  version distante connue et reste soumise à la transaction Firebase stricte.
- Aucune migration IndexedDB, aucun changement d'API Firebase, règles de
  sécurité, compte, projet ou forfait Spark.
- Aucune modification de la V1.1, des championnats ni des archives Drive.

## Preuves de validation exigées
- `tests/v2-outbox-idb-browser.cjs` sur **Chromium et WebKit** : trois
  saisies locales 0→1→2, premier score refusé, les deux descendants sont
  conservés en conflits, puis le nouveau score indépendant est transmis.
  Vérification du stockage après rechargement du navigateur.
- `tests/v2-mobile-demo-e2e.cjs` : deux Android simulés, Auth et RTDB
  **exclusivement émulés**. Deux scores hors ligne, modification concurrente
  à 6–5, reconnexion et deux conflits locaux conservés, puis nouvelle saisie
  7–6 transmise à version distante 2 sans écraser la version concurrente.
- Conserver tous les tests validés MAJ75–82 sans les répéter sur des fichiers
  inchangés ; suivre les workflows GitHub Actions déclenchés par ce commit.
- Confirmer la publication sur GitHub Pages et les SHA-256 publics conformes.

## Garde-fous de reprise
- Ne jamais intégrer le démonstrateur V2 à l'application officielle sans GO
  ultérieur spécifique. Production `MILFT37/milft-tournois` intouchée.
- Ne jamais restaurer, effacer ni remplacer les données ou archives Drive.
  Projet Firebase réel, règles d'accès et Spark gratuit inchangés.
- Tests Samsung déjà validés : connexion Google, salle fictive, score 5–3
  distant. Ne pas les redemander.
- Le test réel sur **deux appareils physiques et deux comptes Google distincts**
  reste à planifier lorsqu'un second appareil sera disponible.
- Aucune action nécessaire de l'utilisateur pour cette étape.

## Clôture
**MAJ83 VALIDÉE et publiée** — 21 novembre 2026.

- Commit initial application + tests + feuille de route `81a45f6d50243007b516d445ac6816b2904ce09b`.
- **Simulation partage V2** `44834583500` : **SUCCESS**.
- **Interface mobile Chromium et Safari/WebKit** `44834583658` : **SUCCESS**.
- **E2E deux Android simulés, Firebase Auth et Realtime Database émulés**, y compris conflits successifs, brouillons conservés et nouvelle saisie indépendante, `44834583505` : **SUCCESS**.
- **Déploiement GitHub Pages et vérification des empreintes publiques** `44834583507` : **SUCCESS**.
- Premier passage IndexedDB `44834583552` : **FAILURE d'une assertion historique MAJ82** (attendait `pending` pour un score dépendant ; le nouveau comportement MAJ83 exige `conflict`). Aucun brouillon perdu. Assertion corrigée par commit `883ea61c92b814bb88bf1d860762a82fc1718b42`.
- **IndexedDB Chromium + WebKit après correction**, `44834747104` : **SUCCESS** ; nouveaux tests de trois scores dépendants, conflit, reprise indépendante et conservation après rechargement.
- **Production V1.1 officielle inchangée**, aucune donnée réelle, championnat, archive Google Drive ou règle Firebase modifiés ; forfait Spark gratuit inchangé.
- **Aucune action utilisateur nécessaire**. Le test réel sur deux appareils physiques et deux comptes Google distincts reste à réaliser plus tard.
- Prochaine reprise : **MAJ84**, depuis cette feuille de route ; ne pas répéter les validations MAJ75–83 sur des fichiers inchangés.

