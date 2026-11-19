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

## Clôture des contrôles (19 novembre 2026)
- Le correctif de base est publié : `2dd3861219fc95b7ba7c1f92b66d23f3eea49fc0`.
- Les tests nouvellement ajoutés ont d'abord échoué pour deux erreurs de syntaxe dans le scénario de test (variable redéclarée puis apostrophe non échappée). Les corrections **du test uniquement** sont : `9f01f2dbdafec794aa268448afab622bfe0ead93` puis `2a4ba2a64d72be9049ede2b7e6f89864746ea75e`.
- Workflow **Google Drive n°32 SUCCESS**, run `44503089735`, commit `2a4ba2a64d72be9049ede2b7e6f89864746ea75e` : vérification des dossiers déplacés, refus des dossiers homonymes, tests du diagnostic Android, restauration synthétique protégée, page fictive isolée et exclusion production.
- Workflow **GitHub Pages n°233 SUCCESS** (`44502719237`) sur le commit applicatif ; **PWA n°10 SUCCESS**, **Chromium mobile n°256 SUCCESS**, **WebKit n°25 SUCCESS**, **championnat annuel n°318 SUCCESS**, **Course aux points n°274 SUCCESS**, **ergonomie n°209 SUCCESS**. Attribution tables n°234 était encore signalée `IN_PROGRESS` lors du dernier relevé : ne pas déclarer ce point terminé.
- Les archives existantes n'ont pas été modifiées à distance. Le dossier de diagnostic et les dossiers de sauvegarde ne sont **pas** déplacés par le code : il sait les retrouver à leur nouvel emplacement si l'API `drive.file` les rend visibles.
- **Reste à confirmer sur le Samsung réel** : que l'application complète retrouve, en lecture seule, l'archive de l'ancien dossier après le déplacement manuel. Aucune sauvegarde ni restauration requise ; ne pas recommencer les tests d'autorisation déjà validés sauf si la session a naturellement expiré.
