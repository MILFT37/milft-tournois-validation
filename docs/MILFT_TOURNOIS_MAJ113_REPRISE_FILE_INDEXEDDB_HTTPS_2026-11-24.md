# MILFT Tournois V2 — MAJ113 — Transactions et reprise de la file de scores sous HTTPS

**24 novembre 2026.** Reprise après MAJ112 clôturée, commit `3569ea0f0628e25972e85bc12972f7a07427dcd7`.

## Objectif

Tester le **vrai module** `v2/outbox-multimatch-emulator.js` dans un navigateur HTTPS isolé afin de distinguer une commande durablement enregistrée d'une transaction interrompue avant validation.

## Scénario

- Auth/RTDB Emulator inchangés et maintenus sur loopback ; pas de Firebase réel.
- Une commande de match A est enregistrée via l'API réelle `enqueue`; un navigateur indépendant ne peut pas voir sa file locale.
- Une seconde transaction IndexedDB de test est **annulée explicitement avant validation**, cas déterministe d'une écriture interrompue. La commande fantôme ne doit pas exister ensuite. Le test ne prétend pas provoquer un crash machine à une nanoseconde précise pendant une transaction réelle.
- L'onglet A obtient un bail sur une commande durable, puis ferme avant d'avoir confirmé sa livraison. Un autre onglet doit retrouver la commande après expiration du bail, et refuser la confirmation tardive avec ancien jeton.
- Pendant ce bail, le match B continue à être mis en file et confirmé indépendamment.
- Les reçus idempotents survivent au rechargement : une commande déjà confirmée reste `already-confirmed` et n'est jamais retransmise.
- Vérifications Chromium et WebKit, serveur HTTPS uniquement sur `127.0.0.1`, certificat éphémère supprimé, aucune requête externe.

## Restrictions

Ne modifier ni application V1.1, ni règles Firebase réelles/candidates, ni application multi-match, ni données de tournois, championnats et archives Drive. Le test physique avec Samsung et PC, ainsi que deux comptes Google distincts, n'a **pas** été réalisé.

## Validation

Attendre GitHub Actions SUCCESS avant clôture. Aucun déploiement autorisé.

**Action utilisateur : aucune.**
