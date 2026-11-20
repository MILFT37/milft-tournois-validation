# MILFT Tournois — MAJ 74 — Reprise : Firebase sous le compte du club

**Date : 20 novembre 2026, fin d'après-midi (heure de Paris).** Cette feuille de reprise complète la MAJ 73, sans refaire les validations historiques.

## Avancement validé avant changement de chat
1. Le partage V2 reste une **application Web** pour Samsung ↔ autre Android, Android ↔ PC et iPhone, dans l'objectif de gratuité complète et de respect des autorisations.
2. Prototype isolé déjà publié : https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html . Le fichier `v2/firebase-config.mjs` contient toujours `firebaseConfig = null`, donc **aucun partage réel encore activé**.
3. Les quatre workflows MAJ 73 ont réussi : simulation V2 `44775844991`, Chromium/WebKit `44775845347`, E2E deux Android avec SDK Firebase Auth + RTDB sur émulateurs `44775845020`, Pages validation `44775845079`. Ne pas les relancer sans modification du code.
4. Référence MAJ 73 : `docs/MILFT_TOURNOIS_MAJ73_PARTAGE_PAR_LIEN_2026-11-20.md`. Code de démonstration avec connexion, code/lien à copier, invitation par UID, protections contre conflits, brouillons hors ligne persistants. Les règles de sécurité isolées sont dans `v2/database.rules.json` (sous-arbre `v2Trials`).
5. Production V1.1 `MILFT37/milft-tournois` à son dernier état précédemment vérifié : commit `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c` ; aucune bascule V2 ni import/restauration.

## Nouveau jalon : console Firebase réelle atteinte sur Samsung
- L'intégration Firebase **dans ChatGPT** n'a pas pu être installée sur Samsung (« connexion impossible », ou appui sans action). Ne plus renvoyer des suggestions de plugin : cela a déjà été tenté plusieurs fois. L'utilisateur est passé directement par **https://console.firebase.google.com/** dans Chrome.
- La création initiale s'est déroulée sous le compte Google **personnel** par erreur. Un projet personnel peut donc exister, **ne pas supprimer ni modifier sans demande explicite**.
- L'utilisateur s'est ensuite connecté avec le **compte Google du club MILFT**. Les captures écran dans le chat confirment l'existence et l'ouverture de **« MILFT Tournois Partage »** dans ce compte, sur la page d'accueil du projet Firebase (« Bonjour milft »).
- **État exact au dernier écran :** dans la console du projet « MILFT Tournois Partage », bouton `+ Ajouter une application` juste sous le nom. L'utilisateur n'a pas encore enregistré l'application Web, ni fourni la configuration Web publique.
- **Forfait Spark gratuit pas encore visuellement confirmé**, Auth Google et Realtime Database pas encore configurés, règles serveur pas encore déployées. Ne pas affirmer le contraire.
- L'utilisateur veut changer de chat avant de poursuivre.

## Reprise opérationnelle immédiate dans le nouveau chat
1. Reprendre la conversation **à partir du bouton « + Ajouter une application »** actuellement visible sous « MILFT Tournois Partage » dans le compte Google MILFT. Guider **une seule manipulation à la fois sur Samsung**.
2. Dans la liste de plateformes, choisir l'icône **Web `</>`**, et non Android natif ou iOS. Proposer un nom explicite `MILFT Tournois Partage Web`. Il n'est pas nécessaire d'activer Firebase Hosting pour GitHub Pages.
3. Vérifier le forfait **Spark** et refuser tout processus demandant une carte bancaire ou Blaze.
4. Récupérer les **seuls paramètres publics de l'application Web** (apiKey, authDomain, databaseURL, projectId, appId). Faire **vérifier/déployer les règles `v2/database.rules.json` avant tout test d'écriture réel**. Activer Authentication Google et autoriser le domaine `milft37.github.io`, puis configurer Realtime Database dans une région compatible Spark (à vérifier selon options réellement proposées par console).
5. Ne modifier **que** le prototype de validation et `v2/firebase-config.mjs`, après vérification de l'ID du bon projet et des règles sécurisées, pour le **premier essai fictif** sur deux téléphones. Ne pas publier de clés privées, secrets, jetons, identifiants personnels.
6. Aucun transfert automatique des joueurs, tournois, classements, archives Drive ou données locales existants. Obtenir un GO distinct avant toute modification de production/migration, et ne pas refaire les vérifications déjà validées.

