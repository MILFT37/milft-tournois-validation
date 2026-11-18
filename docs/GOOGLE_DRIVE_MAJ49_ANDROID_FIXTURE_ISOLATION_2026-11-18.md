# MILFT Tournois V1.1 — MAJ 49 — Google Drive Android (18/11/2026)

Ce complément conserve sans remplacement l'historique antérieur (MAJ 47/48). Application complète, données réelles, production et tests déjà validés sont préservés.

## Preuve Android
Capture utilisateur à 22h22 : « Sauvegarde Drive confirmée » pour `MILFT_TOURNOIS_manuel_2026-11-18T21-22-47-261Z_10c31de2-81b.json`. La connexion OAuth réelle et une écriture Drive sont donc confirmées. Ne pas les refaire.

## Anomalie
Sur la page censée être fictive, l'écran a affiché « Google Drive — validation V1.1 (sauvegardes du club) » et « MILFT Tournois / Sauvegardes » au lieu de « MILFT Tournois - Essais / Sauvegardes fictives ». La page de test avait donc probablement chargé un ancien module depuis le cache PWA ; l'écriture réussie n'était pas correctement isolée. La cause cache est plausible, non prouvée.

## Correctif GitHub
Commit `1a3f7e50fcc2717c011c23798e19830b25ebe142`.
- Module Drive : reconnaissance du mode fictif **par l'URL** `drive-integration-fictive.html`, pas seulement l'indicateur JS, désactivation sauvegarde auto et restauration dans l'essai et choix forcé des dossiers fictifs.
- Page fictive : paramètre de version pour le module.
- Service worker : clé de cache renouvelée.
- Test navigateur : simulation indicateur fictif erroné, vérification du mode par URL, des dossiers isolés, des noms `test-fictif`, et des actions non destructives.

## Preuves officielles
- Google Drive : run `44402300932`, job `135148276135` **SUCCESS** — https://github.com/MILFT37/milft-tournois-validation/actions/runs/44402300932
- Pages : run `44402300245`, jobs `135148275334` et `135148463875` **SUCCESS** — site public vérifié.
- PWA : run `44402300190`, job `135148274489` **SUCCESS**.
- Aucun score ni sauvegarde réelle supprimé ou modifié par ce correctif.

## Une seule validation ciblée sur Samsung
Ouvrir dans Chrome normal :
https://milft37.github.io/milft-tournois-validation/drive-integration-fictive.html?v=20261118-fixture-isolation-01
Confirmer d'abord le titre « essai isolé (joueurs fictifs) » et que « Activer la sauvegarde automatique » est désactivé. Si c'est le cas seulement, autoriser une nouvelle sauvegarde **fictive**, vérifier le nom `MILFT_TOURNOIS_test-fictif_...` et le dossier « MILFT Tournois - Essais / Sauvegardes fictives ». Un historique doit offrir uniquement « Télécharger JSON », sans restauration. En cas de résultat inattendu, ne rien sauvegarder et transmettre l'écran.

Ce test ciblé est le seul restant : ne pas répéter les tests de l'application complète. Une preuve Google sur Android ne signifie pas synchronisation temps réel entre appareils. Promotion en production exclusivement après accord explicite distinct.
