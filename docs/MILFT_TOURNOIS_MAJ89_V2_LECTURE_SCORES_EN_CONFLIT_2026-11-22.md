# MILFT Tournois V2 — MAJ89 — Lecture des scores locaux en conflit

**22 novembre 2026 — GO utilisateur**. Référence de reprise : `docs/MILFT_TOURNOIS_MAJ88_V2_REPRISE_DROITS_EDITOR_2026-11-22.md`, MAJ88 entièrement validée et publiée.

## Risque métier
Les MAJ82–85 conservent correctement en IndexedDB les brouillons de score refusés
par Firebase, y compris plusieurs scores liés. Pourtant l'interface de l'essai
n'affichait que leur identifiant technique, leur état et un motif : **le score
saisi n'était pas visible**. Cela empêche un responsable de comparer facilement
les valeurs locales au score accepté sur un autre appareil.

## Modification minimale MAJ89
- `v2/mobile-demo.mjs` : chaque `conflict` ou `blocked` est présenté en
  **lecture seule** avec son score local **A : B**, numéro de manche,
  version de départ, ID et motif du refus. S'il ne s'agit pas d'un score,
  afficher le type d'opération. Aucun brouillon n'est modifié, renvoyé ou supprimé.
- Rappel clair : ce sont des **brouillons locaux à vérifier** ; ils ne
  remplacent pas le résultat distant accepté.
- Texte inséré exclusivement via **`textContent`**, sans HTML interprété.
  Présentation séparée des différents brouillons, lisible sur Android,
  Chromium et Safari/WebKit.
- Aucune tentative d'arbitrage automatique ni restauration ; le règlement
  d'un conflit reste une action humaine future explicite.

## Tests ciblés
- E2E deux Android simulés avec **Firebase Auth et RTDB émulés seulement** :
  un score concurrent de B (6–4, version initiale 1) est refusé sans écraser
  le résultat de A (7–5). Son brouillon doit être lisible dans la vue locale.
- Deux scores hors connexion 2–1 puis 4–2 sur le même appareil rencontrent
  une écriture concurrente 6–5 : les deux sont classés en conflit et
  affichés distinctement avec leurs versions 0/1 ; rechargement de la page,
  conservation de l'affichage, aucune réécriture du résultat distant 7–6.
- GitHub Actions pour E2E, interface Chromium/WebKit, simulation et déploiement
  Pages avec contrôle des empreintes. Les validations des composants
  IndexedDB et règles Firebase **inchangés** sont conservées.

## Invariants
- Prototype V2 uniquement, isolé de l'application officielle V1.1.
- Aucune modification des tournois/championnats, de la production
  `MILFT37/milft-tournois` ni des archives Google Drive.
- Firebase Spark gratuit, règles RTDB existantes et données réelles intouchés.
- Test réel sur Samsung (connexion Google, salle fictive, score 5–3)
  toujours acquis. Test sur **deux appareils physiques et deux comptes Google
  distincts** en attente, sans bloquer la fiabilisation.
- **Aucune manipulation demandée sur Samsung.**

## Clôture
**En cours** — ajouter commit, workflows GitHub Actions, verdicts et
confirmation de publication avant de déclarer cette MAJ validée.
