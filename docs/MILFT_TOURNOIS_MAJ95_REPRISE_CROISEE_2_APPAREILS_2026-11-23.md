# MILFT Tournois V2 — MAJ95 — Reprise croisée Samsung et PC sur deux matchs

**23 novembre 2026 — GO utilisateur.** Reprise après la MAJ94 validée sur émulateurs : `docs/MILFT_TOURNOIS_MAJ94_INTERFACE_MULTIMATCH_EMULATEUR_2026-11-23.md`.

## Objectif
Tester les pannes réseau dans **les deux sens**, sans appareil maître ni verrou global : Samsung principalement chargé des saisies, PC à la table de marque également autorisé. Les scores non synchronisés restent conservés sur l'appareil qui les a saisis ; l'autre appareil continue avec ses dernières données confirmées.

## Scénarios ajoutés au test E2E existant (sans nouveau code applicatif)
- Le parcours MAJ94 conserve la panne réseau du PC sur `demo`, le conflit local 7–4 contre le score distant 8–5, et la possibilité de continuer à saisir `courtB`.
- **Panne inverse :** le Samsung saisit 8–7 sur `courtB` hors ligne, tandis que le PC connecté inscrit 4–3 sur `demo`. À la reconnexion, `courtB` et `demo` avancent indépendamment jusqu'à la version 3, et les deux appareils voient les résultats.
- **Convergence sans doublon :** le Samsung saisit 5–5 hors connexion sur `demo`, puis le PC confirme 5–5. Au retour du Samsung, la commande locale doit être acquittée sans deuxième écriture : `demo` reste version 4 et l'auteur distant reste le PC.
- Maintien des contrôles de lecture seule, rétablissement des droits, révocation et absence d'erreurs du navigateur.

## Sécurité et périmètre
Le test tourne **exclusivement** dans deux navigateurs simulés avec Firebase Auth et Realtime Database Emulator, sur les règles candidates MAJ93. Le code applicatif et les règles Firebase sont inchangés ; aucun fichier du site public n'est modifié, aucune campagne V1.1 n'est relancée. Pas de publication Firebase réel, pas de connexion aux comptes réels, pas d'archives Drive touchées. Forfait Spark gratuit inchangé.

Le test **physique** Samsung/PC avec deux comptes Google distincts reste à effectuer ultérieurement.

**Action utilisateur : aucune.**

## Clôture
**MAJ95 VALIDÉE SUR ÉMULATEURS — 23 novembre 2026. Pas de déploiement Firebase réel.**

- Commit du test étendu et de la feuille de route : `993307c43dbddcf8fc9c6876f950bca41ca0f818`.
- Workflow **V2.0 — MAJ94 interface multi-match sur émulateurs isolés**, exécution GitHub Actions `45156762148` : **SUCCESS**.
- Parcours MAJ94 conservé : deux identités et deux matchs simultanés, PC hors connexion, conflit sur `demo`, maintien des écritures sur `courtB`, contrôle des rôles et révocation.
- Parcours MAJ95 ajouté et validé : **Samsung hors connexion sur `courtB`**, PC toujours actif sur `demo`, puis reconnexion. Résultats confirmés `courtB=8–7` et `demo=4–3`, versions indépendantes toutes deux à 3.
- **Convergence même résultat** : Samsung prépare `demo=5–5` hors connexion, PC confirme `5–5`. À la reconnexion, brouillon Samsung acquitté sans doublon, version de `demo` restant à 4 et auteur PC conservé. `courtB` demeure inchangé.
- Modifications limitées au **test E2E** et à cette feuille de route. Interface publique, règles Firebase réelles/candidates, IndexedDB, production V1.1, championnats et archives Google Drive **inchangés**. Tests antérieurs sur fichiers inchangés non répétés manuellement.
- Le vrai essai inter-appareils sur deux appareils physiques et deux comptes Google distincts **reste à effectuer** ; il n'est pas remplacé par la simulation.
- **Aucune action Samsung nécessaire maintenant.** Firebase Spark gratuit maintenu.
- **Reprise MAJ96 :** analyser plus profondément les cas de rechargement navigateur, brouillons distincts par match et éventuel acquittement tardif, toujours sous émulateurs, avant toute demande séparée d'autorisation pour publier de nouvelles règles sur Firebase réel.

## Rectificatif sportif — 23 novembre 2026

- L'utilisateur a signalé à juste titre qu'un résultat **9–7 n'est pas possible**. Les valeurs fictives 9–7 et 9–4 ont été remplacées dans les tests par 8–7 et 7–4.
- La **page multi-match exclusivement émulée** refuse désormais avant mise en file un score dépassant 8, ainsi que 8–8. La règle **candidate exclusivement émulée** interdit aussi ces valeurs en écriture directe. Le test E2E vérifie le rejet côté interface ; le test de sécurité vérifie le refus de 9–7 et 8–8, et l'acceptation de 8–7.
- Ce plafond est une garde commune, **pas encore une validation complète du format sportif** : manche à 5, partie en 7 ou 8, ou belle avec 2 buts d'écart (maximum 8–7) devront être contrôlées selon le format configuré. Le prototype actuel ne décrit pas encore ces formats par match.
- Les **règles Firebase réellement publiées**, le démonstrateur public, la V1.1 officielle, les championnats et les archives Drive restent intouchés.

**Résultat des tests après rectification : en attente de GitHub Actions.**
