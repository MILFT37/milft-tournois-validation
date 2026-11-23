# MILFT Tournois V2 — MAJ92 — Premier socle de reprise croisée Samsung / PC

**23 novembre 2026 — GO utilisateur**, après MAJ91 validée. Décision :
**pas d'appareil maître, pas de verrouillage global**, saisie possible des
deux côtés. Le Samsung peut être la saisie principale et le PC à la table
de marque une saisie complémentaire ; chaque appareil peut tomber hors ligne
et revenir indépendamment.

## Fonctionnement développé
1. **File locale indépendante par match** : `v2/outbox-idb.js` cherche,
   dans la transaction IndexedDB de réservation, la première opération
   disponible pour chaque match. Un bail, un délai ou une pause sur A
   n'interdit plus de poursuivre sur B ; une deuxième saisie A reste derrière
   sa première saisie, dans l'ordre strict. Les anciens reçus, baux et
   dépendances restent valides, y compris après fermeture du navigateur.
2. `v2/mobile-demo.mjs` tient compte des premières commandes de chaque
   match pour reprogrammer les réveils et pour le retour au premier plan.
   Une panne de transmission d'A ne bloque pas les opérations de B qui
   sont éligibles.
3. **Convergence même match / même score** : si le PC confirme 5–3 alors
   que le Samsung a 5–3 en attente sur une version plus ancienne, le
   Samsung peut acquitter son brouillon comme déjà pris en compte,
   sans nouvelle écriture Firebase ni augmentation artificielle de version.
   L'identification exige l'égalité exacte du match, de la manche, des
   deux valeurs et la version distante plus récente. Aucun « dernier
   auteur » n'est réécrit. Si les valeurs diffèrent, conserver le conflit
   selon les MAJ83–90.
4. Les états en attente, pause et conflit restent conservés et visibles ;
   aucune restauration ou correction automatique arbitraire n'est effectuée.

## Preuves automatiques
- IndexedDB Chromium et Safari/WebKit : A1 et A2 sur le même match,
  B1 et B2 sur un autre ; B progresse alors qu'A a un bail actif puis
  une pause persistante, sans jamais dépasser A1/A2 ; reprise manuelle
  d'A avec versions/IDs inchangés après rechargement.
- E2E deux Android simulés, Firebase Auth et RTDB **émulés** : B saisit
  5–3 hors connexion, A confirme 5–3 en ligne ; retour de B, aucune
  écriture supplémentaire, version distante 1, aucune perte de brouillon.
  Le parcours existant de scores **différents** doit rester un conflit
  lisible, sans écraser le résultat distant.
- GitHub Actions V2, interface Android Chromium/WebKit, IndexedDB,
  simulation de partage, publication GitHub Pages et contrôle des fichiers.

## Limite à ne pas masquer
Le Firebase Spark réel conserve actuellement une règle très spécifique
autorisant seulement le chemin de match fictif `matches/demo`. **Ce
commit ne déploie pas de nouvelles règles Firebase et ne constitue pas
encore une validation multi-match de bout en bout avec les deux appareils
physiques.** L'étape suivante devra tester des règles multi-match
généralisées sur les émulateurs, vérifier leurs permissions et obtenir
un GO explicite avant toute publication de nouvelles règles dans le
projet Firebase réel. Aucun test physique à deux comptes distincts n'a
encore été réalisé.

## Garde-fous
- Application officielle `MILFT37/milft-tournois` V1.1, championnat,
  données réelles, Google Drive et archives **intouchés**.
- Firebase Spark gratuit, règles réellement publiées, données et
  comptes Google **inchangés** ; tests sur émulateurs et fichiers
  IndexedDB du prototype uniquement.
- Le test réel Samsung (connexion Google, salle fictive, score 5–3)
  est acquis ; aucune nouvelle manipulation Samsung demandée.
- Pas d'intégration prématurée du prototype à la production.

## Clôture
**MAJ92 VALIDÉE et publiée pour le prototype — 23 novembre 2026.**

- Commit applicatif/tests/documentation : `d91ea254815ad04be80e84a05bf3a13b55744fa9`.
- **Simulation du partage** GitHub Actions `45142958305` : **SUCCESS**.
- **Interface Android Chromium et Safari/WebKit** `45142958359` : **SUCCESS**.
- **IndexedDB Chromium et WebKit** `45142958362` : **SUCCESS**. File indépendante par match, A2 attendant A1, B progressant sous bail puis pause de A, redémarrage sûr.
- **GitHub Pages et contrôle des fichiers publics** `45142958547` : **SUCCESS** ; prototype V2 isolé publié.
- Premier E2E deux Android `45142958426` : **FAILURE de l'ordre des scénarios de test** (un ancien test des rôles attendait encore l'ancienne salle après une création de salle MAJ92). Aucun code applicatif modifié pour ce point.
- Correctif **test uniquement** : commit `9a22e492dcfabb90af8df56ac3fd6f55d29784ad`, déplacement du scénario MAJ92 après les contrôles historiques des rôles.
- **E2E Firebase Auth + RTDB émulés, deux Android simulés** `45143199968` : **SUCCESS**. Saisie 5–3 hors connexion sur B, score identique confirmé par A, retour de B sans version additionnelle, sans écraser l'auteur du résultat confirmé, sans conflit artificiel ; anciens cas de scores différents toujours testés.
- Le prototype ne simule encore **qu'un chemin Firebase `matches/demo`** avec les règles publiques actuelles. Le multi-match bout en bout n'est **pas encore validé sur Firebase réel ni sur appareils physiques**. Toute nouvelle règle Firebase devra d'abord être conçue/testée en émulation et recevoir une autorisation spécifique avant publication.
- **V1.1 officielle, tournois réels, championnats et archives Drive intouchés.** Règles Firebase réelles, données, comptes et forfait Spark inchangés.
- **Aucune action Samsung nécessaire.** Le test inter-appareils physiques avec deux comptes Google distincts reste à réaliser.
- **Prochaine reprise : MAJ93** — préparer les règles et scénarios multi-match en émulation uniquement, sans déployer de nouvelles règles Firebase ni intégrer V2 à la production, et sans répéter les validations inchangées.
