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
