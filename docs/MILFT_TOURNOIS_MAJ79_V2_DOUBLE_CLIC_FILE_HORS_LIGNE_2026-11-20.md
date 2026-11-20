# MILFT Tournois — MAJ79 — Sécurisation du double-clic et du passage hors ligne

**20 novembre 2026, GO explicite.** Suite à la MAJ78 clôturée : `docs/MILFT_TOURNOIS_MAJ78_V2_SAISIES_ET_SALLES_2026-11-20.md`.

## Constat
- Le bouton « Enregistrer le score fictif » n'était désactivé que pendant `transmit()`, pas pendant la phase asynchrone `IndexedDB.enqueue()`. Deux clics rapprochés pouvaient enregistrer deux événements distincts portant la même version distante et produire un conflit artificiel.
- Si la salle ou le compte changeait pendant `enqueue()`, le résultat tardif pouvait afficher un message de l'ancienne salle sur le nouvel écran.
- Les tests historiques MAJ75 à MAJ78 (Firebase réel sur un Samsung, navigateur, simulation, deux Android avec émulateur Firebase, règles compactes) ont déjà été validés. Ne pas redemander les parcours non modifiés à l'utilisateur.

## Correction du prototype isolé
- Ajout d'un état `enqueuing` : désactivation immédiate du bouton de saisie durant l'écriture IndexedDB ; verrou aussi au niveau de `sendScore()`, y compris pour deux déclenchements programmatiques rapides.
- L'écriture utilise une portée et une instance de file figées ; au retour d'`await`, une réponse obsolète ne modifie plus la salle affichée et ne transmet pas depuis un autre contexte.
- Si les droits passent en lecture seule pendant l'enregistrement local, l'événement déjà confirmé localement est **conservé**, mais aucun nouvel envoi n'est lancé. Tous les changements restent soumis aux règles Firebase.
- Le reste de la synchronisation, de la sécurité et des interfaces réelles est préservé.

## Vérification spécifique
- Extension de `tests/v2-mobile-demo-e2e.cjs` : deux clics dans la même tâche Javascript sur `Enregistrer le score fictif` sur un simulateur Android **hors ligne**, puis contrôle d'un seul événement dans la file locale ; après reconnexion, le score fictif est confirmé exactement une fois (version distante 1).
- Maintien des scénarios existants : refus d'un score vide, changement de salle pendant lecture en attente, conflits entre appareils, reprise après fermeture, rétrogradation de droits et révocation.
- Tests exécutés exclusivement sur émulateurs Firebase : aucune écriture dans le projet réel du club.

## Réception
- Les workflows GitHub Actions modifiés doivent être vérifiés (E2E deux Android émulés, Chromium/WebKit, simulation V2, GitHub Pages et octets).
- Statuts et commit de clôture consignés ensuite ; ne pas annoncer de réussite avant les résultats.
- **Essai réel sur deux appareils physiques toujours non confirmé**, reporté jusqu'à disponibilité d'un deuxième Android ou PC.

## Périmètre strict
- Aucun changement dans `MILFT37/milft-tournois` officiel, ses sauvegardes et archives Google Drive.
- Aucune modification des règles déjà publiées dans Firebase, du tarif Spark ou des données des tournois. Prototype V2 fictif `v2Trials` exclusivement.

## Clôture MAJ79 — workflows SUCCESS
- Commit de travail `6b73804a6b23d2585bf2449374260c6789b6cb49` : verrou `enqueuing` avant IndexedDB, réponses obsolètes isolées, absence de transmission hors rôle autorisé.
- Simulation partage V2 `44827192454` : **SUCCESS**.
- Tests navigateurs Android Chromium et Safari WebKit `44827192472` : **SUCCESS**.
- E2E deux Android simulés avec Firebase Auth + RTDB émulateur et règles compactes `44827192705` : **SUCCESS**, y compris nouveau double-clic hors ligne donnant une seule opération et un seul changement de version après reconnexion.
- Publication GitHub Pages + vérification des octets servis `44827192700` : **SUCCESS**.
- MAJ79 **validée et publiée côté tests/code**. La synchronisation entre deux appareils physiques ou deux comptes Google réels reste **non validée** ; le premier essai Samsung réel MAJ75 reste acquis et n'est pas à recommencer.
- Dernier commit de production officielle `MILFT37/milft-tournois` : `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c` (inchangé). Aucun transfert/restauration de données V1.1 ni d'archives Drive, aucune modification des règles Firebase déjà publiées ou du forfait Spark.
