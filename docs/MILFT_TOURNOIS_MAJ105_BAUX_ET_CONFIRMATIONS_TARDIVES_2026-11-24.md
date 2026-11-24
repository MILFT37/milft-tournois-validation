# MILFT Tournois V2 — MAJ105 — Baux, reprises temporisées et confirmations tardives

**24 novembre 2026.** Reprise depuis MAJ104 clôturée (`999f313de2b76f6dd0275f6213f369cd26f6b514`).

## Objectif
Contrôler de manière ciblée les baux locaux de la file IndexedDB du prototype multi-match, sans toucher aux règles Firebase, à la production V1.1 ou aux données réelles.

## Scénario ajouté
- Deux matchs fictifs distincts `match105A` et `match105B` dans une portée de test isolée.
- Un échec temporaire sur A provoque une reprise prévue après `retryAt`. B doit être acquitté pendant ce délai.
- A ne peut pas être réclamé trop tôt ; le bail actif interdit toute reprise concurrente.
- Après expiration du bail, la nouvelle réclamation obtient un nouveau jeton ; un acquittement tardif utilisant l'ancien jeton doit être refusé, sans supprimer la commande.
- La confirmation valide retire la commande, et une répétition du même ID retourne `already-confirmed`.
- Aucun conflit ou commande ne doit subsister dans cette portée une fois les deux confirmations réalisées.

## Exclusions
**Test ciblé uniquement**, aucun changement de code applicatif, Firebase réel/candidat, production V1.1, championnats, sauvegardes et archives Drive. Test physique Samsung/PC à deux comptes Google distincts toujours non réalisé. Le backlog +/− et temps morts reste non prioritaire.

**Action utilisateur : aucune.**

## Vérification GitHub Actions
En attente de vérification du workflow après commit. Ne pas clôturer sans succès.