## Méthode souhaitée
L'utilisateur travaille depuis un Samsung Android, souhaite intervenir uniquement aux étapes indispensables, **une action claire puis une capture si nécessaire**. L'assistant doit travailler directement sur GitHub dès que possible, vérifier les changements sans demander au client d'être bêta-testeur, puis mettre à jour cette feuille de route à chaque jalon important. Priorité absolue : partage Samsung ↔ autre Android fonctionnel et sécurisé, gratuit, avec tournoi fictif d'abord.

**Phrase de reprise recommandée :** « Reprends MILFT Tournois après la MAJ 74. Lis la feuille de route GitHub. Je suis dans Firebase, compte MILFT, projet MILFT Tournois Partage, devant le bouton + Ajouter une application. Guide-moi depuis mon Samsung une étape à la fois. Ne recommence pas les tests validés et ne touche pas à la production V1.1 ni à mes archives. »


## Avancement confirmé le 20/11/2026 à 18 h 21 (Paris) — après reprise du chat
- Capture Samsung : étape « Enregistrer l'application » terminée (coche bleue) dans l'assistant d'ajout Firebase Web.
- Configuration publique affichée par la console : `projectId = milft-tournois-partage-55e44`. L'application Web est désormais enregistrée ; nom proposé au jalon précédent : `MILFT Tournois Partage Web` (non relu dans la capture finale).
- Étape courante : « Ajouter le SDK Firebase » ; l'utilisateur n'a pas à installer npm sur Android, ni à recopier le code de la capture. Prochaine action : terminer l'assistant et revenir à la console du projet.
- **Non encore confirmé** : forfait Spark, Authentication Google, domaine autorisé, création RTDB et ses règles, valeur `databaseURL`. La configuration GitHub `v2/firebase-config.mjs` reste volontairement désactivée ; aucun échange réel et aucune donnée existante migrée.

## Confirmation sur capture Samsung à 18 h 23 (heure de Paris)
- Vue d'ensemble du projet **MILFT Tournois Partage** affichée, application Web visible sous le nom du projet.
- Badge **Forfait Spark** clairement visible : gratuité confirmée pour le projet à ce stade. Ne pas sélectionner « Mettre à niveau ».
- Étape suivante demandée à l'utilisateur : ouvrir le menu « Sécurité » pour accéder au paramétrage d'Authentication. Une manipulation à la fois ; ne pas modifier le code ni déployer de règles tant que le service RTDB réel n'est pas créé et vérifié.

## Capture Samsung du 20/11/2026 à 18 h 29 — Google Authentication activée
- Dans le projet Firebase `milft-tournois-partage-55e44`, la page **Authentication > Méthode de connexion** affiche le fournisseur **Google** avec le statut vert **Activé** (capture utilisateur).
- Au cours de la configuration, l'adresse e-mail d'assistance du compte club a été sélectionnée et le nom public du projet personnalisé ; statut d'enregistrement confirmé par le retour à la liste des fournisseurs.
- **À faire immédiatement** : ouvrir **Authentication > Paramètres > Domaines autorisés**, y vérifier/ajouter `milft37.github.io`. Ne pas considérer cette autorisation comme acquise avant validation visuelle.
- À suivre : créer Realtime Database Spark, examiner/publier les règles de sécurité V2 avant toute écriture réelle, récupérer la configuration Web complète (dont `databaseURL`) et raccorder le **prototype de validation seul**. Aucun changement V1.1 ou données/archives.

