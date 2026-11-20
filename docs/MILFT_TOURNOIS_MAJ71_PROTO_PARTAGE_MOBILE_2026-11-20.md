# MILFT Tournois — MAJ 71 — Première interface de partage V2 pour deux Android

**Date : 20 novembre 2026.** GO utilisateur pour poursuivre le partage Android ↔ Android / Android ↔ PC sans interruption inutile. Voir la MAJ 70 : `docs/MILFT_TOURNOIS_MAJ70_V2_PARTAGE_ANDROID_SECURITE_2026-11-20.md`.

## Résultat livré, état réel
- **Page Web V2 isolée publiée sur le site de VALIDATION** : https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html .
- Cette page **n'est pas encore connectée à un projet Firebase réel** : `v2/firebase-config.mjs` contient délibérément `firebaseConfig = null`. Elle affiche donc un état explicite « Projet Firebase non configuré » et ne tente aucune connexion externe.
- **La V1.1 officielle n'a pas été modifiée** (dépôt séparé `MILFT37/milft-tournois`). Aucun joueur, tournoi, score réel, clé locale V1.1 ni archive Google Drive n'a été touché.
- **Aucun transfert de données réelles n'est autorisé** : cette version fonctionne exclusivement avec un seul match fictif de démonstration à deux camps, indépendamment de tous les formats MILFT.

## Implémentation
- `v2/database.rules.json` : nouveau sous-arbre `v2Trials/` séparé ; création de salle uniquement par le propriétaire authentifié, données `demoOnly:true`, contrôles stricts des champs ; membres de type `editor` ou `viewer` autorisés uniquement par le propriétaire ; lecture des matchs limitée aux membres ; mise à jour des manches limitée aux `admin/editor`, avec contrôle de version +1 ; refus d'édition par un membre révoqué, refus de création arbitraire et d'accès à d'autres salles. Commit `15625ea00a29db3d31bd8f7394e94e38021ac7be`.
- `tests/v2-demo-sharing-security.cjs` et workflow Firebase adapté : création, invitation, révocation, scores concurrents, interdiction des actions non autorisées ; workflow `44745186062` **SUCCESS** sur l'émulateur Firebase.
- `v2/mobile-demo.html` : interface mobile-first, connexion Google, création de salle, entrée d'un code de partage, UID affiché pour invitation, droits editor/viewer, résultats fictifs, file d'attente et état des conflits. Commit `87a2f8d04ab76fd6805b3bb90ffd79021e0bf16e`.
- `v2/firebase-config.mjs` : **configuration volontairement vide**, aucun identifiant / secret / jeton. Commit `d92aab8bdd5a580ef5a38949067e3c46ae1a830f`.
- `v2/mobile-demo.mjs` : connexion Google par `signInWithPopup`, SDK Firebase Web 12.6.0 importé seulement si projet configuré, écoute en direct de la manche fictive, transaction RTDB avec version, ajout durable des commandes à `MILFT_V2_DEMO_OUTBOX_20261120`, accusé seulement après confirmation serveur, refus et conflit conservés. Commit initial `38b24593a4bdf71ca21cde00f9cc73dbff8fddcc`.
- Correction anti-écrasement **pendant la saisie** : mémorisation de la version du match au début de l'édition d'un champ de score et conservation du brouillon si un autre Android modifie le match entre-temps. Commit `423737db886c86193a878ea6981bdf5d982655fc`.
- `tests/v2-mobile-demo-browser.cjs` et `.github/workflows/v2-mobile-demo.yml` : tests Chromium mobile et WebKit, page bloquée sans configuration, aucune requête externe, aucune lecture des clés V1.1, conservation IndexedDB après actualisation. Workflow `44745651217` **SUCCESS** ; contrôle après dernière correction `44745953446` **SUCCESS**.
- Déploiement validation uniquement avec quatre fichiers `v2/` dans `.github/workflows/milft-pages-deploy.yml`, commit `a40cd24de68df1492dd9b16926419da75badffed`. Pages validation workflow `44745782720` **SUCCESS**, puis dernière correction `44745953496` **SUCCESS**, avec vérification SHA des fichiers publics.
- Simulations V2 historiques inchangées : workflow `44745953866` **SUCCESS**.

## Fonctionnement prévu lorsque le projet Firebase sera disponible
1. Sur le premier Android : ouvrir le lien de validation, se connecter à Google, créer un match de démonstration, copier le code.
2. Avec le **même compte Google** sur le deuxième Android : ouvrir le lien, se connecter et saisir le même code.
3. Avec **deux comptes Google différents** : le deuxième Android ouvre la page, se connecte et communique son UID Firebase au propriétaire ; le propriétaire l'ajoute comme `editor` ou `viewer`. Le second Android entre le code pour voir/éditer le match selon ses droits.
4. Une modification de manche est enregistrée localement dans une file V2 IndexedDB puis envoyée par transaction RTDB. Un envoi sans confirmation reste en attente ; un conflit n'efface pas le brouillon.
5. **Attention** : l'interface et le moteur réel de MILFT V1.1 ne sont PAS encore branchés. Les poules, tableaux, tables, phases finales, forfaits, classements, championnat ne sont pas encore partagés par cette page.

## Limites et prochaine action concrète
- **Aucun partage réel n'est actif à ce jour** : config Firebase absente volontairement et aucun compte Firebase du club n'a été créé/lié.
- Un plugin Firebase officiel est disponible dans ChatGPT : suggestion de connexion déjà présentée à l'utilisateur. Si elle est connectée, utiliser cette intégration pour créer et configurer un projet **Spark gratuit et sans facturation**, avec son accord et son compte. Ne pas activer Blaze ni fournir de moyen de paiement.
- À défaut, création d'un projet Firebase Spark depuis son Samsung via la console Firebase, activation de Authentication → Google (domaine `milft37.github.io` autorisé), Realtime Database, application Web, puis transmission **uniquement de la configuration Web publique** `apiKey/authDomain/databaseURL/projectId/appId` (pas de mot de passe, jeton ou clé privée) pour remplir le fichier.
- Avant connexion, confirmer que le projet réel est strictement neuf, sans données/archives du club. Installer et vérifier **le fichier de règles validé** dans RTDB avant tout essai réel ; ne pas ouvrir une base sans règles.
- Une fois le projet prêt, tests limités à **un match fictif**, d'abord deux Android avec le même compte, puis comptes distincts et invitation. Valider au navigateur et en cas de conflit/hors ligne. Pas de changement de production V1.1 sans GO spécifique ultérieur.
- Le prototype utilise `signInWithPopup`. Certains navigateurs Android bloquent les fenêtres de connexion : prévoir et tester la solution d'authentification adaptée au domaine déployé si nécessaire, sans relancer les tests V1.1 déjà validés.
- Le Firebase Spark reste soumis à des quotas et sa gratuité n'est pas une garantie d'accès illimité. Aucune facturation activée.
- Le code de salle n'est **pas** un jeton d'accès ; seuls les UID autorisés peuvent consulter/éditer, vérifié par les règles serveur.
- Un conflit est **conservé** dans la file, mais l'interface de résolution manuelle reste à développer avant production. Ne pas supprimer le brouillon automatiquement.

## Reprise entre chats
**Reprendre ici** après MAJ 71, en consultant le résultat GitHub Actions et la disponibilité de Firebase connecté dans ChatGPT. Ne pas recommencer les vérifications V1.1 ni demander de nouvelle sauvegarde Samsung. Les décisions d'autorisation du GO couvrent le prototype isolé ; toute migration de données réelles ou publication sur le site officiel nécessite un GO distinct.
