# MILFT Tournois V1.1 — MAJ 60 — Candidate de production isolée et recette complète Drive

**Date : jeudi 19 novembre 2026.** Complément aux MAJ 47–59, sans remise à zéro des validations acquises.

## Décision et périmètre
Le « Go aller » de l'utilisateur autorise la poursuite de la préparation technique, pas une modification irréversible de la production. **La branche principale de production `MILFT37/milft-tournois` reste intacte.** Aucun fichier de données du club n'a été importé/restauré à cette étape.

La première sauvegarde réelle depuis le Samsung est déjà confirmée en MAJ 59 : **42 joueurs et 7 objets techniques de tournoi**, archive `MILFT_TOURNOIS_manuel_2026-11-19T10-55-22-532Z_f933b9ad-5e9.json`, le 19/11/2026 à 11:55:24. Ne pas la refaire, ne pas la restaurer tant que la stratégie de migration de stockage n'est pas validée.

## Audit de l'état actuel de la production
- Dépôt de production `MILFT37/milft-tournois`, branche `main` : commit `76a19f14a0af8a0ef2bf2154e7918004545d9214` au contrôle, distinct du dépôt de validation.
- Application principale : `MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html`.
- **Écart découvert** : sa connexion Drive était encore l'ancien mode `drive.appdata`, annoncé en **lecture seule**, qui ne recherche pas les dossiers visibles `Appli MILFT / MILFT Tournoi`. Une copie non adaptée du paquet de production serait donc régressive.
- Le dépôt de production `main` contient maintenant uniquement le HTML applicatif principal, des icônes, le manifeste, index, service worker et l'outil de diagnostic ; les cinq anciennes pages HTML nominatives mentionnées dans le document NO-GO du 17/11 ne figurent plus dans son arbre actuel. Cela ne constitue pas une purge prouvée de l'historique Git public ou des caches.
- Les clés locales de production sont distinctes des clés de validation, notamment `milft_prod_v11_20261117_tournois_v01` et `milft_prod_v11_20261117_planning_v066`. **Le basculement de site ou de clé ne transfère pas automatiquement les 42 joueurs et 7 objets métier du navigateur de validation.**

## Candidate préparée
- Dans le dépôt **de validation** uniquement, dossier `candidate-production-v11/`, commit de préparation `01325b81a8dc1102d3f3b3eae5f7074bf8f66505`.
- Cinq fichiers applicatifs : HTML de production avec l'ancien module Drive intégré supprimé et remplacé par `milft-drive-v11-production.js`, manifeste, service worker, accueil ; plus les deux icônes PWA (mêmes SHA que celles du dépôt de production).
- Module Drive basé sur le module validé sur Samsung en MAJ 58 : `drive.file`, dossiers visibles, sauvegarde append-only avec accord explicite, consultation/téléchargement, restauration protégée, détection de l'archive d'essai, et garde d'origine `https://milft37.github.io/milft-tournois/`. Aucun appel Google réel dans les tests CI.
- Clés de stockage de production préservées, sans copier ni précharger les données du club.
- Service worker candidat utilisant un cache de production neuf et le module versionné `?v=20261119-prod-candidate-01`, sans mise en cache des JSON privés.
- La candidate **n'est pas dans l'artéfact GitHub Pages de validation** : le workflow Pages n'exporte que les fichiers autorisés à la racine. Elle est testée via HTTP local isolé dans GitHub Actions ; aucun lien de test utilisateur public n'est annoncé.

## Tests isolés
- Workflow dédié `candidate-production.yml` avec `tests/production-candidate-static.cjs` : clés de stockage, absence de l'ancien `drive.appdata`, origine de production, références PWA, scripts inline, icônes, confinement du module.
- `tests/production-candidate-browser.cjs` : Chromium mobile isolé, faux OAuth Google, fausse API Drive, refus d'envoi avant consentement, affichage du résumé, création d'une unique archive synthétique, consultation puis restauration locale protégée, persistance après rechargement. **Aucun Drive réel ni compte utilisateur impliqué.**
- Candidate n°1 : échec dû à un identifiant `module` interdit dans un script CommonJS de test, corrigé.
- Candidate n°2 : test statique validé, échec du serveur HTTP fictif lié au traitement du slash initial, corrigé.
- Candidate **n°3 SUCCESS** (run `44527517592`), candidate **n°4 SUCCESS** (run `44527793992`) incluant le test positif de restauration et rechargement.
- Commit `59dd6184f54e80a054a2c236d95395877819577b` : ajout de la même recette sous **WebKit (simulation Safari)**. Workflow candidate n°5 `44528061596` en cours au moment de la rédaction ; vérifier sa conclusion avant annonce finale.

