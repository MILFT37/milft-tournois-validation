# MILFT Tournois V2 — MAJ87 — Reprise au retour sur l'application Android

**22 novembre 2026 — GO utilisateur.** Reprise depuis la clôture MAJ86 : `docs/MILFT_TOURNOIS_MAJ86_V2_FILE_LOTS_AUTOMATIQUES_2026-11-21.md`.

## Risque ciblé
Lorsque Chrome ou un autre navigateur mobile met la page d'un tournoi en
arrière-plan, les temporisations JavaScript peuvent être retardées et
certains événements réseau peuvent être manqués. Si une opération était
encore `pending` et qu'aucun nouvel événement `online` n'était émis,
la file risquait de ne pas repartir en revenant sur la page.

## Correctif V2 isolé
- `v2/mobile-demo.mjs` détecte le retour à un document visible
  (`visibilitychange`) et une restauration de page (`pageshow`).
- Relit uniquement la file IndexedDB de la salle/UID/appareil actifs :
  si la tête est éligible, demande la reprise automatique ; sinon,
  reprogramme la temporisation existante **sans anticiper les baux actifs
  ou `retryAt`**. Aucun envoi en mode lecture seule, hors connexion,
  depuis une page masquée ou après un changement de salle/compte.
- Conserve la réservation atomique `claimNext`, les reçus idempotents,
  le traitement par lots de MAJ86 et les protections de conflit de MAJ83–85.
- Aucun changement des règles Firebase, données réelles, comptes Google,
  schéma IndexedDB ou quotas Spark ; aucune nouvelle permission.

## Tests ciblés
- `tests/v2-mobile-demo-e2e.cjs` : émulateurs Auth et RTDB seulement,
  deux Android simulés. Une entrée `pending` sans déclencheur réseau
  redémarre au signal de visibilité ; score 5–3 transmis exactement une fois.
- Deuxième scénario : une opération préalablement refusée temporairement
  et dotée d'un délai `retryAt` ne part pas pendant les premiers
  450 ms malgré deux signaux de retour au premier plan ; elle repart
  après son échéance avec **le même ID**, score final 6–4, version 1,
  sans doublon ni effacement de brouillons.
- GitHub Actions : simulation, navigateur Chromium/WebKit, E2E Android/
  Firebase emulé et déploiement GitHub Pages contrôlé par empreintes.
  Réutiliser les validations IndexedDB/règles de sécurité précédentes
  puisque ces fichiers restent inchangés.

## Limites maintenues
- Production officielle V1.1 `MILFT37/milft-tournois`,
  championnats, données des tournois et archives Google Drive intouchés.
- Firebase Spark **gratuit**, règles de sécurité et essais fictifs sous
  `v2Trials` inchangés. Aucun essai sur les données officielles.
- Test Samsung initial (Google, salle fictive, score 5–3) acquis.
  Test sur deux appareils physiques avec **deux comptes Google distincts**
  toujours en attente, sans bloquer ce travail.
- **Aucune manipulation demandée à l'utilisateur sur Samsung.**

## Clôture
**MAJ87 VALIDÉE et publiée — 22 novembre 2026.**

- Commit du développement V2 et des tests : `4cbb653c32233f6e8213d42e5e7525f9ca8dcf65`. Uniquement `v2/mobile-demo.mjs`, son test E2E émulé et ce document.
- **Simulation partage V2** : GitHub Actions `45008066643` — **SUCCESS**.
- **Interface Chromium et Safari/WebKit** : `45008066668` — **SUCCESS**.
- **Deux Android simulés + Firebase Auth/RTDB émulateurs**, avec reprise d'un score 5–3 au retour au premier plan puis score 6–4 après respect du délai de reprise : `45008066625` — **SUCCESS**.
- **Déploiement GitHub Pages et contrôle des empreintes des fichiers publics** : `45008066589` — **SUCCESS**. Prototype V2 publié séparément.
- **IndexedDB et règles Firebase inchangés** : tests correspondants déjà acquis (MAJ84/86), aucune répétition inutile. Aucun test utilisant Firebase réel dans la CI.
- V1.1 officielle, données locales, tournois, championnat annuel, archives Google Drive, règles de sécurité Firebase et plan Spark gratuit **inchangés**.
- **Aucune action requise sur Samsung**. Le test physique entre deux appareils et deux comptes Google distincts demeure à effectuer lorsqu'un deuxième appareil sera disponible.
- **Prochaine reprise : MAJ88** depuis cette clôture, sans intégration prématurée du partage V2 dans l'application officielle ni reprise des tests validés sur du code inchangé.
