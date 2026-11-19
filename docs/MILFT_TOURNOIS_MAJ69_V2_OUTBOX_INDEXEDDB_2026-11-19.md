# MILFT Tournois — MAJ 69 — File persistante IndexedDB V2 isolée

**19 novembre 2026.** Continuation autonome après la MAJ 68. **La V1.1 officielle et les archives Drive restent inchangées.**

## Objectif
Créer une file locale **réellement persistante après fermeture du navigateur** pour préparer l'édition multi-appareils V2.0, sans prétendre qu'un backend ou une synchronisation réelle existent déjà.

## Fichiers et commits
- `v2/outbox-idb.js` : création initiale commit `6a6c6f76d5048e363d8efe3bcf0a0336ede77d64`.
- `v2/outbox-test.html`, `tests/v2-outbox-idb-browser.cjs`, `.github/workflows/v2-outbox-idb.yml` : commit `f454786f1a4d0a47bbbc9672643cb7aa7a98d1c2`.
- Workflow « V2.0 — file IndexedDB persistante (isolée) », run `44563496760` : **SUCCESS (Chromium et WebKit, fermeture/réouverture complète du navigateur)**.
- Workflow préexistant « V2.0 — simulation partage appareils (isolée) », run `44563496794` : **SUCCESS**.

## Propriétés de la file
1. Base `MILFT_V2_ISOLATED_OUTBOX_20261119` et magasins `commands`/`receipts`, sans aucune clé V1.1 utilisée par le module.
2. Isolation des commandes par tournoi, auteur et appareil ; identifiants d'événement vérifiés et collisions refusées, sans suppression silencieuse.
3. Enregistrement IndexedDB atomique, états `pending`, `sending`, `conflict`, `blocked`.
4. Bail transactionnel de prise en charge pour empêcher deux onglets de traiter la même commande au même moment ; récupération possible après expiration, vérification du jeton de bail pour rejeter un acquittement dépassé.
5. Suppression de la commande **seulement après `applied` ou `duplicate` déclaré par l'appelant et inscription transactionnelle d'un reçu persistant**. Une véritable vérification du serveur reste à implémenter.
6. Une erreur réseau simulée rétablit `pending` ; un conflit conserve le brouillon ; un refus d'autorisation conserve l'entrée `blocked`.
7. Aucune transmission réseau programmée ni import/restauration de données de production.

## Vérifications prévues par le workflow dédié
- Chromium et WebKit en mode mobile, navigateur réellement fermé puis réouvert avec le même profil.
- Deux onglets concurrents, isolation entre tournois, bail expiré, rejet d'accusé ancien.
- Conservation du conflit, reçu persistant et absence d'écriture sur une clé V1.1 fictive.
- Routes réseau HTTP locales exclusivement ; aucune API Google Drive ni Firebase.

## Limites et prochaine reprise
Ce jalon ne constitue **pas** une synchronisation effective entre deux appareils : absence de Firebase, d'authentification serveur, de règles de sécurité RTDB, et de pilote de transport réseau. Même lorsqu'une file est persistante, les données peuvent être perdues si l'utilisateur efface les données du site ; la résilience complète doit être définie avant V2.0. En particulier, une simple réponse fournie par le navigateur ne doit jamais servir de preuve d'écriture distante sans validation serveur.
**Verdict final :** tous les tests du workflow `44563496760` ont réussi. **Prochain travail :** poursuivre la validation des règles de sécurité et la connexion du moteur métier V1.1 aux commandes atomiques, toujours en simulation.
**Aucun nouveau GO requis pour les travaux V2 purement isolés ; un GO explicite sera indispensable avant activation en production ou migration de données.**