## Préconditions restantes avant production
1. Confirmer le résultat du workflow candidate n°5, corriger en validation uniquement tout défaut constaté. Conserver les autres résultats acquis.
2. Comparer la candidate à l'HTML de production de référence et conserver les clés de stockage de production ainsi que la séparation PWA/validation.
3. Arbitrer la stratégie de sauvegarde automatique : **mode manuel actuellement validé**, automatique optionnel et activé uniquement par l'utilisateur lorsqu'il le souhaite, jamais à l'insu de l'utilisateur ; une application fermée ne peut garantir des sauvegardes toutes les 15 min.
4. Prévoir l'import **volontaire** depuis une archive réelle récente vers le stockage de production distinct, avec aperçu et protection. Ne pas faire de restauration automatique. La présence des 42 joueurs dans la validation ne prouve pas leur présence dans la production.
5. **Obtenir un « GO mise en production » explicite, distinct**, avant toute écriture dans le dépôt `MILFT37/milft-tournois` sur sa branche principale ou toute promotion du site officiel. Documenter la possibilité de retour arrière sans effacer le stockage du navigateur.
6. Aucun nouveau test Android/PC/iPhone déjà validé à recommencer pour un code inchangé ; se limiter à une éventuelle vérification ciblée de la migration en production, après accord.

## Protocole de reprise
Lire les MAJ 57–60, vérifier le HEAD des deux dépôts GitHub et le workflow candidate n°5. Continuer de manière autonome dans le dépôt de validation, ne pas demander un GO toutes les deux minutes. Ne pas confondre données locales, sauvegardes Drive et synchronisation temps réel. Solution 100 % gratuite exigée.

## Clôture MAJ 60 — recette Chromium et Safari validée
- Le workflow candidate de production **n°7**, run `44528637627`, est définitivement **SUCCESS** sur le commit `335516780c1c98d30ce2de6172602d8473cbbcb3`.
- Le test statique, la simulation Chromium et la simulation WebKit/Safari sont **tous réussis**, avec OAuth synthétique, API Drive fictive, première sauvegarde manuelle consentie, lecture d'archives, restauration avec confirmations et conservation après rechargement.
- Historique des itérations : n°5 a révélé un échec WebKit; les diagnostics du n°6 ont montré une réponse Google HTTP 401 à une requête de test ayant échappé à l'interception (jeton **fictif uniquement**). La solution du commit `33551678...` interdit au service worker de contourner l'interception du réseau dans le navigateur de test (`serviceWorkers:'block'`). Cette configuration ne modifie pas le service worker de la candidate ni le mode hors ligne en production.
- Le commit `59dd6184f54e80a054a2c236d95395877819577b` avait ajouté le scénario WebKit et le commit `26d78c90f2021e33381c9a1253bd002754c5cdb0` le test de restauration fictive.
- Une inspection ciblée du HTML candidat constate l'absence du marqueur d'annuaire préchargé `MILFT_JOUEURS_REFERENCE_20261014`, de la sauvegarde juniors en dur, et de termes identifiables comme `client_secret` ou `PRIVATE_KEY`. Il ne s'agit pas d'un audit automatique exhaustif de toutes les données historiques du dépôt public.
- Nouvelle vérification du dépôt de **production** : `MILFT37/milft-tournois` **main demeure au commit `76a19f14a0af8a0ef2bf2154e7918004545d9214`**. Aucune opération d'écriture n'a été faite sur cette branche.
- **Conclusion technique candidate : prête pour décision de promotion**, sans promettre de synchronisation temps réel. L'archive de référence du 19/11 n'a pas été restaurée ni modifiée. La publication officielle et le transfert volontaire des données restent des étapes distinctes nécessitant le GO explicite de mise en production.
