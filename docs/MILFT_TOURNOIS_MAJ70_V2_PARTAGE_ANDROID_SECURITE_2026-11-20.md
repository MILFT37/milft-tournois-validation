# MILFT Tournois — MAJ 70 — Partage Android ↔ Android et sécurité Firebase (20/11/2026)

## Décision utilisateur / priorité
Le partage V2 doit fonctionner **Samsung ↔ autre Android**, **Android ↔ PC** et **Android ↔ iPhone/Safari**, indépendamment de la marque. Deux Android peuvent être connectés au même compte utilisateur ou à des comptes distincts autorisés pour un même tournoi. Urgence métier : besoin de partage prochainement, priorité au premier parcours réel sûr.

## Résultat prouvé sur GitHub
- `v2/firebase-match-transport.cjs` : adaptateur transactionnel injecté Firebase Realtime Database. **Pas de projet réel connecté.** Commit `6906a9989e3245cc9bd0071e80a91f1708e738ce`.
- `tests/v2-android-android-transport.cjs` : deux Android, même UID sur deux appareils, deux UIDs différents, conflits de versions, lecture en temps réel simulée, empreinte d'événement, idempotence, refus d'emprunt d'identité, hors-ligne sans accusé. Intégré au workflow `.github/workflows/v2-sync-simulated.yml` au commit `995181d012c31855ab81fc5a55f35d7950806e67`.
- **Workflow de simulation V2 n° — run `44741575149` : SUCCESS.**
- `v2/database.rules.json` : règles RTDB fermées par défaut, lecture par membre, écriture de score versionnée par admin/editor uniquement, viewer incapable d'écrire, séparation des tournois. Commits `fee6ff99e521b371650ed775fb3606cb2fa3ba87`, `cbcd39f18817e4db3dcb56f465f74cebc19e87b3`, `62f081380639041eb37a19eb79f445bdc12742fd`.
- `firebase.v2.emulator.json`, `tests/v2-rtdb-security.cjs`, `.github/workflows/v2-rtdb-security.yml` : tests contre **l'émulateur officiel Firebase** (Java 21, Firebase Tools, projet fictif `demo-milft-v2-70`), commit `77c275c7b9f5e78ba2efc3436f3322c7da81887f`.
- **Workflow sécurité Firebase RTDB — run `44741825211` : SUCCESS**, aucune erreur de test.

## Ce que les tests authentiques de règles interdisent
- Lecture par non-membre ou non-authentifié ; accès global aux données d'un tournoi ; lecture des rôles des autres.
- Écriture par viewer, invité hors tournoi, non-authentifié, ou utilisateur d'un autre tournoi.
- Écrasement d'un score avec version obsolète ; effacement de match ; écriture directe d'un champ de score pour éviter le contrôle de version.
- Ajout / élévation de membre par navigateur (provisionnement sécurisé à construire).
- Création libre de match, modification de statut, ajout de champs inconnus et saisie de valeurs invalides / index de manche non autorisé.
- Les mises à jour de score autorisées sur un match déjà configuré `playing`, de version N à N+1, ont réussi entre deux comptes Android fictifs.

## Limites assumées — ne pas confondre prototype et disponibilité utilisateur
1. **La V1.1 officielle n'a PAS été modifiée**. Les tournois, joueurs, classements, scores locaux Samsung et archives Drive historiques ne sont pas migrés ni exportés, et restent inchangés.
2. Pas de projet Firebase réel configuré, aucune authentification Google réelle, aucun partage entre véritables téléphones. Les tests sont automatisés hors production.
3. L'adaptateur est encore CommonJS injecté pour les tests Node, **pas encore une interface installable/éditable depuis Android**.
4. Seule la commande `set.record` est prise en charge par ce transport ; `match.validate`, tables, forfait et réouverture restent des simulations indépendantes MAJ 68. Les règles de points/manches propres aux formats MILFT doivent être raccordées avant utilisation réelle.
5. Les règles actuelles n'autorisent pas la création/modification des membres par les clients, volontairement ; provisionnement initial et partage/invitation doivent être développés et testés avant multi-compte.
6. La file IndexedDB MAJ 69 conserve les commandes après fermeture et protège les conflits ; elle ne prouve pas encore la transmission de bout en bout avec Firebase. L'absence d'accusé serveur ne doit jamais supprimer une commande.
7. Le forfait Firebase Spark est gratuit dans ses quotas, **sans garantie de service illimité** ; aucune facturation Blaze ne peut être activée par le projet sans accord distinct.

## Étapes prioritaires à poursuivre
1. Brancher l'adaptateur au SDK Firebase Web et à l'IndexedDB en **page prototype autonome** avec données fictives seulement. Intégrer une page de connexion Google, une écoute temps réel et les statuts « local », « en attente », « confirmé » et « conflit ». Ne pas connecter à la V1.1.
2. Faire tourner un test de bout en bout transaction SDK ↔ émulateur RTDB ↔ file locale et une session avec deux navigateurs Android simulés.
3. Concevoir et tester le provisionnement des membres (dont deux comptes Google distincts) sans relâcher les règles de sécurité.
4. Créer/configurer un vrai projet **Firebase Spark sans carte bancaire** sous contrôle de l'utilisateur, depuis son Samsung si nécessaire, uniquement lorsque la page prototype est prête. L'accès GitHub ne suffit pas à créer un projet Firebase dans son compte. Besoin seulement de la configuration Web publique et de l'URL de la base ; **ne jamais réclamer de mot de passe, clé privée ou token**.
5. Validation réelle limitée sur deux appareils avec **tournoi fictif**. Aucune migration automatique des données du club. Production V1.1 uniquement avec GO distinct après validation complète des formats, conflits, rôles, sécurité et sauvegardes.

## Reprise après changement de chat
Repartir de la MAJ 70, vérifier les deux workflows SUCCESS ci-dessus sans relancer les anciennes validations, et poursuivre dans `v2/` exclusivement. La date de ce document remplace les références de novembre 19 devenues obsolètes. L'utilisateur souhaite intervenir le moins possible, uniquement depuis Android.
