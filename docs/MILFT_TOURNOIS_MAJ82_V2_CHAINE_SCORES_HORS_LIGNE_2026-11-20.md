# MILFT Tournois V2 — MAJ82 — Chaînage des scores hors connexion et protection des conflits

**20 novembre 2026 — GO utilisateur.** Référence validée : `docs/MILFT_TOURNOIS_MAJ81_V2_ORDRE_FILE_ET_BAUX_2026-11-20.md`.

## Défaut métier ciblé
La MAJ81 garantit l'ordre FIFO des événements déjà créés, mais une double saisie réelle
sur le même match pendant une coupure Internet reprend deux fois la version distante
inchangée (`expectedVersion=0`). Au retour du réseau, le premier score devient la
version 1 et le second serait refusé comme conflit bien qu'il provienne du même appareil.

Pire, une simple incrémentation sans dépendance permettrait au deuxième score de
passer si une vraie modification d'un autre appareil avait déjà incrémenté le match.
Il ne faut jamais écraser ce score concurrent.

## MAJ82 — correction limitée au prototype
- `v2/outbox-idb.js` : nouveau mode explicite `chainLocalScore` lors de
  `enqueue()`, **atomique dans la transaction IndexedDB**. Les saisies locales
  successives sur un même match reçoivent des versions successives, quel que soit
  l'ordre alphabétique des IDs, avec dépendance `dependsOn` vers leur prédécesseur.
- `claimNext()` ne peut libérer un score dépendant qu'après l'enregistrement du
  reçu `applied` ou `duplicate` du prédécesseur. Si celui-ci est en `conflict`
  ou `blocked`, le suivant reste `pending` sans écraser le score distant.
- Empreinte de la demande originale `inputFingerprint` conservée pour rendre
  le rejeu d'une même saisie idempotent, même lorsque la version locale est ajustée.
- `v2/mobile-demo.mjs` active ce mode pour les envois UI de score uniquement.
  Tous les anciens appels `enqueue()` restent inchangés. Pas de migration ni de
  lecture des données officielles.
- Réutilisation des transactions/reçus IndexedDB existants ; pas de nouveau chemin
  Firebase, de règle ni d'option payante.

## Contrôles ciblés
- Chromium et Safari/WebKit : deux scores hors ligne 2–1 puis 4–2, versions 0 puis
  1, dépendance persistante, absence de doublon, confirmation séquentielle.
  Si la première saisie est en conflit : la seconde ne part pas, et les deux
  entrées demeurent après rechargement.
- E2E Firebase Auth/Realtime Database **émulés** : deux saisies successives réelles
  depuis la page Android simulée sans réseau, reconnexion, score final 4–2,
  version distante 2, file vidée sans conflit artificiel.
- Vérifier les workflows GitHub Actions concernés, la publication GitHub Pages,
  les empreintes exactes des fichiers V2 servis publiquement.
- Tous les acquis MAJ75–MAJ81 sont conservés, sans relancer les tests déjà validés
  sur code inchangé.

## Frontières non négociables
- Dépôt officiel de production `MILFT37/milft-tournois`, V1.1,
  championnats et archives Drive **intouchés**.
- Projet Firebase Spark gratuit, règles de sécurité publiées, données réelles et
  comptes Google **intouchés** ; tests automatiques sur émulateurs uniquement.
- La preuve Samsung MAJ75 (Google Auth, salle fictive et score 5–3)
  est acquise. Le test réel à deux appareils et deux comptes distincts
  est reporté jusqu'à disponibilité d'un autre Android ou d'un PC.
- Aucun geste demandé sur le Samsung pour cette MAJ.

## Statut de clôture
**Développement engagé.** Ajouter ici les commits, les numéros de workflows,
leur verdict et la validation de publication avant de déclarer MAJ82 close.
