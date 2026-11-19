# MILFT Tournois V1.1 — MAJ 55 — Lecture Drive réelle et protection d'une ancienne archive d'essai

Date : 19 novembre 2026. Complément de la feuille de route MAJ 47–54. Les tests Android, iPhone, PC et JSON déjà validés ne doivent pas être recommencés.

## Preuve réelle Samsung, 10 h 43 (Europe/Paris)
Capture utilisateur dans l'application **V1.1 complète de validation** : le panneau `Google Drive — validation V1.1 (sauvegardes du club)` indique « Archives Drive : 1 archive disponible ci-dessous ». Il affiche l'archive `MILFT_TOURNOIS_manuel_2026-11-18T21-22-47-261Z_10c31de2-81b.json`, datée du 18/11/2026 à 22:22:48, avec « Télécharger JSON » et « Restaurer (avec confirmations) ». Il s'agit de l'archive créée lors de l'essai Android antérieur où le mode fictif ne s'était pas isolé. Elle **ne doit pas être restaurée comme sauvegarde du club**. L'ouverture de l'historique ne modifie ni les données locales ni les archives distantes. Cette validation de lecture réelle ne doit pas être répétée.

## Correctif conservatoire sur GitHub (validation exclusivement)
- Commit `14fdc54f62a8d4d917842da216f6b80765a1489d`, parent `6f2ce5390b32e582c3685119f778bf508efd3f46`.
- Le module `milft-drive-v11-validation.js` reconnaît **le nom exact de l'archive mal dirigée** et les archives explicitement nommées `MILFT_TOURNOIS_test-fictif_...`. Dans la liste de l'application complète, elles sont signalées **« ARCHIVE D’ESSAI — NE PAS RESTAURER »**, restent téléchargeables, mais leur bouton de restauration est désactivé. Ne pas supprimer les archives ni étendre le blocage aux sauvegardes légitimes.
- Le scénario `tests/drive-v11-browser.cjs` vérifie l'archive d'essai mal classée (lecture/téléchargement possibles, restauration impossible) tout en conservant le test positif de restauration d'une archive synthétique légitime.
- `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html`, `drive-integration-fictive.html` et `sw.validation.js` utilisent le module versionné `?v=20261119-drive-quarantine-01` et le nouveau cache PWA `milft-validation-shell-v1-20261119-drive-quarantine-01`. `tests/pwa-offline.cjs` mis à jour.
- Production officielle inchangée ; aucun JSON réel importé ; aucun fichier Drive supprimé ou écrasé.

## Workflows déclenchés
- Google Drive n°29 `44499443832`, Pages n°232 `44499443937`, PWA n°9 `44499443812`, Chromium mobile n°255 `44499444026`, WebKit n°24 `44499444279`, championnat annuel n°317 `44499443991`, Course aux points n°273 `44499443965`, attribution tables n°233 `44499444183`, ergonomie n°208 `44499444000` : **IN_PROGRESS au relevé initial**, vérifier la conclusion officielle avant de les annoncer réussis.
- Ancien run Drive n°28 `44497863087` : SUCCESS sur le module précédent.

## Prochaine étape
Lire les résultats et journaux des workflows déclenchés. Si tous verts, la lecture réelle du Drive et la sécurité de la quarantaine sont validées ; le téléchargement réel et le dépôt d'une sauvegarde de données réelles dans la V1.1 complète ne sont **pas encore prouvés**. Ne pas demander de nouveau test d'autorisation ou de lecture de l'historique. Pour la promotion en production, obtenir un **GO explicite distinct**. Drive reste un système de sauvegarde d'instantanés JSON, non une synchronisation simultanée PC/mobile. Gratuité intégrale demandée.
