# MILFT Tournois V1.1 — Plan de bascule et garde-fous (NON EXÉCUTÉ)

Date de préparation : 17 novembre 2026.

## États de référence
- Application métier validée : `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html` ; blob GitHub `53c54113726796ac2edd0189f7c0d5bf51308bf8`, commit candidat figé `b71900eb91a4a5e1b1ff4576d4db341ea86ba176`.
- Dépôt de production : `MILFT37/milft-tournois`, actuellement une page de préparation, tête constatée `3174eb8e707a16f71351f8a124e1da8a7f69e386` avant toute intervention. **Ne pas remplacer sans autorisation explicite distincte.**
- Projet d'événement : 42 joueurs, 5 événements dont 4 actifs, 7 phases internes, 462 rencontres (73 terminées, 13 en cours, 376 en attente) sur la copie V2 du 12/11. Priorités tables 2=A, 3=A, 4=B.
- Original privé : `MILFT-sauvegarde-2026-11-12.json` (SHA-256 `41f4657104336f1e247f81e31b2cbb3c2460b1e747d53471d62469dc417fda93`) à garder intact.
- Copie privée corrigée V2 : `MILFT-sauvegarde-2026-11-12_COPIE_PRIORITES_AB_V2.json` (SHA-256 `b880322b8e4bda2665372215658aeb96842ec725827cafaec771300fa955ed08`). Ne jamais la publier sur GitHub.

## Paquet technique préparé en branche non publiée
Branche : `prep-v1.1-production-isolated-2026-11-17` du dépôt de validation.
- `MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html` : même moteur que la V1.1 validée, sans migration automatique des données.
- `manifest.production.webmanifest` : démarre sur le HTML de production prévu, non sur la validation.
- Ressources nécessaires lors d'une future publication autorisée : `MILFT_Tournois_192.png` et `MILFT_Tournois_512.png`, plus `MILFT_Tournois_1024.png` si reprise intégrale des ressources.
- `tests/release-readiness.cjs` vérifie la stricte équivalence avec la candidate (à l'exception des 5 familles de clés, du titre et du manifeste), la présence du moteur d'import et la cohérence du manifeste et des tailles des icônes.
- `tests/preprod-storage-isolation.cjs` simule l'export-import entre deux pages sous la même origine, vérifie les confirmations, l'archive IndexedDB, le rechargement, et le non-écrasement des clés de validation et anciennes versions.
- Les anciennes clés `milft_iso_20261102_*` ne doivent jamais être utilisées par le paquet final. Nouveaux préfixes dédiés `milft_prod_v11_20261117_*`, IndexedDB `MILFT_PROD_V11_20261117_SECOURS`.

## Préconditions GO / NO-GO
1. **GO technique automatique :** tests GitHub Chrome Windows et WebKit mobiles terminés SUCCESS sur le **paquet final**, sans réexécuter les suites déjà vertes sur HTML inchangé.
2. **GO physique :** Samsung / Chrome Android déjà VERT (copie V2 sur profil isolé, MAJ43). Chrome **Windows 11 sur PC réel** et Safari **iPhone physique** restent à attester ou à faire l'objet d'une décision explicite de report/acceptation du risque.
3. **GO données :** avant le 19/11 et surtout avant toute nouvelle séance, exporter une sauvegarde **fraîche du navigateur habituellement utilisé**, la conserver en dehors du navigateur, comparer sa date et ses résultats à la V2 et corriger les éventuels nouveaux conflits **sur copie uniquement**. Le 12/11 est la dernière référence connue, mais une nouvelle partie peut changer ce constat.
4. **GO publication :** demander un accord **spécifique à la mise en production**. Le « GO » technique pour poursuivre les tests n'autorise ni publication ni restauration du profil habituel.
5. **GO intégrité :** relever les SHA GitHub du paquet final, archiver l'ancien HEAD de production et vérifier la publication Pages et les ressources PWA après bascule. L'installation sur écran d'accueil et le fonctionnement hors ligne ne sont pas certifiés ; aucun service worker n'est présent.

## Procédure de bascule **après** les autorisations
1. Relever le commit HEAD de `MILFT37/milft-tournois` et conserver la page de préparation/les anciens HTML. Ne pas supprimer les anciennes données du site.
2. Déposer uniquement le HTML de production, son manifeste, les icônes et un index pointant explicitement sur le nouveau HTML, avec des noms et ressources cohérents. Ne pas publier les sauvegardes JSON privées.
3. Contrôler la publication Pages, l'URL, le démarrage PWA et les accès HTTPS depuis navigateur isolé. Garder le profil habituel intact.
4. Importer dans le stockage de production dédié **uniquement après validation de la sauvegarde la plus récente et autorisation distincte**, avec la séquence des trois confirmations ; vérifier 5 événements (ou nouveau total réel) et résultats après rechargement et export JSON. Si l'état actuel diffère de la copie V2, **ne pas écraser** : réconcilier sur copie avant toute opération.
5. Ne jamais considérer la sauvegarde navigateur comme seul secours : conserver l'original hors navigateur, une exportation datée du jour et l'archive IndexedDB.

## Retour arrière
- Si l'application déployée présente un défaut : revenir à la version Git précédente de production et à son index / manifeste, en conservant tous les fichiers JSON de sauvegarde.
- **Ne pas vider localStorage/IndexedDB et ne pas effacer les données du profil Chrome normal** pour « corriger » un affichage.
- Les données de production ayant leurs propres clés, l'ancienne validation reste indépendante ; pour revenir aux données d'une archive, utiliser l'interface uniquement dans un contexte explicitement choisi et après nouvelle sauvegarde.
- L'utilisation d'une navigation privée comme recette de persistance ne remplace pas un stockage de long terme : fermeture de l'ensemble des onglets privés peut supprimer ces données.

## État d'autorisation
**NON AUTORISÉ pour la production**. Paquet préparé uniquement, aucune écriture dans le dépôt `MILFT37/milft-tournois`, aucun import dans le Chrome normal du Samsung.
