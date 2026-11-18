# MILFT Tournois V1.1 — MAJ 50 — Visibilité des archives Drive sur Android

Date : 18 novembre 2026. Complément non destructif aux MAJ 47–49. Les validations PC, iPhone, Android, PWA et JSON acquises restent valables. Production et sauvegardes réelles non modifiées.

## Observation Samsung réelle
- 22 h 40 : capture montrant **« Sauvegarde Drive confirmée »** pour une archive `MILFT_TOURNOIS_test-fictif_2026-11-18T21-40-31-343Z_75dd77b9-661.json`.
- L'en-tête affiche **« Google Drive — essai isolé (joueurs fictifs) »** et le bouton automatique est désactivé. OAuth réel + écriture test fictif réussis et reconfirmés. Ne pas refaire.
- L'utilisateur indique « Voir les archives ne fonctionne pas ». La capture ne montre pas le résultat situé initialement **sous les cinq boutons**, après les textes du panneau ; une anomalie de visibilité est démontrée par le DOM, tandis qu'un éventuel échec HTTP côté Android n'est pas encore déterminé.

## Correctif GitHub
- Commit `87f408c11f347e0ddeb2b6bd236299f92bac4d6a` : `milft-drive-v11-validation.js` affiche le résultat juste sous « Voir les archives Drive », montre immédiatement « Chargement », les erreurs de connexion / Drive et le nombre d'archives dans la zone de statut, déroule la page sur le résultat, explicite le dossier fictif quand la liste est vide. Ne modifie ni format de sauvegarde, ni autorisation Google, ni restauration réelle.
- Commit `82e6909c4d5948eb1fca41b113280794d1dfd1e5` : `drive-integration-fictive.html` référence le module versionné `?v=20261118-archives-visible-01` afin de ne pas charger l'ancien JS. Les données réelles ne sont jamais lues sur cette page.
- Les workflows Drive 23/24 et Pages 229/230 ont été lancés ; la tentative Pages 229 a échoué sur « No artifacts named github-pages » malgré l'upload d'artefact réussi. Vérifier le résultat du dernier workflow Pages 230 avant toute nouvelle demande sur Samsung.
- Après publication validée, contrôle Android ciblé : ouvrir `https://milft37.github.io/milft-tournois-validation/drive-integration-fictive.html?v=20261118-archives-visible-01`, se connecter si nécessaire, cliquer **une fois** sur « Voir les archives Drive » ; le résultat sera juste sous le bouton, y compris les erreurs. Pas de nouvel upload requis.

## Règles
- Pas de répétition des validations déjà acquises.
- Pas de production ni de données réelles sans GO explicite de production.
- Sauvegarde Drive ≠ synchronisation temps réel.
- Conserver à jour les preuves officielles GitHub et n'annoncer aucune réussite non établie.
