# MILFT Tournois V1.1 — MAJ 56 — Dossiers Google Drive déplacés manuellement

Date : 19 novembre 2026. Complément à la feuille de route MAJ 47–55 ; ne pas remplacer les documents précédents ni répéter les validations acquises.

## Signalement et rangement actuel de l'utilisateur
L'utilisateur a déplacé lui-même depuis la racine Drive trois dossiers précédemment créés par l'application :
- `MILFT Tournois`
- `MILFT Tournois - Diagnostic`
- `MILFT Tournois - Essais`
Ils sont désormais dans **Appli MILFT / MILFT Tournoi**. Les sous-dossiers et fichiers ne doivent être ni supprimés ni déplacés par la correction.

## Risque corrigé
Ancien code : recherche de dossiers principaux Google Drive limitée à `'root' in parents` ; après déplacement, la sauvegarde pouvait recréer un doublon à la racine et la liste des archives pouvait paraître vide. Les archives déjà créées et la validation OAuth n'étaient pas mises en cause.

## Correctif GitHub
- Dépôt `MILFT37/milft-tournois-validation`, branche `main`.
- Commit `2dd3861219fc95b7ba7c1f92b66d23f3eea49fc0`.
- `milft-drive-v11-validation.js` : recherche du dossier MILFT par son nom et son type dans les éléments accessibles via `drive.file`, quel que soit son parent ; recherche du sous-dossier dans le dossier retrouvé ; refus si plusieurs dossiers homonymes accessibles, pagination contrôlée. Aucune suppression ni déplacement distant. Réutilisation des dossiers déplacés pour la lecture et les prochaines archives.
- `drive-connexion-android.html` : diagnostic fictif capable de réutiliser son dossier déplacé ; refus des résultats ambigus.
- Tests `tests/drive-v11.cjs` et `tests/drive-android-write.cjs` : dossiers déplacés sous un autre parent, anciennes archives retrouvées, nouvelle archive dans le sous-dossier existant, absence de duplication, refus des noms ambigus.
- HTML V1.1 complet et page fictive : même module `?v=20261119-drive-moved-folders-01`; `sw.validation.js` : cache `milft-validation-shell-v1-20261119-drive-moved-folders-01` ; `tests/pwa-offline.cjs` ajusté.
- Le correctif est déployé uniquement sur le dépôt de **validation**. La production officielle et les données métier restent intactes.

## Limites et précautions
- Google OAuth utilise `drive.file` : seuls les fichiers/dossiers accessibles à l'application peuvent être retrouvés. La capture utilisateur atteste du déplacement manuel, mais aucune lecture réelle des dossiers déplacés par l'application corrigée n'est encore confirmée.
- Si un dossier est introuvable ou si plusieurs homonymes sont accessibles, ne pas demander de sauvegarde réelle avant contrôle ciblé.
- Aucune synchronisation temps réel PC / mobile n'est ajoutée.
- Ne pas refaire les validations du fonctionnement du Google OAuth et de l'ancienne archive antérieure ; elles restent acquises (MAJ 49–55).
- Le GO de reprise n'autorise pas à publier en production.

## Contrôles lancés
- Drive n°30 : `44502719317`
- Pages n°233 : `44502719237`
- PWA n°10 : `44502719298`
- Chromium mobile n°256 : `44502719282`
- WebKit n°25 : `44502719221`
- Championnat annuel n°318 : `44502719583`
- Course aux points n°274 : `44502719496`
- Attribution tables n°234 : `44502719388`
- Ergonomie n°209 : `44502719242`
Au déclenchement : résultats définitifs **non tous connus**. Lire les statuts GitHub avant de déclarer validation complète.

## Suite autonome
Contrôler les workflows, corriger uniquement les erreurs démontrées. La prochaine manipulation utilisateur éventuelle doit être **une consultation en lecture seule** de l'historique après le déplacement, sans nouvelle écriture ni restauration. Pas de nouveaux tests PC, iPhone ou Samsung déjà validés.
