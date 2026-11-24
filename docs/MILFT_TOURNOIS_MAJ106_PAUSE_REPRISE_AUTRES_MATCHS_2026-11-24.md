# MILFT Tournois V2 — MAJ106 — Pauses de reprise et indépendance entre matchs

**24 novembre 2026.** Reprise MAJ105 clôturée (`3c394eaf6e7f48c3f0ad8d9d61f408901cfc47f1`).

## Objectif
Vérifier que des échecs réseau répétés sur un match peuvent imposer une pause de sécurité à sa commande, sans bloquer les autres matchs indépendants de la même file IndexedDB fictive.

## Scénario ciblé
- Match A : erreurs temporaires successives, délai `retryAt` respecté, puis `retryPaused=true`.
- Match B : opération indépendante confirmée pendant que A est temporisé.
- La pause de A ne doit jamais se résoudre toute seule malgré l'avancement de l'horloge.
- Une reprise *explicite* utilisant `ignoreRetryAt` permet de remettre A en traitement, puis son acquittement est vérifié.
- Vérifier l'absence de commandes en attente après les confirmations.

## Protections
Test de file locale uniquement, sans changement du code applicatif ni des règles Firebase réelles/candidates. Production V1.1, données, championnats et archives Drive intacts. Test physique à deux comptes Google distincts toujours reporté. Backlog saisie +/- et temps morts non prioritaire.

**Action utilisateur : aucune.**

## GitHub Actions
À contrôler avant toute clôture.
