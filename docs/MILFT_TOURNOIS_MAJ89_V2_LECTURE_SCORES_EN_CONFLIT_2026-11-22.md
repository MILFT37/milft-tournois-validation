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
**MAJ89 VALIDÉE et publiée — 22 novembre 2026.**

- Commit applicatif, présentation, E2E et feuille de route : `4bb0ae0f85cbde2b4a18afc49436ca71aebee418`.
- **Simulation du partage V2** : workflow `45014938220` — **SUCCESS**.
- **Interface Chromium et Safari/WebKit** : `45014938303` — **SUCCESS**.
- **E2E deux Android simulés, Auth et Firebase Realtime Database émulés** : `45014938203` — **SUCCESS**. Le score concurrent 6–4 reste lisible après refus ; les brouillons 2–1 et 4–2 gardent leurs versions distinctes, et restent consultables après rechargement ; le score distant accepté 7–6 n'est pas modifié par cette consultation.
- **GitHub Pages + vérification des fichiers publics** : `45014938216` — **SUCCESS**. La démonstration V2 est publiée isolément.
- Code IndexedDB et règles Firebase inchangés : acquis MAJ75–88 conservés, sans relancer les validations des fichiers identiques.
- **Production V1.1 officielle, données réelles, championnats et archives Google Drive préservés**. Aucun changement des règles de sécurité Firebase ni du forfait Spark gratuit.
- **Aucune action nécessaire sur Samsung**. Test entre deux appareils physiques avec deux comptes Google différents toujours non effectué.
- **Prochaine reprise : MAJ90**, à partir de ce document sans refaire les tests validés sur une version inchangée et sans intégrer V2 prématurément à l'application officielle.
