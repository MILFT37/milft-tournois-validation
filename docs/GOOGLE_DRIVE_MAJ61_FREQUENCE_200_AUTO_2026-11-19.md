# MILFT Tournois V1.1 — MAJ 61 — Fréquence automatique réglable et plafond 200/jour
Date : 19 novembre 2026. Suite directe des MAJ 47–60, sans refaire les validations antérieures.

## Décisions utilisateur
- **GO** explicite pour modifier les sauvegardes automatiques Google Drive : **5, 10, 15, 30 ou 60 minutes**, valeur par défaut **15 minutes**.
- Plafond **200 envois automatiques/jour/appareil** à la place de 40. Les envois manuels sont toujours autorisés même après atteinte de ce plafond.
- Envoi périodique uniquement en cas de modifications locales en attente ; aucun envoi automatique sans connexion Google et activation volontaire.
- Chaque sauvegarde crée une archive JSON indépendante. Aucun fichier existant supprimé ou écrasé. Données du championnat inchangées.
- **Partage multi-appareils en écriture simultanée reporté à V2.0**, avec arbitrage des conflits (la V1.1 repose sur des stockages locaux séparés et des archives Drive, **pas** sur la synchronisation temps réel).
- 100 % gratuit, Android, iPhone et PC.
- La V1.1 de **production officielle** reste soumise à un GO distinct ; le GO courant autorise le développement de ces réglages et leur préparation dans la candidate de production, pas la publication officielle.

## Implémentation dans le dépôt de validation
- `milft-drive-v11-validation.js` : constante `MAX_DAILY_UPLOADS = 200`, `AUTO_INTERVAL_CHOICES = [5,10,15,30,60]`, sélection affichée dans Paramètres > Sauvegarde et restauration > Google Drive.
- La sélection est mémorisée en `localStorage` par navigateur, avec 15 min par défaut. Si la sauvegarde automatique est déjà active, la nouvelle fréquence relance sa minuterie. Aucun envoi périodique quand l'application est fermée.
- Quota automatique dans `MILFT_DRIVE_AUTO_QUOTA_V2` : basé sur la date locale de l'appareil, réinitialisé au changement de jour local. Il compte l'archive d'activation et les sauvegardes périodiques (et éventuelles reprises/reconnexions), **mais pas les sauvegardes manuelles**. Les anciens compteurs de 40 ont une clé différente pour ne pas bloquer cette évolution.
- À 200 envois automatiques, le mode automatique s'arrête ; la saisie des scores et les sauvegardes locales restent possibles et le bouton « Sauvegarder maintenant » reste disponible même si ce plafond automatique est atteint.
- Les réponses HTTP 403/429 restent des erreurs de sécurité séparées : elles peuvent encore suspendre l'envoi Drive et demander une reconnexion, indépendamment du plafond volontaire de 200.
- Cache et HTML de validation versionnés `20261119-drive-interval-200-01`.
- Candidate isolée dans `candidate-production-v11/` : **même logique Drive et même interface**, module `milft-drive-v11-production.js` et cache/HTML versionnés `20261119-prod-candidate-200-01`; **aucune écriture** sur `MILFT37/milft-tournois` (production officielle).

## Vérifications
- Test unitaire `tests/drive-v11.cjs` : limites, valeurs possibles et défaut.
- Scénario Chromium isolé `tests/drive-v11-browser.cjs` : fréquence choisie sauvegardée après rechargement, arrêt au 200e envoi automatique, refus de l'automatique suivant, sauvegarde manuelle toujours possible sans incrémenter le compteur et aucune mutation des données locales.
- Candidate de production : assertion statique de présence du réglage et simulation du changement de fréquence `15 → 10` minutes, parcours déjà existant de sauvegarde/restauration fictive Chrome/WebKit.
- Au point de rédaction : Google Drive **n°39 SUCCESS** (`44533460528`), PWA **n°14 SUCCESS** (`44533220122`), GitHub Pages **n°238 SUCCESS** (`44533212539`). Candidate de production **n°13 SUCCESS** (`44533586417`) : statique, Chrome/Chromium et WebKit/Safari simulé, restauration fictive. Tous les contrôles ciblés sont verts.

## Préservation et reprise
- Première sauvegarde réelle sur Samsung déjà confirmée en MAJ 59, le 19/11 à 11:55 (42 joueurs, 7 objets techniques) : ne pas la recréer pour les tests ; aucun transfert automatique vers la production.
- Dossiers Drive déplacés `Appli MILFT / MILFT Tournoi` : organisation conservée.
- Le mode fictif reste sans restauration ni sauvegarde automatique ; les archives d'essai accidentellement rangées avec les vraies restent protégées.
- Poursuivre les contrôles CI jusqu'au succès de la candidate production. La mise en production nécessitera autorisation explicite. Le déploiement ne réalise pas de partage temps réel et ne doit pas effacer le stockage des appareils.
