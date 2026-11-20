# MILFT Tournois V2 — MAJ84 — Reprise après erreur réseau temporaire

**21 novembre 2026 — GO utilisateur**. Reprise sur MAJ83 validée : `docs/MILFT_TOURNOIS_MAJ83_V2_CONFLITS_DEPENDANCES_2026-11-21.md`.

## Défaut traité
Un score dont l'envoi échouait temporairement pendant que le navigateur restait
« en ligne » retournait à l'état `pending`. Sans événement `online` ultérieur
ni clic sur « Renvoyer », il pouvait attendre indéfiniment. À l'inverse, une
relance immédiate permanente risquerait une boucle de requêtes coûteuse.

## Correction V2 isolée
- `v2/outbox-idb.js` : champ **optionnel** `retryAt` sur les commandes, fixé
  seulement pour `temporary-error`, dans la transaction IndexedDB de fin de
  tentative. Aucune migration ni suppression d'entrée.
- `claimNext` attend l'échéance de la tête de file, ce qui préserve le FIFO ;
  un clic explicite peut ignorer **ce délai uniquement**, jamais un bail
  `sending` actif ou une dépendance non confirmée.
- `v2/mobile-demo.mjs` : temporisation croissante bornée 2, 4, 8, 16, 32,
  puis 60 secondes maximum. Programmation d'une reprise automatique, conservée
  au rechargement ; annulation au changement de compte/salle, hors connexion
  ou en lecture seule. Message de reprise près de la file.
- Aucun changement des paramètres de sécurité Firebase, du forfait Spark,
  des règles RTDB ou de l'architecture des tournois officiels.

## Tests ciblés
- Chromium et WebKit : vérification d'un délai `retryAt` conservé à la
  fermeture, sans fuite de la commande suivante ; redémarrage, reprise du
  même ID, accusés de réception sans doublons, clic manuel possible.
- E2E Auth/Realtime Database **émulés** : injection d'une erreur temporaire
  dans le SDK de test, vérification du brouillon `pending`, fermeture du
  navigateur, réouverture, reprise automatique et score final 9–7 à version 1
  sans seconde saisie ni interaction manuelle.
- Exécutions GitHub Actions du code concerné, publication et contrôle des
  empreintes de fichiers publics ; éviter de réexécuter les validations
  inchangées MAJ75–83 à la main.

## Périmètre protégé
- Production officielle `MILFT37/milft-tournois`, V1.1, championnats,
  scores réels, données locales et archives Google Drive **intouchés**.
- Firebase réel : Auth Google, règles, données et plan Spark **inchangés**.
- Tests Samsung validés MAJ75 : connexion, salle fictive, score 5–3 ;
  le vrai test avec deux appareils/comptes Google distincts reste à faire.
- Aucun geste demandé sur le Samsung pour la MAJ84.

## Clôture
**En cours** : noter les SHA, les workflows réussis et la publication avant
de déclarer cette MAJ validée.
