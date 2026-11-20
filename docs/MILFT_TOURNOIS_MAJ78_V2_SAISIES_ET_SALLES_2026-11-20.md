# MILFT Tournois — MAJ78 — Saisies vides et sécurité entre salles

**20 novembre 2026 — GO de poursuite explicite.** Reprise après clôture MAJ77 : `docs/MILFT_TOURNOIS_MAJ77_V2_DROITS_TEMPS_REEL_2026-11-20.md`.

## Constat et corrections
- Le prototype V2 transformait une case de score vide en zéro via `Number('')`. La nouvelle validation impose un score entier explicite de 0 à 99 dans **chaque** case. Aucune mise en file ni écriture en cas d'oubli.
- Une réponse asynchrone RTDB provenant d'une salle précédente pouvait réapparaître après une nouvelle ouverture. Un compteur de génération de salle (`roomGeneration`) invalide les réponses, abonnements, erreurs et ouvertures de stockage locaux obsolètes.
- La file IndexedDB et les envois en cours capturent explicitement leur portée (salle fictive, compte Firebase et instance de file). Le renouvellement de salle, changement de compte ou passage en lecture seule empêche de commencer de nouveaux envois dans la mauvaise salle. Les opérations non confirmées restent conservées, y compris en cas de fermeture pendant un envoi.
- `createRoom` refuse de rattacher une nouvelle salle au navigateur après déconnexion du compte ayant demandé sa création.
- Aucun changement des règles Firebase réelles ni de la console Firebase ; seule la simulation `v2Trials` est concernée.

## Vérification ciblée
- `tests/v2-mobile-demo-e2e.cjs` teste le refus d'une case de score vide après un score 5–3 et la conservation du score distant.
- Le test retarde volontairement une demande d'ouverture de la salle initiale, ouvre une **nouvelle** salle et vérifie que la vieille réponse ne peut plus remplacer l'écran actif.
- Les scénarios existants de deux Android simulés, conflits, hors ligne, réouverture, invitations, permissions et révocation restent inchangés.
- Contrôler les nouveaux workflows GitHub (simulateur, Chromium/WebKit, E2E Firebase émulateur et déploiement Pages), consigner les résultats et les éventuels correctifs.

## Garantie de non-interférence
- Production officielle `MILFT37/milft-tournois` V1.1 et archives Drive **inchangées** ; aucun import de tournoi réel ni migration.
- Projet Firebase Spark gratuit, règles réellement publiées, Google Auth et `v2Trials` **inchangés**.
- Connexion et écriture du score fictif 5–3 depuis le Samsung déjà validées en MAJ75. Ne pas redemander ce test.
- Test physique entre deux appareils différents toujours **à faire ultérieurement**, sans bloquer cette amélioration.

## Réception MAJ78 — quatre workflows SUCCESS
- Commit de corrections `df93388005719060c244b54763286d94ab77ef3a`.
- Simulation partage V2 `44818884420` : **SUCCESS**.
- Interface mobile Chromium + Safari/WebKit `44818884767` : **SUCCESS**.
- Test de deux Android émulés, Firebase Auth/Realtime Database, règle compacte, vérification score vide et réponse ancienne entre salles `44818884627` : **SUCCESS**.
- Publication GitHub Pages et comparaison des octets des fichiers publics `44818884335` : **SUCCESS**.
- Production officielle `MILFT37/milft-tournois` : dernier commit `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c`, non modifié par MAJ78. Les données des tournois réels, la V1.1, les archives Drive et les règles Firebase déjà déployées sont inchangées.
- MAJ78 clôturée côté code/tests/publication. Le test physique avec un deuxième Android ou PC et un autre compte Google reste **non validé**, sans remettre en question les essais Samsung réels déjà confirmés.
