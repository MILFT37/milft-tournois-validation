# MILFT Tournois — MAJ73 — Partage simplifié Android ↔ Android

**20 novembre 2026 — avancement V2 isolé, après MAJ72 validée.**

## Référence et autorisation
Reprise de `docs/MILFT_TOURNOIS_MAJ72_DEUX_ANDROID_E2E_2026-11-20.md`.
Le parcours E2E Firebase Auth/RTDB (émulateurs) de deux Android est déjà **SUCCESS** au run GitHub Actions `44755259448`. Ne pas relancer ce test sur une version inchangée. Le GO couvre uniquement le prototype de partage fictif.

## Modifications MAJ73
Commit `41d7a543c57bcea84d0361a122828a972240a1b9` dans `MILFT37/milft-tournois-validation` :
- `v2/mobile-demo.html` : bouton pour copier son identifiant utilisateur Firebase, boutons pour copier le code du match fictif et le lien d'accès.
- `v2/mobile-demo.mjs` : lien avec `?essai=trial...`; code de salle prérempli à l'ouverture sur le deuxième Android. Le code URL est strictement filtré et ne dispense jamais d'autorisation par le propriétaire. Repli manuel de sélection de texte si le presse-papiers est indisponible.
- `tests/v2-mobile-demo-browser.cjs` : boutons inactifs tant que l'utilisateur n'est pas connecté et qu'aucun essai n'existe ; Firebase reste entièrement inactif sans configuration.
- `tests/v2-mobile-demo-e2e.cjs` : test complet du bouton copier UID, copier code, copier lien, ouverture du lien sur le deuxième navigateur, préremplissage du code, maintien du refus d'accès avant invitation, puis scénario E2E complet des scores / hors-ligne / conflits.

## Tests de la MAJ73
- Simulation métier V2 `44775844991` : **SUCCESS**.
- Navigateur Chromium Android / WebKit `44775845347` : **à confirmer**.
- E2E Firebase Auth + RTDB émulateurs `44775845020` : **à confirmer**.
- GitHub Pages validation `44775845079` : **à confirmer**.

## Protection et limites
- La V1.1 officielle `MILFT37/milft-tournois` reste à la MAJ67, commit `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c`. Aucun changement de code de production, aucune migration de joueurs, scores, championnats, tables ni archives Drive.
- La page V2 reste https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html et `v2/firebase-config.mjs` demeure **null**. Les tests Firebase sont uniquement émulés. **Pas encore de partage réel entre appareils physiques.**
- Le plugin Firebase a déjà été proposé aujourd'hui dans ChatGPT et demeure non installé ; attendre l'installation autorisée par l'utilisateur, ne pas le suggérer à nouveau.
- Ne pas exposer de secrets ni activer de forfait payant ; Spark seulement et tests réels sur un match fictif avant tout raccordement de tournois existants.

## À faire ensuite
Confirmer les trois workflows de la MAJ73, corriger uniquement les échecs éventuels, puis préparer l'activation sécurisée d'un projet Firebase Spark neuf (Auth Google, domaine `milft37.github.io`, RTDB et règles MAJ71) via l'intégration Firebase si installée. Sans installation ni accès direct Firebase, ne pas feindre une connexion réelle ni demander de manipulation supplémentaire inutile sur Android.
