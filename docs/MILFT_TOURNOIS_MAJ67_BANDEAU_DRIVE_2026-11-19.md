# MILFT Tournois — MAJ 67 — Bandeau Google Drive dynamique (19/11/2026)

## Autorisation et périmètre
GO utilisateur déjà validé dans la MAJ 66. Correction **limitée à l'interface d'état Google Drive V1.1**. Ne jamais restaurer ni modifier les données réelles Samsung, joueurs, scores, fichiers JSON, archives Drive, clés de stockage et archives de secours. Aucune sauvegarde Drive réelle de test. Aucun partage temps réel entre appareils en V1.1 (V2.0 uniquement).

## Jalons réalisés
1. Lecture de la feuille de route MAJ 66 et vérification du dépôt validation et de la production officielle. Base production au début : `0ef73bbb85cae5e2aacabd3f219c02b7c2013a7b`.
2. **Commit `907cc1067124ead2239962bb2cc5862426a3f25f`** : remplacement dans validation et candidate production du grand bandeau jaune `milft-iso-warning` par trois indicateurs compacts : données locales conservées, Drive (connexion / attente / upload confirmé / erreur / hors ligne), automatique (activée ou non, fréquence, quota 200/jour). Module Drive identique hors contrôles visuels, clés locales et fonctionnement conservés. Service workers/caches versionnés. Parité des 3222 lignes métier maintenue (8 écarts de stockage/manifest déjà approuvés).
3. **Commit `b45b297dcb020da86adf4ddb1f30f6ae4590c76f`** : nouvelles assertions navigateur sur le bandeau, connexion sans copie, confirmation API, modifications en attente, erreur HTTP 403, quota et rechargement sans horodatage inventé. Tests sur OAuth et API Drive **fictifs uniquement**.
4. **Commit `649cd58c6f09cd468c4ef76107971e335f39b586`** : mise à jour des deux assertions statiques de cache PWA / candidate qui pointaient sur la version 200-01 (obsolète). Test PWA validation **SUCCESS** run `44552092573`.
5. **Commit `f292c542ce2e7bc231550b92b8103c6a4b95cdda`** : correction du rafraîchissement de l'affichage après retour d'envoi Drive (indicateur bloqué temporairement en « envoi en cours » dans les assertions). Le statut passe à confirmé **après** la sortie de l'état busy.

## Contrôles et publication
- Avant la dernière correction, GitHub Actions sur `907cc106` : Chromium mobile, WebKit, vérification championnat annuel, attribution tables, Course aux points, ergonomie, Google Drive validation et Pages validation **SUCCESS**. Deux échecs PWA / candidate liés au cache versionné ont été identifiés et corrigés.
- Tests ciblés Google Drive et candidate sur `b45b297` échouaient respectivement sur un statut intermédiaire « envoi en cours » et sur une assertion statique périmée ; correctifs ci-dessus.
- **En attente de verdict final Actions sur `f292c542` avant promotion officielle. Ne pas annoncer production publiée tant que le commit officiel et les workflows officiels ne sont pas contrôlés.**
- La production officielle `MILFT37/milft-tournois` est distincte du dépôt de validation. Promotion nécessaire des deux fichiers production + cache, sans remplacement d'autres composants.

## Actions restantes pour poursuivre sans demander de GO
1. Lire résultats Actions du commit `f292c542`, en particulier « Verification Google Drive V1.1 validation » et « Candidate production MILFT V1.1 — contrôle isolé ». Corriger uniquement les anomalies de cette MAJ.
2. Confirmer la parité et le service worker.
3. Promouvoir les changements **uniquement UI** sur `MILFT37/milft-tournois` : HTML officiel, `milft-drive-v11-production.js`, `sw.production.js` ; vérifier les noms des fichiers et la version de cache réelle avant écriture.
4. Vérifier GitHub Pages et PWA de production et noter les run IDs/commits. Mettre à jour la présente feuille de route avec preuves et statut définitif, sans redemander les tests historiques.
5. L'utilisateur intervient seulement si incontournable, depuis son Samsung. Ne pas relancer OAuth, import, restauration ou sauvegarde réelle pour tester.

## Invariants
Sauvegardes automatiques désactivées par défaut ; réglage 5/10/15/30/60 min, 15 min initial, quota 200 envois automatiques/jour/appareil ; manuelles hors quota. Les modifications de match restent **locales** tant qu'une copie Drive n'est pas confirmée. Aucun état « synchronisé entre appareils ».

## Jalons complémentaires — tests et promotion officielle
6. **Commit `285cb92c7f0274f62c2e508848e7cc0567c8bdc7`** : ajustement du test candidat pour couvrir la situation normale où la donnée fictive a été modifiée avant OAuth (le bandeau indique alors « modifications locales en attente », pas « copie confirmée »). Candidate production workflow `44552423172` : **SUCCESS** (Chromium et WebKit). Google Drive validation workflow `44552214531` : **SUCCESS** ; Pages validation workflow `44552214522` : **SUCCESS**.
7. **Promotion officielle**, dépôt `MILFT37/milft-tournois`, branche `main`, commit **`d81c9f03f7e7ca016e517c6df8ae1f458285ee0c`**. Fichiers modifiés **exclusivement** : `MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html`, `milft-drive-v11-production.js`, `sw.production.js` et les deux tests de contrôle `tests/pwa-production.cjs`, `tests/production-release.cjs`. L'ancienne production source était le commit `0ef73bbb85cae5e2aacabd3f219c02b7c2013a7b` ; les trois fichiers de production d'origine étaient identiques au contenu de la candidate de référence. **Aucune donnée ou archive réelle et aucune clé de stockage n'a été modifiée.**
8. **PWA production** workflow n°8, run `44552729294` : **SUCCESS**. GitHub Pages production workflow n°21, run `44552727377` : publication lancée, verdict à vérifier avant clôture.

## État à la dernière actualisation
La correction visuelle est poussée sur la production officielle. Une connexion OAuth n'est jamais assimilée à un envoi confirmé. Les archives Drive existantes ne sont pas interrogées ou modifiées pour créer le bandeau. La connexion Google doit éventuellement être refaite lors de la prochaine session : ne pas prétendre l'avoir validée sur le Samsung depuis GitHub.

**Reste à faire :** confirmer la conclusion `success` du run Pages production `44552727377`, puis marquer cette MAJ comme terminée. Aucun nouveau GO ni test manuel sur Samsung nécessaire pour cette correction.
