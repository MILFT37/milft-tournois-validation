# MILFT Tournois V2 — MAJ102 — Reconnexion de deux onglets avec brouillons divergents

**23 novembre 2026 — poursuite autonome autorisée.** Reprise après clôture MAJ101 (`a37145d4`) et consignation du backlog non prioritaire (`ab146453`).

## Objectif ciblé
Tester l'absence de doublon et de perte de saisie lors de la reconnexion simultanée de deux onglets du même PC, utilisant le même compte et le même tournoi fictif.

## Ajout technique
Commit initial : `63179000f48efbccc3b0eeeef4097058081d79b9`. Corrections du test ciblé : `382a8802`, `22e1472e`, `b9b4d92d`, `02777ba2`, `b83cb29d`.
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
- Exécutions intermédiaires `45179996392`, `45180401966`, `45180717589`, `45181087392`, `45181365009` : **FAILURE** sur les hypothèses et l'attente du nouveau scénario E2E. Les journaux montrent notamment que le deuxième onglet était obsolète avant de recharger le brouillon, puis qu'un ancien conflit conservé sur *demo* était compté dans le total. Aucun de ces résultats n'autorise une modification de la production.
- Scénario corrigé : le deuxième onglet recharge explicitement le brouillon de référence avant édition ; la vérification de la file porte **sur reconnect102**, en respectant l'actualisation asynchrone des compteurs et sans supprimer le conflit historique de demo.
- **Exécution finale E2E `45181673297` : SUCCESS** sur Firebase Emulator, y compris reconnexion, confirmation unique, version 1 et conservation des conflits antérieurs.

## Clôture MAJ102 — 23 novembre 2026
**MAJ102 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**
- Les tests complets sur émulateurs passent après les corrections du scénario.
- Cette MAJ ajoute un test ciblé et sa documentation ; **aucun code applicatif ni règle Firebase réel ou candidat n'a été modifié**.
- Les acquis MAJ95–101 restent préservés. Aucun changement de données réelles, d'archives Drive, de championnats, de V1.1 ou de site officiel.
- Le test physique Samsung et PC avec deux comptes Google distincts reste à effectuer plus tard.
- **Reprise suivante MAJ103** : contrôle ciblé de deux matchs distincts sous connexion instable et confirmation tardive, sans alourdir les campagnes déjà validées.
- **Action utilisateur : aucune.**
