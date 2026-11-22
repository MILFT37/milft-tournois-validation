# MILFT Tournois V2 — MAJ88 — Reprise de la file après retour du droit de saisie

**22 novembre 2026 — GO utilisateur.** Départ : MAJ87 validée et publiée, `docs/MILFT_TOURNOIS_MAJ87_V2_REPRISE_PREMIER_PLAN_2026-11-21.md`.

## Risque corrigé
La MAJ77 met à jour en direct le rôle d'un invité : `editor` (saisie)
vers `viewer` (lecture seule), puis retour à `editor`.
Pendant la lecture seule, des scores peuvent rester en attente dans la file
IndexedDB isolée. Lors du rétablissement du droit de saisie, l'interface
réactivait les boutons mais **ne relançait pas automatiquement la file**.
Sans nouvel événement réseau, de visibilité, ou clic, les opérations
attendaient inutilement.

## Changement minimal MAJ88
- Sur transition effective `viewer → editor`, invoquer la reprise au premier plan
  introduite en MAJ87. Cette reprise n'est pas déclenchée pour `viewer`,
  pour un rôle inconnu, sans utilisateur/salle actifs, hors connexion ou
  si le document est masqué.
- La file est relue depuis IndexedDB dans sa portée
  `(tournoi, acteur, appareil)`, sans supprimer ni réécrire de scores.
- `claimNext` conserve la transaction, l'idempotence, les baux, les délais
  `retryAt` et les conflits. L'autorisation d'écriture reste vérifiée
  par les règles Firebase sur chaque transaction : jamais de contournement.
- Aucune modification des règles de sécurité, des données Firebase réelles,
  de l'application officielle V1.1, du forfait Spark ni du schéma IndexedDB.

## Tests exigés
- E2E deux Android indépendants dans des navigateurs simulés avec les
  **émulateurs Firebase Auth/Realtime Database** uniquement :
  salle fictive créée par A ; B invité en `editor` et un score local 7–5
  ajouté dans la file ; passage en `viewer` ; score conservé et non
  envoyé ; retour en `editor` sans clic « Renvoyer » ;
  score final 7–5/version 1/ID initial, file vide.
- Vérification Chromium et Safari/WebKit, simulation partagée,
  déploiement GitHub Pages + contrôle des empreintes publiques.
- Ne pas refaire séparément les validations antérieures sur les fichiers
  inchangés, notamment IndexedDB MAJ84 et règles Firebase.

## Limites conservées
- Prototype V2 isolé. Ne pas intégrer à `MILFT37/milft-tournois`
  ou toucher à la production V1.1, aux championnats et archives Drive.
- Règles Auth/Realtime Database existantes et projet Firebase Spark
  gratuit inchangés. Tests sur données **entièrement fictives**.
- Test Samsung initial (connexion Google, salle fictive, score 5–3)
  déjà validé : ne pas le redemander.
- Test inter-appareils **physiques** avec deux comptes Google distincts
  restant en attente.
- **Aucune action utilisateur sur Samsung**.

## Clôture
**MAJ88 VALIDÉE et publiée — 22 novembre 2026.**

- Commit du correctif applicatif, du scénario E2E et de la feuille de route : `2f20ab250c8460c1064a02ed5ebf6e4341198f0f`.
- **Simulation du partage V2** : GitHub Actions `45013695417` — **SUCCESS**.
- **Interface Chromium et Safari/WebKit** : `45013695461` — **SUCCESS**.
- **E2E Android simulé avec Firebase Auth et Realtime Database émulés** : `45013695479` — **SUCCESS**. Compte invité rétrogradé de `editor` à `viewer` : score 7–5 conservé localement sans transmission ; après restauration du rôle `editor`, envoi automatique d'un seul événement sous son ID d'origine, version distante 1, file vidée.
- **GitHub Pages et contrôle des fichiers publics** : `45013695406` — **SUCCESS**. Prototype V2 publié dans son espace d'essai isolé.
- Règles Firebase, base de production, `v2/outbox-idb.js` et schéma local inchangés : pas de nouvelles validations de composants identiques nécessaires.
- V1.1 officielle, scores/tournois/championnats réels, sauvegardes et archives Google Drive intouchés. Firebase Spark gratuit et règles de sécurité inchangés.
- **Aucune manipulation Samsung nécessaire**. Test entre deux appareils physiques et deux comptes Google distincts toujours non réalisé.
- **Prochaine reprise : MAJ89**, en poursuivant la fiabilisation du prototype V2 uniquement, sans réexécuter les validations acquises pour du code inchangé.
