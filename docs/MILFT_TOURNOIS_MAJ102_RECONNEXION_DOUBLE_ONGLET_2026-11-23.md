# MILFT Tournois V2 — MAJ102 — Reconnexion de deux onglets avec brouillons divergents

**23 novembre 2026 — poursuite autonome autorisée.** Reprise après clôture MAJ101 (`a37145d4`) et consignation du backlog non prioritaire (`ab146453`).

## Objectif ciblé
Tester l'absence de doublon et de perte de saisie lors de la reconnexion simultanée de deux onglets du même PC, utilisant le même compte et le même tournoi fictif.

## Ajout technique
Commit initial : `63179000f48efbccc3b0eeeef4097058081d79b9`.
- Scénario Playwright utilisant exclusivement Auth/Realtime Database Emulator : deux onglets du PC saisissent des brouillons différents pendant une panne de réseau.
- Le premier brouillon doit être marqué périmé, rester consultable, et ne pas être envoyé.
- Le second brouillon est mis en file IndexedDB pendant la panne ; après la reconnexion, un seul score final doit être confirmé à distance avec version 1, sans doublon.
- L'onglet ancien doit pouvoir récupérer explicitement le dernier score sans effacer silencieusement sa saisie.
- Le reste des scénarios E2E MAJ94–101 est conservé, sans modification du code applicatif ni des règles Firebase.

## Priorités et exclusions
- Le backlog [saisie +/- en direct et temps morts](MILFT_TOURNOIS_V2_BACKLOG_AMELIORATIONS_NON_PRIORITAIRES.md) reste **non prioritaire**, et n'est pas développé durant la MAJ102.
- Aucun déploiement Firebase réel, aucune intégration à V1.1, aucun accès aux tournois ou championnats réels ni aux archives Drive.
- Firebase Spark gratuit conservé.
- Test physique de deux appareils avec deux comptes Google distincts toujours à réaliser ultérieurement.
- **Action utilisateur : aucune.**

## Vérifications GitHub Actions
- Exécution E2E ciblée `45179996392` : **en cours** lors du relevé initial.
- Corriger toute régression mise au jour et actualiser cette section avant clôture.
