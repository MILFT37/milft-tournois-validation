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
**Développement engagé.** Inscrire commit, workflows et résultat de publication
avant validation définitive de la MAJ88.
