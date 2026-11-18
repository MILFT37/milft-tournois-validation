# MILFT Tournois V1.1 — Complément de reprise Google Drive, MAJ 48 (18/11/2026)

> Complément non destructif de la feuille de route « après MAJ 47 ». **La section 47 intégrale n'a pas été récupérée dans les fichiers accessibles de ce chat.** Ne jamais remplacer ou tronquer la feuille historique. Production V1.1 et données réelles protégées.

## Protocole inchangé
- Travail autonome sur le dépôt de **validation** ; pas de GO entre les sous-étapes.
- Ne pas répéter les vérifications acquises PC, Android, iPhone, PWA, restauration JSON, mode hors connexion et modification des scores fictifs.
- Application V1.1 complète conservée, coût de fonctionnement visé 100 % gratuit, PC + Samsung Android.
- **Pas de modification de production ni des sauvegardes réelles sans accord de production distinct.**
- Toujours distinguer un succès de mocks d'une vraie connexion Google sur Samsung.

## Références GitHub consultées
- Dépôt : `MILFT37/milft-tournois-validation`, branche `main`.
- HEAD applicatif au début du suivi : `faf1c4516972d8f4de2078089f2725fb66010598`.
- Dernier correctif : affichage de « Télécharger JSON » sur chaque archive fictive en conservant « Restaurer » absent ; diff `8b2cdaa498692a5115c8f43a17b5bec7dc57a2c0` → `faf1c451...`, un seul fichier applicatif modifié, `milft-drive-v11-validation.js`.
- Workflow Google Drive **#21 SUCCESS**, run **44395158641**, job **135122989164** : https://github.com/MILFT37/milft-tournois-validation/actions/runs/44395158641
- GitHub Pages **#227 SUCCESS**, run **44395158766** : https://github.com/MILFT37/milft-tournois-validation/actions/runs/44395158766
- Les échecs antérieurs #19 et #20 sont corrigés par la révision #21 ; ne pas les rejouer pour leur propre compte.
- HTML de validation `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html`, blob `3b3a9aa160f3c709c3778b2ca1f906ddc3cbf31d` inchangé.

## Périmètre des réussites
Le job Drive n°21 confirme : OAuth **simulé**, fichiers de sauvegarde fictifs, archivage non destructif, récupération des archives, annulation de restauration, contrôle des erreurs, protection des données locales, absence de restauration automatique dans la page fictive, et module limité à la validation GitHub Pages.

**Les mocks ne valident pas OAuth réel sur Android.** En revanche, le diagnostic Android précédent a déjà montré une autorisation Google et un accès Drive en lecture seule : ne pas recommencer ce diagnostic.

## Seule étape restante impliquant le Samsung Android
Sur Chrome **normal** (pas navigation privée), ouvrir :
https://milft37.github.io/milft-tournois-validation/drive-integration-fictive.html?v=faf1c451

1. « Se connecter au Drive du club » : obtenir « Google connecté à MILFT ».
2. « Sauvegarder maintenant » : autoriser uniquement un JSON **fictif** et obtenir « Sauvegarde Drive confirmée ».
3. « Voir les archives Drive » : retrouver cette archive et le bouton « Télécharger JSON » ; aucun bouton « Restaurer ».
4. En cas de problème, recueillir **le seul message d'erreur** ; jamais un jeton ou code Google.

Cette page utilise les deux joueurs fictifs de test, ne lit aucune donnée réelle de MILFT, écrit dans `MILFT Tournois - Essais / Sauvegardes fictives` et ne remplace aucun fichier existant.

## Statut
**GitHub vert. Module complet en simulation : validé. Connexion/écriture du module complet sur le Drive réel : validation Android encore indispensable.**

Aucune réexécution des anciens tests ni modification du HTML ne sont actuellement justifiées. En cas d'échec de l'étape Samsung, corriger spécifiquement l'anomalie dans la validation, effectuer un nouveau workflow, puis consigner SHA + run. Ne pas promouvoir en production automatiquement.
