# MILFT Tournois V2 — MAJ90 — Copie des brouillons en conflit

**23 novembre 2026 — GO utilisateur.** Reprise après MAJ89 validée, fichier : `docs/MILFT_TOURNOIS_MAJ89_V2_LECTURE_SCORES_EN_CONFLIT_2026-11-22.md`.

## Besoin
La MAJ89 affiche les scores locaux refusés mais leur récupération sur un Samsung
reste laborieuse pour comparer les saisies au score distant et procéder à un arbitrage.

## Évolution isolée
- Bouton « Copier les brouillons en conflit » actif uniquement si une salle
  autorisée est ouverte et contient un brouillon `conflict` ou `blocked`.
- Le relevé contient le code de salle fictive, le score et la version distante
  affichés, les scores locaux, manches, versions de départ, IDs et motifs.
  **Aucun UID Google, identifiant appareil ou clé Firebase exporté.**
- Action **uniquement sur clic explicite**, sans écriture vers Firebase
  ou vers IndexedDB. Si le presse-papiers est indisponible, un champ en
  lecture seule permet de copier manuellement le même rapport.
- Changement de salle, déconnexion ou retrait d'autorisation :
  le relevé et les brouillons de l'ancienne salle sont masqués et le champ
  temporaire vidé. L'affichage utilise `textContent`, jamais `innerHTML`.
- Aucun arbitrage, renvoi, suppression ou restauration automatique.

## Tests de non-régression
- E2E Firebase Auth/RTDB **émulés** avec deux Android simulés :
  copie du score refusé 6–4 face au distant 7–5, copie des deux scores
  2–1 et 4–2 après rechargement, fallback sans presse-papiers,
  absence d'ancien relevé après changement de salle ou révocation.
- Tests interface Chromium et Safari/WebKit, simulation de partage,
  publication Pages et vérification des empreintes.
- IndexedDB et règles Firebase inchangés : tests précédents acquis.

## Périmètre immuable
Production officielle `MILFT37/milft-tournois`, V1.1, tournois,
championnats, archives Google Drive intouchés. Firebase Spark gratuit,
règles et données réelles inchangés. Le test physique entre deux
appareils et comptes Google distincts reste à effectuer lorsque possible.
La connexion Samsung et score fictif 5–3 sont déjà validés.

**Action utilisateur : aucune.**

## Clôture
**En cours de tests GitHub Actions et publication** — ajouter les numéros
de runs et le commit de clôture avant d'annoncer validation.
