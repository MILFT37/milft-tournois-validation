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
**MAJ93 VALIDÉE sur émulateur — 23 novembre 2026. Règles réelles NON déployées.**

- Commit initial candidat, tests et workflow dédié : `7d784269c56a46c22d7959b811d4e8b991825730`.
- **Simulation de partage V2 existante** : workflow `45147237841` — **SUCCESS**, inchangée.
- Première exécution du nouveau workflow `45147237785` : **FAILURE**, deux jokers RTDB au même niveau (`$other`/`$mid`). Correction dans le fichier candidat uniquement : `94e8134208e4015d397c5828ac3837f11ea37ab0`.
- Deuxième exécution `45147394389` : **FAILURE d'assertion structurelle du test** : le nouveau joker remplace l'ancien. Correction du test `0dfb398379ddf1af01dd00a6c7a84935e4cd30eb`. Simulation existante `45147394150` : **SUCCESS**.
- Troisième exécution `45147561637` : **FAILURE du test d'identifiant invalide** : `invalid.match` était refusé directement par le SDK Firebase avant consultation des règles. Correction du seul test avec un chemin admissible par le SDK mais refusé par nos règles : `65ac0ecc3f1488ee928c088fa2915d892dfce748`.
- **Sécurité multi-match Firebase Emulator — workflow `45147782302` : SUCCESS.** Vérification création de deux matchs fictifs, score indépendant A/B, concurrence/versions périmées, statuts `admin/editor/viewer`, révocation, isolation entre salles, validation des valeurs/IDs, aucune suppression, aucun champ arbitraire ni écriture partielle.
- **Aucune publication du candidat sur Firebase réel.** Le fichier `v2/database.rules.multimatch-candidate.emulator.json` est un artefact de validation GitHub, utilisé uniquement par le test dédié. `v2/database.rules.console-v2-only.json`, `v2/database.rules.json`, les workflows existants, l'interface V2 et l'application V1.1 sont inchangés. Pas de campagne de tests V1.1 relancée.
- **Aucune manipulation Samsung** et aucun usage de comptes ou données Firebase réels. Les archives Google Drive et championnats restent préservés. Forfait Spark gratuit maintenu.
- **Prochaine reprise : MAJ94** — préparation d'un essai d'interface multi-match **sur émulateurs uniquement**, avec sélection explicite du match et test des deux appareils sur matchs distincts ; conserver la V1.1 et demander une autorisation séparée avant tout déploiement de nouvelles règles Firebase réelles.

