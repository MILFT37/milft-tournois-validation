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
## Clôture MAJ101 — 23 novembre 2026
**MAJ101 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**
- Commit initial `8ed5a7db33b09977eb6e3621924af72ea20a3105`.
- GitHub Actions deux appareils / multi-match E2E `45170600162` : **SUCCESS**.
- GitHub Actions simulation partage `45170600174` : **SUCCESS**.
- Le recontrôle à `pageshow` / au retour de visibilité détecte un jeton local remplacé même sans événement `storage` ; l'ancienne saisie reste affichée et bloquée, puis l'utilisateur peut recharger explicitement le brouillon de référence.
- Comparaison depuis MAJ100 : seuls le module multi-match émulé, son E2E, et ce document sont modifiés.
- **V1.1, règles Firebase réelles/candidates, données, championnats et archives Drive intacts.**
- Test physique Samsung/PC avec deux comptes Google distincts toujours non effectué.
- **MAJ102 proposée :** compléter les cas de restauration et récupération de conflit lors d'une reconnexion avec plusieurs onglets, sans automatisme destructeur.
- **Action utilisateur : aucune.**

## Backlog non prioritaire — nouvelles demandes du 23 novembre 2026
Deux améliorations **à prévoir ultérieurement**, sans impact sur la clôture MAJ101 ni sur la priorité MAJ102 :
1. **Saisie en direct par boutons − / + de part et d'autre du score de chaque camp**, notamment pour l'arbitre et le capitaine en course aux points, avec distinction entre score en cours et score final.
2. **Temps morts configurables dans les paramètres des formats**, préréglages : poules 0, tableaux 2 par manche, course aux points 1 par bloc. Le périmètre exact du quota (équipe ou rencontre) sera confirmé avant développement.

Référence détaillée et durable : [Backlog V2 — améliorations non prioritaires](MILFT_TOURNOIS_V2_BACKLOG_AMELIORATIONS_NON_PRIORITAIRES.md).
**Aucune implémentation engagée, aucune donnée ou version de production modifiée.**
