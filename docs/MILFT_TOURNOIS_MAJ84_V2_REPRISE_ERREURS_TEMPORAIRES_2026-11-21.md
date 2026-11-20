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
**MAJ84 VALIDÉE et publiée — 21 novembre 2026.**

- Commit du module, des tests et de cette feuille de route : `4e9ba7cfb2a5db82b55d6ad21047ae05ec106423`. Aucun fichier de production officielle ni aucune règle Firebase modifiés.
- **Simulation partage V2** `44836351856` : **SUCCESS**.
- **Interface mobile Chromium et WebKit** `44836352585` : **SUCCESS**.
- **IndexedDB Chromium et WebKit**, délais de reprise persistants, verrou FIFO, reprise du même ID et relance manuelle sûre, `44836351818` : **SUCCESS**.
- **GitHub Pages et vérification des octets publics** `44836352056` : **SUCCESS**. Prototype V2 publié isolément.
- Premier E2E `44836351866` : **FAILURE du code de test**, lié à la valeur de retour de `withSecurityRulesDisabled` (non transmise). Le test avait déjà observé la reprise du score 9–7 ; la lecture de contrôle finale utilisait une valeur indéfinie. Correction du test uniquement : commit `a8b0aa6db5596cf48001c7466008a0e027da6bc7`.
- **E2E deux Android simulés, Firebase Auth + RTDB émulés**, erreur réseau injectée, fermeture de page et reprise autonome du score fictif 9–7 à version distante 1 : `44836600249` **SUCCESS**.
- Les parcours MAJ75–MAJ83 restent acquis, sans répétition manuelle sur des fichiers inchangés.
- Production `MILFT37/milft-tournois`, V1.1, championnats, scores et archives Google Drive inchangés ; règles Firebase réelles et forfait Spark gratuit inchangés.
- **Aucune action sur Samsung.** Test sur deux appareils physiques et deux comptes Google distincts toujours à effectuer ultérieurement.
- Prochaine reprise : **MAJ85** depuis ce document, sans recommencer les validations acquises.
