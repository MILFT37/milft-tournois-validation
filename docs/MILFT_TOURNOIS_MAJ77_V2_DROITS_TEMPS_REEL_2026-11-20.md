# MILFT Tournois — MAJ77 — Mise à jour des droits en temps réel (20/11/2026)

## Périmètre, objectif, GO
Suite au GO de poursuite après la MAJ76 validée. Prototype V2 uniquement, aucun changement des règles Firebase réelles ni de la base ou de la production V1.1. Utilisateur sans deuxième Android disponible actuellement ; ne demander aucun nouveau test de la connexion initiale ou du score 5–3 déjà validé sur Samsung.

## État de départ confirmé
- La MAJ76 est publiée et validée via GitHub Actions : simulation, Chromium/WebKit, E2E deux Android avec règles compactes, déploiement Pages et comparaison octet à octet des pages publiques.
- Google Authentication, création d'une salle fictive et enregistrement du score 5–3 sur Realtime Database réelle déjà validés sur Samsung.
- Le test physique avec un deuxième appareil ou compte Google distinct reste non effectué.

## Changement ciblé
- `v2/mobile-demo.mjs` : abonnements aux droits spécifiques de l'UID invité dans `v2Trials/<id>/members/<uid>`. Réagit à chaud aux changements `editor` ↔ `viewer`, et au retrait : cache le score, arrête les écoutes, désactive les commandes, conserve les opérations déjà placées en file locale IndexedDB.
- Ne déclare pas les saisies non enregistrées comme sauvées. Les données sous l'arbre V1.1 ne sont jamais ouvertes.
- `v2/mobile-demo.html` : explications à côté des boutons d'invitation sur le comportement des droits.
- `tests/v2-mobile-demo-e2e.cjs` : extension du parcours deux Android simulés, après sauvegarde/restauration hors ligne existante, pour valider la rétrogradation en lecture seule, la réautorisation en saisie et la révocation immédiate sans actualiser.
- Règles Realtime Database `v2/database.rules.console-v2-only.json` **inchangées** : les contrôles côté serveur restent l'autorité. Les tests continuent d'utiliser l'émulateur ; aucun test automatique ne doit joindre la base du club.

## Réception et suite
- Récupérer les workflows GitHub Actions pour ce commit, corriger si besoin, vérifier Pages après déploiement.
- Ne pas déclarer le test réel entre deux appareils validé sans disposer d'un deuxième téléphone/PC et d'un autre compte.
- Aucune opération n'est à demander au Samsung pour ce jalon ; conserver la production `MILFT37/milft-tournois` et les archives Drive sans modification. Forfait Spark gratuit conservé.

## Clôture MAJ77 — publication et quatre tests SUCCESS
- Commit V2 initial `c6bb3b72009a2964fc64d787dffcb5a0903e3467`, correction ciblée du test restauré `54c4fe715f9e8e84a9b0452d305d158a6c831ae5`, puis correction des messages de retrait de droits `eb154911efdc0603b16ab3536fb45dd349ed52ff`.
- Premier test E2E a identifié une différence réelle de séquencement Firebase : à la révocation, le flux match peut recevoir `PERMISSION_DENIED` avant l'écoute `members/UID`. L'écran se masquait correctement, mais le texte indiquait une interruption générique. Correction : message explicite « Accès retiré ou refusé par Firebase » et conservation de la file locale. Aucun changement aux règles serveur.
- Pour le commit corrigé `eb154911` : simulation partage V2 run `44818181287` **SUCCESS** ; navigateur Chromium/WebKit run `44818181319` **SUCCESS** ; E2E deux Android avec émulateurs Firebase et rôles à chaud run `44818181417` **SUCCESS** ; déploiement GitHub Pages + comparaison des fichiers publics run `44818181324` **SUCCESS**.
- L'interface du prototype V2 actualisée est publiée ; **le test physique entre deux appareils/identités demeure encore à faire**. La création de salle et le score 5–3 sur Samsung sont déjà validés et ne doivent pas être redemandés.
- Dernier commit de production `MILFT37/milft-tournois` relevé : `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c` — inchangé par MAJ77. Aucune modification d'archives Drive ni du forfait Firebase Spark.
