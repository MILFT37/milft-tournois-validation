# MILFT Tournois V2 — MAJ93 — Règles multi-match candidates (émulateur exclusivement)

**23 novembre 2026 — GO utilisateur**, reprise depuis `docs/MILFT_TOURNOIS_MAJ92_V2_MULTIMATCH_SAISIE_CONCURRENTE_2026-11-23.md` (MAJ92 validée).

## Portée de l'étape
Préparer et vérifier le partage multi-match entre un Samsung et le PC de la table de marque **sans appareil maître**, sans verrou global du tournoi, et avec un contrôle strict des droits par Firebase.

**Cette MAJ ne déploie PAS ces règles sur le projet Firebase réel**. Fichier candidat distinct : `v2/database.rules.multimatch-candidate.emulator.json`. Les fichiers publiés `v2/database.rules.console-v2-only.json` et `v2/database.rules.json` restent inchangés, tout comme les données, utilisateurs, fichiers Drive et la production V1.1.

## Règles candidates
- Sous `v2Trials/$tid/matches/$mid`, remplacer la limitation au seul `demo` par un identifiant de match validé `$mid`. Tous les autres champs, autorisations et interdictions de la branche `v2Trials` restent inchangés.
- Initialisation d'un **nouveau match fictif** uniquement par le propriétaire de la salle, avec `version:0`, `status:'playing'`, un score initial 0–0, les reçus `seed`, et `updatedBy` égal à son UID authentifié.
- Sur un match existant, propriétaire et `editor` peuvent modifier les scores uniquement via une écriture atomique sur **le match complet**, avec `version+1`, auteur authentifié et nouvel identifiant d'événement. Les droits `viewer`, les UID non autorisés et les comptes absents ne peuvent pas écrire.
- Lecture des matchs réservée au propriétaire et aux membres `editor/viewer`. Aucune autorisation large de lecture ou écriture sur les tournois, leurs tables, les métadonnées, ni sur la racine. Aucune suppression de match, finalisation arbitraire, création par un éditeur, écriture partielle, valeur invalide ou champ injecté.
- Les règles de l'instance de démonstration existante (création de salle avec match `demo`) restent compatibles.

## Vérifications automatisées exigées
- `tests/v2-rtdb-multimatch-candidate.cjs` utilise exclusivement Firebase Realtime Database Emulator et `@firebase/rules-unit-testing` contre le **fichier candidat** (pas le projet réel).
- Tester deux matchs distincts (`demo`, `courtB`) qui avancent indépendamment, versions par match, concurrentiel sur un même match, refus d'écriture périmée, lecteur invité, révocation, isolations entre salles, absence d'élévation de privilèges, suppression et écriture imbriquée refusées, validation stricte des scores et des IDs.
- Comparer structurellement candidat/règles publiées : **aucune** différence hors branche de validation et d'écriture `matches/$mid`. Ne pas relancer les campagnes V1.1 ni les tests déjà validés sur les fichiers inchangés.
- Workflow dédié `.github/workflows/v2-multimatch-candidate.yml`, exécution sur `main`, publication des verdicts dans ce document.

## Limites encore en place
- La page publique `v2/mobile-demo.html` utilise toujours `matches/demo`, **pas de sélection multi-match dans l'interface**. Même si les règles candidates passent sur émulateur, ne pas annoncer un partage multi-match complet sur appareils physiques.
- La convergence et la file par match MAJ92 sont validées sur les tests précédents, mais une véritable validation de bout en bout multi-match (interface + Firebase + deux appareils physiques, comptes distincts) reste à construire et à effectuer.
- Avant toute éventuelle publication de nouvelles règles sur Firebase réel, vérifier leurs risques et demander un GO séparé. Spark gratuit conservé.

**Action requise sur Samsung : aucune pour cette MAJ.**

## Clôture
**En cours.** Ajouter les commits et verdicts GitHub Actions, sans prétendre que les règles candidates sont déjà en production.
