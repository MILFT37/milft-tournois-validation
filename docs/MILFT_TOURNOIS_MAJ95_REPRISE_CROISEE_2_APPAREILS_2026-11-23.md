# MILFT Tournois V2 — MAJ95 — Reprise croisée Samsung et PC sur deux matchs

**23 novembre 2026 — GO utilisateur.** Reprise après la MAJ94 validée sur émulateurs : `docs/MILFT_TOURNOIS_MAJ94_INTERFACE_MULTIMATCH_EMULATEUR_2026-11-23.md`.

## Objectif
Tester les pannes réseau dans **les deux sens**, sans appareil maître ni verrou global : Samsung principalement chargé des saisies, PC à la table de marque également autorisé. Les scores non synchronisés restent conservés sur l'appareil qui les a saisis ; l'autre appareil continue avec ses dernières données confirmées.

## Scénarios ajoutés au test E2E existant (sans nouveau code applicatif)
- Le parcours MAJ94 conserve la panne réseau du PC sur `demo`, le conflit local 9–4 contre le score distant 8–5, et la possibilité de continuer à saisir `courtB`.
- **Panne inverse :** le Samsung saisit 9–7 sur `courtB` hors ligne, tandis que le PC connecté inscrit 4–3 sur `demo`. À la reconnexion, `courtB` et `demo` avancent indépendamment jusqu'à la version 3, et les deux appareils voient les résultats.
- **Convergence sans doublon :** le Samsung saisit 5–5 hors connexion sur `demo`, puis le PC confirme 5–5. Au retour du Samsung, la commande locale doit être acquittée sans deuxième écriture : `demo` reste version 4 et l'auteur distant reste le PC.
- Maintien des contrôles de lecture seule, rétablissement des droits, révocation et absence d'erreurs du navigateur.

## Sécurité et périmètre
Le test tourne **exclusivement** dans deux navigateurs simulés avec Firebase Auth et Realtime Database Emulator, sur les règles candidates MAJ93. Le code applicatif et les règles Firebase sont inchangés ; aucun fichier du site public n'est modifié, aucune campagne V1.1 n'est relancée. Pas de publication Firebase réel, pas de connexion aux comptes réels, pas d'archives Drive touchées. Forfait Spark gratuit inchangé.

Le test **physique** Samsung/PC avec deux comptes Google distincts reste à effectuer ultérieurement.

**Action utilisateur : aucune.**

## Clôture
**En cours — attendre la vérification GitHub Actions MAJ94 déclenchée par la modification du test E2E.**
