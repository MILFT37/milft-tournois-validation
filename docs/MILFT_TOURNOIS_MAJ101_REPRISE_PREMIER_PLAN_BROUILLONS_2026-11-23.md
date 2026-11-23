# MILFT Tournois V2 — MAJ101 — Vérification des brouillons au retour au premier plan

**23 novembre 2026 — GO permanent utilisateur.** Reprise MAJ100 validée et clôturée, commit `e819165cbab382f56061fdf2a7f88bebccb87a66`.

## Objectif
Lorsqu'un onglet est mis en veille puis réactivé, ne pas supposer que les événements `storage` ont été intégralement reçus. Recontrôler le jeton du brouillon durablement enregistré avant que la page reprenne ses opérations et avant de permettre une transmission.

## Développement
- Commit initial `8ed5a7db33b09977eb6e3621924af72ea20a3105`.
- Contrôle de version locale à la réception de `pageshow` et au retour de visibilité. Si le jeton a changé ou si le stockage est illisible, conserver la saisie affichée, déclarer le brouillon en conflit et bloquer sa transmission.
- Récupération explicite via le bouton MAJ100 ; aucun remplacement automatique des chiffres ou création de commande Firebase.
- Scénario Playwright dédié : modification persistante sans notification `storage` du même onglet, événement `pageshow`, détection du changement, refus de l'ancien envoi, récupération volontaire du dernier brouillon, puis confirmation unique.
- Tests MAJ94–100 et règles sportives MAJ96 inchangés hors du scénario ciblé.

## Garde-fous
Aucune modification de la V1.1 officielle, des règles Firebase réelles ou candidates, des archives Drive, des championnats ou des données des tournois. Firebase Spark gratuit, Auth/RTDB Emulator exclusivement. Le test physique sur deux comptes Google et deux appareils réels n'est toujours pas réalisé.

**Action utilisateur : aucune.**

## Tests et clôture
Suivre GitHub Actions sur le commit MAJ101, corriger les éventuels défauts et noter les identifiants d'exécution avant clôture.
