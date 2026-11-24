# MILFT Tournois V2 — MAJ104 — Coupures réseau répétées, deux matchs sans doublons

**24 novembre 2026.** Reprise depuis la MAJ103 validée et clôturée (`7783e1b266f9d7583dd422bc65a30c5c924b0e08`).

## Objectif
Renforcer la preuve d'absence de doublons sur **deux matchs fictifs indépendants** lorsqu'un même appareil (Samsung simulé) perd et récupère plusieurs fois son réseau.

## Nouveau scénario E2E ciblé
- Deux matchs fictifs `flap104A` et `flap104B`, format belle 5 points avec prolongation et plafond 8–7.
- Première coupure Samsung : saisir 5–3 sur A, 5–2 sur B, chacun en file locale. Aucune écriture distante avant reconnexion.
- Après reconnexion, vérifier les deux scores, leurs auteurs, leurs acquittements IndexedDB et **version distante 1** chacun, visible également sur le PC.
- Deuxième coupure : modifier A en 6–4 et B en 7–5. Après reconnexion, les deux scores sont confirmés en **version 2** exactement.
- Deux coupures supplémentaires sans score à envoyer et plusieurs retours au premier plan : aucune version supplémentaire ni retransmission d'un reçu.
- Les résultats précédents MAJ94–103 restent dans le même parcours Playwright ; pas de nouvelle campagne V1.1.

## Périmètre et protections
- **Test émulé uniquement.** Pas de modification du code applicatif, des règles candidates ou des règles Firebase réelles.
- Pas de déploiement V1.1, aucune donnée, championnat ou archive Google Drive modifiée. Firebase Spark gratuit conservé.
- Test physique Samsung/PC et deux comptes Google réels toujours à organiser ultérieurement.
- Backlog saisie +/− et temps morts : non prioritaire.
- **Action utilisateur : aucune.**

## GitHub Actions
À compléter avec les commits et exécutions. Clôture uniquement après succès du parcours ciblé.
