# MILFT Tournois — MAJ 81 — Transmission FIFO et protection du bail actif

**20 novembre 2026 — GO utilisateur.** Reprise exacte après MAJ80 close : `docs/MILFT_TOURNOIS_MAJ80_V2_REPRISE_BAIL_FILE_2026-11-20.md`.

## Risque identifié
Le `claimNext` IndexedDB initial parcourait l'index `byScope`, qui trie sur la clé primaire `[scope, eventId]`, **pas** sur la date réelle de saisie `createdAt`. Il pouvait donc envoyer une modification plus récente avant une ancienne ; il pouvait également dépasser un événement `sending` dont le bail n'était pas expiré et envoyer la saisie suivante. Cela produirait des conflits artificiels lors d'une fermeture ou d'une double utilisation d'onglets.

## Correction ciblée V2
- `v2/outbox-idb.js` : `claimNext()` sélectionne, dans une seule transaction IndexedDB `readwrite`, le premier événement **pending/sending** classé par `createdAt` puis `key`, en excluant les opérations définitivement conservées `conflict` ou `blocked`.
- Si ce premier événement est `sending` avec bail encore actif, la file **attend** plutôt que d'envoyer une opération suivante. À l'expiration, le premier événement est repris avec son ID initial ; l'acquittement tardif de l'ancien bail n'efface rien.
- La reprise automatique après délai, développée en MAJ80, gère cet état sans effacer les brouillons ni déclencher un envoi depuis un compte passé en lecture seule. Aucun nouveau schéma IndexedDB, aucune migration, aucun changement des règles Firebase.

## Tests ciblés
- `tests/v2-outbox-idb-browser.cjs` : Chrome/Chromium et Safari/WebKit contrôlent l'ordre d'insertion **inverse de l'ordre alphabétique des IDs**, le blocage de la deuxième opération tant que le premier bail est valide, la reprise du premier après expiration, la protection des accusés de réception tardifs, puis l'envoi du second.
- `tests/v2-mobile-demo-e2e.cjs` : deux smartphones émulés + Firebase Auth et RTDB émulés ; une salle fictive contient deux opérations, l'une en bail `sending` au moment de la fermeture. Vérifier que le second score n'est pas enregistré pendant le bail, puis que les deux scores sont appliqués une fois chacun, dans l'ordre (`version=2`).
- Tous les scénarios inchangés MAJ75–MAJ80 restent acquis sans intervention utilisateur. Vérifier les workflows déclenchés et publier la V2 isolée.

## Garde-fous
- Application officielle V1.1 `MILFT37/milft-tournois`, championnats, scores et archives Drive **intouchés**.
- Règles RTDB réelles, compte Google, données du club et forfait Firebase Spark inchangés. Tests automatisés uniquement sur émulateurs et données fictives.
- Le test réel sur deux appareils/identités différents demeure à faire ultérieurement ; ne pas le confondre avec la simulation E2E.
