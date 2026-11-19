# MILFT Tournois V1.1 — MAJ 53 — Stabilisation du contrôle Google Drive
Date : 19 novembre 2026. Complément de reprise au suivi MAJ 47–52, sans remplacement des documents antérieurs.

## Acquis confirmés
- La connexion OAuth réelle, l'écriture d'une sauvegarde fictive et la lecture de son historique sont déjà prouvées sur Samsung Android : **ne pas recommencer** ces essais.
- Les validations de l'application V1.1 pour GitHub Pages n°231, PWA n°8, Chromium mobile n°254, championnat annuel n°316, Course aux points n°272, ergonomie n°207, attribution tables n°232 et simulation Safari WebKit n°23 sont **SUCCESS**.
- Le commit applicatif `294763332f9b7148e691f34a7c13a8f18d428bdc` a fait correspondre l'URL versionnée du module Google Drive et le cache PWA, ajouté les contrôles fictifs de restauration complète et téléchargement JSON.
- Le commit `b1e226582937b89a43b19aebf29adee571dac923` corrige l'attente du test : il faut **trois confirmations** de restauration (accord sur archive distante, aperçu métier, remplacement après protection). Les protections réelles n'ont pas été réduites.

## Blocage observé
- Workflow Drive n°25 `44496441562` : **FAILURE** sur une attente de deux confirmations, corrigée dans le test.
- Workflow Drive n°26 `44496686078` : reste signalé **IN_PROGRESS** à l'étape `Installer Chromium de test isolé`, malgré plusieurs lectures des statuts GitHub. Journaux du job indisponibles (erreur 404 BlobNotFound) : ne pas le déclarer réussi, ni attribuer avec certitude une cause précise.
- Aucun résultat n'indique que l'archive réelle du club ait été effacée ou restaurée.

## Correctif de CI, sur le dépôt de validation exclusivement
- Commit `8f1055ceb06683ae46947bcbcb1bdc062d9aed84`, fichier `.github/workflows/drive-v11.yml`.
- Job placé dans le conteneur `mcr.microsoft.com/playwright:v1.56.1-noble` disposant des navigateurs et dépendances, comme le workflow WebKit déjà validé ; installation limitée au package Node Playwright de même version.
- Timeout explicite de **20 minutes** pour empêcher qu'une exécution reste bloquée sans limite.
- Déclenchement automatique du workflow Drive n°27 `44497651182` ; au dernier contrôle celui-ci est **IN_PROGRESS**, démarrage du conteneur. Ne pas annoncer son succès avant lecture de sa conclusion officielle.
- Aucune modification de `milft-drive-v11-validation.js`, du moteur de tournoi, des sauvegardes réelles ou de la production.

## Prochaine décision
1. Vérifier la conclusion du run Drive n°27. S'il échoue, lire le journal et corriger **uniquement** le scénario concerné, sur la branche de validation.
2. Si ce test est vert, considérer les contrôles automatiques de la V1.1 de validation réussis, mais pas la production validée pour les données du club sans vérification ciblée du parcours réel complet.
3. Conserver la feuille de route et ne demander une manipulation Samsung que lorsque celle-ci est absolument indispensable. Les sauvegardes Drive sont des archives JSON, **pas une synchronisation temps réel**.
4. Toute promotion de la version de validation en production nécessite un **GO distinct, explicite** ; le GO de reprise du présent échange ne l'autorise pas.
