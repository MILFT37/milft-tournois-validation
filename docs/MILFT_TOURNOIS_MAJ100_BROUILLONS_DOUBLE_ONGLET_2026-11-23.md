# MILFT Tournois V2 — MAJ100 — Verrou de sauvegarde des brouillons entre onglets

**23 novembre 2026 — GO permanent utilisateur.** Reprise MAJ99 clôturée `f057bc411cbe266445f117009da068329a82a5f2`.

## Objectif
Empêcher un ancien onglet du même appareil de **remplacer le brouillon sauvegardé par un autre onglet avant l'envoi**. Ne pas restaurer automatiquement le brouillon d'un autre onglet si la saisie locale est encore affichée. Les conflits doivent être visibles et non destructeurs.

## Travaux
- Premier commit `8906a27b220d0a8a88e0ec7ab38473c5ea0984dd`.
- `v2/draft-multimatch-emulator.mjs` : sauvegarde de brouillon sous verrou **Web Locks** exclusif par salle, UID, appareil, match ; comparaison du jeton attendu avant écriture. Si le jeton a changé, la tentative renvoie `stale` et n'écrit rien. Sans Web Locks, échec fermé (aucun écrasement silencieux).
- `v2/mobile-multimatch-emulator.mjs` : une file de traitement par onglet consolide les frappes successives ; le brouillon est déclaré non sauvegardé tant que la confirmation n'est pas reçue. Si une version concurrente existe, le brouillon local reste à l'écran, l'envoi et le changement de match restent bloqués. Le bouton de récupération permet de **choisir explicitement** de charger la dernière copie persistante.
- L'envoi doit verrouiller le contrôle du jeton + l'insertion de la commande dans la file IndexedDB pour éviter la fenêtre de concurrence du contrôle MAJ99. Aucun passage par Firebase réel.
- Les tests unitaires valident les jetons concurrents, le verrou exclusif, les anciennes confirmations, et le refus en cas de verrou indisponible.
- L'E2E du même appareil (deux onglets PC) tente d'écraser 5–3 par 5–1 depuis un onglet ancien : il doit conserver 5–3 dans le stockage, bloquer le 5–1 et permettre une récupération explicite.

## Tests GitHub Actions
- E2E initial `45169959535` — **FAILURE** : l’ancien test ne traitait pas l'avertissement dû à la suppression du brouillon par l'onglet qui venait de confirmer son score. Correction **du scénario**, commit `06ee2951` : rechargement explicite avant navigation.\n- E2E final Firebase Auth + RTDB Emulator `45170209298` — **SUCCESS**.
- Simulation partage V2 `45169959574` — **SUCCESS**.
- Pas de répétition des tests V1.1 inchangés. Tous les contrôles ciblés sont réussis après correction.

## Protections
- Aucune mise à jour des règles Firebase réelles ou candidates, aucun déploiement GitHub Pages, aucune modification V1.1, tournoi/championnat/donnée réelle ni archive Drive.
- Firebase Spark gratuit, pas d'intervention du Samsung.
- Test physique à deux appareils et deux comptes Google distincts toujours ultérieur.

## Clôture MAJ100 — 23 novembre 2026
**MAJ100 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**
- Développement initial `8906a27b`, test E2E ajusté `06ee2951`.
- **GitHub Actions E2E `45170209298` : SUCCESS.** Le test couvre l'écriture refusée d'un ancien onglet, les valeurs conservées, le rechargement explicite après conflit, l'envoi unique du score récent, le partage et les permissions.
- **Simulation du partage V2 `45169959574` : SUCCESS.**
- Les règles Firebase réelles et candidates, les fichiers V1.1, les données et archives Drive n'ont pas été modifiés.
- Les tests physiques à deux appareils et deux comptes Google distincts restent à faire ultérieurement.
- **Prochaine étape MAJ101 :** vérifier les pertes de visibilité, la reprise multi-onglets et la cohérence d'un brouillon après retour d'arrière-plan sans restaurer ni effacer automatiquement.
- **Action utilisateur : aucune.**
