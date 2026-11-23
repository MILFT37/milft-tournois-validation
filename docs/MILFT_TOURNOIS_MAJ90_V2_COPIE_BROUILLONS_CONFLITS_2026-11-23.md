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
**MAJ90 VALIDÉE et publiée — 23 novembre 2026.**

- Commit du correctif et tests : `b2920be8d670797f39c3564df6ea54459df02a7c`.
- **Simulation partage V2** : GitHub Actions `45139629105` — **SUCCESS**.
- **Interface Chromium et Safari/WebKit** : `45139629008` — **SUCCESS**.
- **Deux Android simulés, Auth et Realtime Database émulés** : `45139628951` — **SUCCESS**. Vérifications du relevé copiable d'un score concurrent 6–4 contre 7–5, des deux brouillons 2–1 et 4–2 après rechargement, du champ de secours sans presse-papiers et de l'effacement de l'ancien relevé après changement de salle/révocation.
- **Déploiement GitHub Pages et contrôles des fichiers publics** : `45139629026` — **SUCCESS** ; prototype V2 publié séparément de l'application officielle.
- **Aucune modification des bases réelles ni de la production V1.1**, ni des championnats, archives Drive, règles Firebase ou forfait Spark. IndexedDB inchangé et validations précédentes conservées.
- **Aucune action Samsung nécessaire**. Test sur deux appareils physiques avec deux comptes Google distincts non encore effectué.
- **Prochaine reprise : MAJ91**, depuis cette feuille de route, sans refaire les tests acquis sur code inchangé.
