# MILFT Tournois — MAJ 65 — Cadrage de la V2.0 « Appareils partagés »

**Date : 19 novembre 2026.** Succède aux MAJ 47–64. GO utilisateur pour poursuivre le travail autonome après la publication officielle des libellés V1.1. **Aucune modification de la V1.1 en production**, ni des données Google Drive.

## V1.1 : acquis et figé
- Production : dépôt `MILFT37/milft-tournois`, commit `0ef73bbb85cae5e2aacabd3f219c02b7c2013a7b` ; GitHub Pages n°20 et PWA n°7 SUCCESS.
- Samsung : ouverture du site officiel déjà validée ; capture utilisateur : 42 joueurs et 4 tournois à suivre.
- Google Drive : sauvegardes manuelles confirmées, automatiques opt-in (5/10/15/30/60 min ; défaut 15 ; 200 envois auto/jour), archives conservées sans écrasement.
- La V1.1 ne partage pas automatiquement les modifications entre PC et mobile. Les sauvegardes Drive ne sont pas une base temps réel.
- Ne demander **aucun nouveau test des éléments V1.1 déjà validés**.

## Objectif fonctionnel V2.0
- **Un minimum de deux appareils : un PC et un Samsung Android**, avec possibilité de Safari iPhone ensuite ; 100 % gratuit. Même tournoi partagé, mises à jour visibles rapidement quand les deux appareils sont connectés.
- Écriture concurrente : un score modifié par PC ne peut pas remplacer silencieusement un score différent saisi sur Samsung. Chaque changement de score/rencontre possède un ID unique et une version attendue ; une version dépassée engendre un conflit visible.
- Mode hors ligne : continuer les saisies localement ; conserver une **file durable** des changements (IndexedDB/stockage navigateur), même après fermeture ; à la reconnexion, rejouer avec prudence, sans écrasement silencieux.
- L'indépendance des tournois reste absolue. Les permissions devront être vérifiées **côté serveur**, pas seulement par les boutons de l'interface. Identité + rôles (administrateur, saisie, lecture seule), plus historique des modifications et possibilité de restaurer une version.
- Les résultats, poules, tableaux A/B, chronos, tables, classements et championnat restent cohérents. Les matchs doivent être des unités de modification, pas le fichier JSON complet.
- La V1.1 officielle et les archives Drive demeurent les points de retour arrière tant que la V2.0 n'est pas validée.

## Choix d'architecture à tester
**Piste recommandée à ce stade : Firebase Realtime Database sous forfait Spark, avec Firebase Authentication**. Le serveur relaie les mises à jour multi-appareils ; GitHub Pages peut conserver l'hébergement de l'application, et Google Drive conserve les sauvegardes historiques.

Selon la documentation officielle consultée le 19/11/2026 :
- Spark : **100 connexions simultanées**, **1 Go stocké**, **10 Go téléchargés/mois**, sans facturation tant que le projet reste sur le forfait gratuit. Source : https://firebase.google.com/pricing et https://firebase.google.com/docs/database/usage/billing.
- Les API **Web** de Realtime Database ne garantissent pas la persistance des modifications hors ligne après fermeture de session. Prévoir donc une file locale durable propre à MILFT. Source : https://firebase.google.com/docs/database/web/read-and-write.
- Piste Google Drive seule : possible pour sauvegarder et transférer manuellement, mais **pas équivalente à une base temps réel multi-utilisateurs**, qui exige versionnement et conflits. Source : https://developers.google.com/workspace/drive/api/guides/manage-changes.
- Spark possède des quotas réels ; **la gratuité n'est pas une garantie de disponibilité illimitée**. Ne pas activer Blaze (facturation) sans décision séparée.

## Prototype indépendant ajouté en MAJ 65
- `v2/sync-core.cjs` : moteur **fictif, hors réseau**, de validation des commandes, membres fictifs, versions de matchs, détection de conflit, idempotence par ID, et file locale sérialisable.
- `tests/v2-sync-simulated.cjs` : scénarios Samsung + PC simultanés, modification hors connexion, refus d'écrasement sur version dépassée, rôle lecture seule, réémission idempotente, séparation des tournois.
- `.github/workflows/v2-sync-simulated.yml` : simulation automatisée sur GitHub Actions avec Node, **sans accès Firebase ni Drive réel**.
- Ne prétendre ni disposer d'un serveur Firebase configuré, ni avoir une synchronisation effective entre appareils ; la sécurité réelle nécessitera Firebase Auth, des règles RTDB auditées et des tests d'intégration.
- Le cœur fictif laisse volontairement le moteur de score V1.1 inchangé ; les règles officielles seront branchées et testées dans une étape ultérieure.

## Conditions avant toute expérimentation réelle V2.0
1. Valider l'architecture et les rôles de partage, puis définir les opérations métier atomiques : attribution table, saisie manche, validation match, réouverture, forfait.
2. Créer et configurer un projet Firebase Spark, sans moyen de paiement (intervention éventuelle de l'utilisateur **uniquement depuis Samsung**). Ne pas demander l'étape avant que les tests isolés soient fiables.
3. Écrire des règles de sécurité Firebase testables, avec authentification, identification de la compétition et permissions. Ajouter des tests contre tout accès non autorisé.
4. Prévoir limites de quota, stratégie dégradée hors ligne, synchronisation à la reconnexion, indicateurs « en attente », « synchronisé » et « conflit ».
5. Aucun transfert automatique des données du club et aucune modification du site de production sans GO spécifique.

## Reprise entre chats
Commencer par les MAJ 63–65, vérifier le dernier workflow V2, puis avancer dans `v2/` uniquement. Ne pas recommencer les validations V1.1 ni réimporter les archives. Identifier séparément les tests simulés et les fonctionnalités réellement disponibles pour l'utilisateur.

## Clôture du jalon de simulation
- Workflow « V2.0 — simulation partage appareils (isolée) » **n°1 SUCCESS**, run `44548490947`, sur le commit `5b4363e61236028da827b588d54272a1c1a69993`.
- Scénarios automatisés passés : saisies Android et PC avec même version, refus d'un écrasement hors ligne, idempotence des événements, refus de modification en lecture seule, séparation des tournois, préservation des brouillons en conflit et relecture après sérialisation.
- **Limite stricte : simulation logique en mémoire, pas de synchronisation effective, pas de projet Firebase connecté, pas de déploiement de V2.0.**
