# MILFT Tournois — MAJ 75 — Firebase réel raccordé au prototype V2 (20/11/2026)

## Autorisation et état de reprise
- Suite du GO initial pour **le prototype de partage fictif isolé**, sans modification de la production V1.1.
- Référence historique : `docs/MILFT_TOURNOIS_MAJ74_REPRISE_FIREBASE_COMPTE_CLUB_2026-11-20.md`.
- Projet Firebase **MILFT Tournois Partage**, identifiant `milft-tournois-partage-55e44`, créé sous le compte du club, formule **Spark gratuite** confirmée par capture utilisateur.
- Application Web `MILFT Tournois Partage Web` enregistrée, Authentication **Google activée**, domaine `milft37.github.io` autorisé.
- Realtime Database en Belgique (`europe-west1`) : `https://milft-tournois-partage-55e44-default-rtdb.europe-west1.firebasedatabase.app`.
- Règles compactes `v2/database.rules.console-v2-only.json` collées puis publiées par l'utilisateur dans Firebase le 20/11 ; disparition du bandeau « modifications non publiées » sur capture. **La publication n'a pas encore été auditée par lecture API directe ; validation pratique encore nécessaire.**

## Modification GitHub MAJ 75
- `v2/firebase-config.mjs` contient maintenant **uniquement les paramètres publics** reçus par l'utilisateur, avec le `databaseURL` de la console. Aucune donnée personnelle, clé privée, compte de service ou jeton n'est publié.
- `v2/mobile-demo.html` annonce correctement le raccordement du projet Spark et le caractère **strictement fictif** des matchs.
- `tests/v2-mobile-demo-browser.cjs` utilise un module `firebase-config.mjs` fictif à `null` uniquement pendant le test local de non-réseau, pour **ne jamais contacter Firebase réel** pendant les tests historiques de navigateur.
- `.github/workflows/milft-pages-deploy.yml` contrôle l'identité du bon projet et l'adresse RTDB au lieu d'exiger `firebaseConfig=null`. Vérification du périmètre `v2Trials`.

## Sécurité et limites impératives
- Le partage réel n'est **pas encore validé sur deux téléphones physiques**. Ne pas le présenter comme disponible pour les tournois du club avant essai réel fictif réussi.
- Seul le prototype `https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html` est activé.
- Toutes les commandes du prototype ciblent `v2Trials/<code>` ; pas de migration, restauration ou accès aux données locales, joueurs, championnats, archives Drive, ni déploiement de la V2 vers `MILFT37/milft-tournois`.
- Préserver tous les tests MAJ 73 déjà validés sans relance inutile. Contrôler **uniquement** les workflows déclenchés par la modification et le déploiement GitHub Pages.

## Étape suivante
Après vérification des nouveaux workflows et de la page publiée : premier essai **match fictif** depuis Samsung, connexion Google, création de salle fictive, puis second Android avec invitation par UID. Si erreur d'authentification ou de permission, contrôler sans toucher aux données réelles ni ouvrir la base au public. Pas de forfait Blaze ni carte bancaire.

## État des workflows au contrôle suivant la MAJ75
- Commit de configuration V2 : `73b6542c22f39cca7bb2b7e2b03bb7c5d0b147a4`.
- Diagnostic GitHub Pages run `44794975631` : **SUCCESS**.
- Simulation partage isolée run `44794975660` : **SUCCESS**.
- Publication GitHub Pages run `44794975877` : **SUCCESS**.
- Tests interface Chromium/WebKit run `44794975727` : en cours au dernier contrôle.
- E2E deux Android avec émulateurs Auth/RTDB run `44794975691` : en cours au dernier contrôle.
- Ne pas présenter ces deux derniers tests comme validés avant leur conclusion ; conserver les tests précédents MAJ73 comme acquis.
