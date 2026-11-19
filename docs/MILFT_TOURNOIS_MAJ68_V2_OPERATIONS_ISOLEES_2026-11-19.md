# MILFT Tournois — MAJ 68 — Simulation V2.0 opérations concurrentes

**Date : 19 novembre 2026** — continuation après MAJ 67 (production officielle confirmée).

## Résultat vérifié
- Production V1.1 officielle **inchangée** depuis la MAJ 67, commit `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c`, Pages n°21 `44552727377` et PWA n°8 `44552729294` **SUCCESS**.
- Nouveau prototype **hors production et hors réseau**, `v2/operations-core.cjs`, commit `2a1f567f0305fafc33dc82f15de5011e2f565ce2`.
- Tests supplémentaires `tests/v2-operations-simulated.cjs`, commit `9cd51554249444202cb26c7de3fc3759e27c3dc0`.
- Workflow existant `.github/workflows/v2-sync-simulated.yml` complété pour exécuter les tests MAJ 65 et MAJ 68 : commit `bbbdc59dd1193caebee69da4ade2102de9b2b718`.
- **GitHub Actions n°2, run `44554869616` : SUCCESS**, branche `main`, commit `bbbdc59dd1193caebee69da4ade2102de9b2b718`.

## Fonctionnalités simulées
1. Tournois isolés, matchs et tables propres à chaque tournoi.
2. Commandes de match : `table.assign`, `table.release`, `set.record`, `match.validate`, `match.forfeit`, `match.reopen`.
3. Chaque événement possède un ID, un auteur, un appareil, un tournoi, un match, une version attendue ; contrôle d'idempotence.
4. Contrôle des permissions **dans le moteur simulé** : administrateur, saisie, lecture seule ; vérification de l'auteur authentifié fourni au noyau, indépendamment de l'identifiant déclaré dans la commande.
5. Conflit si deux appareils essaient de modifier le même match avec une version dépassée, ou d'attribuer la même table.
6. Confirmation/forfait libérant la table dans la même transaction *logique* en mémoire ; forfait 5–3.
7. File de commandes sérialisable : les conflits restent présents et les commandes non conflictuelles sont traitées. **Il ne s'agit PAS encore d'une file durable IndexedDB ni d'un échange réseau.**

## Limitations explicites
- Prototype autonome en JavaScript Node ; **aucun backend Firebase, authentification Firebase, règles de base de données, synchronisation réelle ou déploiement V2**.
- Les scores de manche sont contrôlés structurellement ; la validation des règles métier selon chaque format V1.1 (points, manches, égalités, belles) n'est **pas** encore intégrée.
- Les commandes ne sont pas encore branchées sur l'interface et le moteur existants.
- La simulation des droits côté moteur ne constitue pas une sécurité serveur ; il faudra tester des règles Firebase avec des jetons d'identité, sans donner confiance à un `actorId` reçu du navigateur.
- La persistance hors ligne après fermeture doit être développée et testée avant utilisation réelle.

## Prochaine séquence recommandée (autonome, V2 isolée)
1. Définir et tester une file d'attente **IndexedDB durable**, ses erreurs et sa reprise après rechargement, sans toucher aux clés V1.1.
2. Contrôler l'intégrité des commandes de scores et adapter les règles de validation à chaque format de tournoi avant connexion réseau.
3. Écrire une maquette des règles Firebase RTDB avec tests d'accès interdits (sans activer un service réel), et un protocole de migration volontaire, sans restauration automatique.
4. Étudier les limites exactes du forfait gratuit avant toute création de projet Firebase ; ne jamais activer une facturation sans accord.
5. **Avant tout changement de production V1.1 ou transfert de données, obtenir un GO spécifique** ; le GO présent couvre seulement la progression du prototype indépendant.

## Protection des données et procédure de reprise
Les archives réelles Google Drive, le Samsung et tous les scores, joueurs, classements, tournois et clés V1.1 demeurent inchangés. Les validations V1.1 déjà réussies ne doivent pas être répétées. Ne pas demander d'action sur le Samsung tant que les tests purement automatisés peuvent continuer. En cas de changement de chat, repartir de cette MAJ 68 et des deux modules `v2/` de validation, puis contrôler uniquement les workflows des nouvelles modifications.