## Capture Samsung du 20/11/2026 à 18 h 36 — domaine GitHub Pages autorisé
- Authentication > Paramètres > Domaines autorisés affiche `milft37.github.io` avec type **Custom**, à côté des trois domaines préexistants `localhost`, `milft-tournois-partage-55e44.firebaseapp.com`, `milft-tournois-partage-55e44.web.app` : **confirmation visuelle de l'autorisation du domaine GitHub Pages**.
- Google est déjà activé dans Authentication (capture 18h29). Aucun service Realtime Database encore créé/confirmé et aucune règle déployée : ne pas considérer le partage réel comme actif.
- Suite : rejoindre **Bases de données et stockage > Realtime Database** depuis le menu du projet, créer une base compatible Spark et sécurisée, puis contrôler et déployer `v2/database.rules.json` **avant le premier essai réel**, récupérer `databaseURL` et les paramètres publics de l'application Web. V1.1 et archives restent intouchées.

## Capture Samsung du 20/11/2026 à 18 h 47 — RTDB créée en mode verrouillé
- L'assistant de création Realtime Database a affiché la région **Belgique (europe-west1)**, puis l'utilisateur a gardé **« Commencer en mode verrouillé »** (`.read: false`, `.write: false`) et appuyé sur **Activer**.
- La capture d'arrivée sur la console **Realtime Database > Données** confirme l'existence d'une base dans le projet **MILFT Tournois Partage**, identifiant Firebase `milft-tournois-partage-55e44`, URL visible : `https://milft-tournois-partage-55e44-default-rtdb.europe-west1.firebasedatabase.app`.
- Forfait **Spark** toujours visible en bas à gauche. Aucune donnée fictive ni réelle insérée.
- **Prochaine manipulation minimale** : ouvrir l'onglet **Règles** pour vérifier les règles réellement en vigueur. Ne pas en déduire leur état sans cette lecture. Le fichier de règles d'essai `v2/database.rules.json` est déjà dans GitHub, mais **non déployé**.
- Après vérification, déployer les règles isolées pour `v2Trials` avec les protections existantes, puis récupérer la configuration Web publique complète, modifier uniquement `v2/firebase-config.mjs` et effectuer un premier essai **strictement fictif**. V1.1, sauvegardes Drive et données locales protégées.

## Capture Samsung du 20/11/2026 à 18 h 48 — RTDB verrouillée confirmée
- Capture **Realtime Database > Règles** : la base active contient uniquement `{"rules": {".read": false, ".write": false}}`, confirmant l'interdiction de lecture et écriture avant installation des règles métier.
- Le fichier GitHub versionné `v2/database.rules.json` (blob `3d571d272a0f17810cda5c788f6a037019eb39c9`) a été relu, avec `.read/.write` racine à `false` et restrictions d'accès `v2Trials`. Aucun déploiement sur Firebase effectué à ce stade.
- Prochaine étape manuelle nécessaire depuis Samsung : transférer l'intégralité de ce fichier JSON depuis GitHub dans l'éditeur des règles Firebase et publier après contrôle, sans modifier la production V1.1 ni importer des données. Le processus doit minimiser les manipulations sur téléphone.

## 20/11/2026 à 19 h 27 — règles compactes V2 publiées (capture)
- L'utilisateur a collé les règles compactes du fichier `v2/database.rules.console-v2-only.json` dans l'éditeur **Realtime Database > Règles**, puis a cliqué sur **Publier**.
- Nouvelle capture Samsung : le bandeau bleu « modifications non publiées » / bouton « Publier » a disparu ; l'éditeur affiche les règles compactes, sans erreur visible. **Publication très probable, mais pas de lecture Firebase directe depuis l'assistant** ; confirmer par essai fictif après configuration du SDK.
- Ce jeu est strictement limité à `v2Trials` ; `.read` et `.write` restent `false` au niveau racine, aucun accès au chemin `tournaments` de la V1.1.
- **Suite immédiate** : récupérer depuis **Paramètres du projet > Général > Vos applications (Web) > Configuration du SDK** la config Web publique complète (`apiKey`, `authDomain`, `projectId`, `appId`) en incluant `databaseURL=https://milft-tournois-partage-55e44-default-rtdb.europe-west1.firebasedatabase.app`. Ne jamais solliciter de secret, jeton ou clé privée. Raccorder seulement le prototype de validation, puis premiers tests réels sur tournoi fictif.
