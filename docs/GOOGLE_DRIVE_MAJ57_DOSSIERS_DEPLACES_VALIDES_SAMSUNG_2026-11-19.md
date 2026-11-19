# MILFT Tournois V1.1 — MAJ 57 — Dossiers déplacés confirmés sur Samsung

Date : 19 novembre 2026, capture utilisateur à **11 h 12 (Europe/Paris)**. Complément aux MAJ 47–56. Ne pas refaire les tests validés.

## Preuve réelle sur Samsung Android dans la V1.1 complète de validation
Après déplacement manuel des dossiers Google Drive sous **Appli MILFT / MILFT Tournoi**, l'utilisateur a ouvert la V1.1 complète avec le module Drive corrigé (`?v=20261119-drive-moved-folders-01`) et consulté « Voir les archives Drive ».

Capture du 19/11 à 11 h 12 :
- Panneau : **« Google Drive — validation V1.1 (sauvegardes du club) »**.
- État : **« Archives Drive : 1 archive disponible ci-dessous. »**
- Archive d'essai historique retrouvée : `MILFT_TOURNOIS_manuel_2026-11-18T21-22-47-261Z_10c31de2-81b.json`, affichée datée du 18/11/2026 à 22 h 22 min 48 s.
- Avertissement visible : **« ARCHIVE D’ESSAI — NE PAS RESTAURER »**.
- **« Télécharger JSON »** toujours disponible ; **« Archive d’essai : restauration désactivée »** affiché en grisé.
- La capture établit que la **lecture réelle des archives après déplacement** fonctionne et que la protection de l'archive d'essai s'affiche. Elle ne prouve pas un nouveau dépôt de sauvegarde réelle, ni un téléchargement effectif, ni la restauration d'une sauvegarde réelle dans l'application complète. Ne pas extrapoler.
- **Aucune manipulation supplémentaire de ces dossiers ou de cette archive n'est requise.** Ne jamais proposer de restaurer l'archive d'essai.

## Traçabilité technique confirmée
- Correctif appliqué au code et publié sur dépôt de validation : `2dd3861219fc95b7ba7c1f92b66d23f3eea49fc0`.
- Corrections de deux erreurs de syntaxe **dans le test uniquement** : `9f01f2dbdafec794aa268448afab622bfe0ead93` et `2a4ba2a64d72be9049ede2b7e6f89864746ea75e`.
- Workflow Google Drive n°32 : **SUCCESS** (`44503089735`).
- GitHub Pages n°233 : **SUCCESS**, PWA n°10 **SUCCESS**, Chromium mobile n°256 **SUCCESS**, WebKit n°25 **SUCCESS**, championnat annuel n°318 **SUCCESS**, Course aux points n°274 **SUCCESS**, ergonomie n°209 **SUCCESS**.
- Workflow attribution tables n°234 `44502719388` : **IN_PROGRESS au dernier relevé**. Ne pas annoncer le succès sans preuve, mais conserver les validations antérieures.
- Production et données du club : **non modifiées**.

## Prochaine phase
Cette validation **dossiers déplacés / lecture de l'historique / protection archive fictive sur Samsung réel est close**. Ne pas la répéter. Reste à déterminer les validations minimales pour le flux de **sauvegarde réelle de l'application complète**, avec consentement explicite avant toute écriture réelle, puis décider de la promotion en production sur GO distinct. Google Drive sert d'archives JSON, pas de synchronisation temps réel entre appareils. Respecter 100 % gratuit et l'organisation utilisateur sur Drive.

## Protocole de reprise
Reprendre depuis MAJ 57 sur `MILFT37/milft-tournois-validation`, branche `main`. Lire les résultats GitHub à partir des runs ci-dessus, ne pas faire repasser les tests PC / iPhone / Samsung / JSON / PWA déjà réussis, poursuivre sur le HTML existant pour démonstration immédiate et mettre à jour la feuille de route à chaque jalon. Aucune publication de production sans GO spécifique.
