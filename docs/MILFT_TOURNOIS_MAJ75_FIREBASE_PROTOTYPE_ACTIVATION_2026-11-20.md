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

- Contrôle complémentaire : interface démonstration Android Chromium/WebKit run `44794975727` : **SUCCESS**. Seul l'E2E deux Android run `44794975691` n'avait pas encore conclu au dernier relevé.

## Vérification finale des cinq workflows et ouverture Samsung
- Après publication du commit `73b6542c22f39cca7bb2b7e2b03bb7c5d0b147a4`, les **cinq** workflows GitHub Actions ont conclu **SUCCESS** : Diagnostic Pages `44794975631`, Simulation V2 `44794975660`, Publication Pages `44794975877`, Chromium/WebKit `44794975727`, E2E deux Android sur émulateurs Firebase `44794975691`.
- Capture Samsung du 20/11/2026 à 19 h 42 : le prototype `https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html` affiche la page V2 actualisée, le texte indiquant Firebase Spark, et un bouton **Connexion Google** actif. Affichage initial « Non connecté » normal.
- **Prochaine étape manuelle** : toucher « Connexion Google » sur Samsung et choisir le compte du club, puis constater l'état de connexion avant toute création de match fictif. Ne pas supposer le partage réel fonctionnel sans test et contrôle du résultat.

## 19 h 49 — première connexion Google réelle réussie sur Samsung
- Capture Samsung de l'utilisateur : page publique `/v2/mobile-demo.html` affiche en vert « Connecté. Créer un match fictif ou saisir un code de salle. » ; bouton « Déconnexion » affiché et UID Firebase attribué au compte connecté. Cela confirme le premier succès **d'authentification Google réelle** depuis le Samsung.
- La capture ne prouve pas à elle seule l'adresse e-mail du compte effectivement choisi ; ne pas la déduire de l'UID.
- **Prochaine manipulation utilisateur :** appuyer sur « Créer un match fictif » puis envoyer la capture du résultat ; la permission effective d'écriture dans la RTDB reste à valider. Aucun changement de production ou de données historiques.

## Première création réelle d'un match fictif — capture Samsung 19 h 49
- Sur le prototype V2 public, sous l'identité Firebase authentifiée, clic sur **Créer un match fictif**. Capture confirme l'apparition d'un code de salle `trial...` (non reproduit dans la feuille de route), du rôle **Propriétaire** et du statut **Écoute Firebase active**.
- Match initial affiché **0–0**, **version distante 0**, dernier événement `seed`, file locale **0 en attente / 0 en cours / 0 conflit / 0 refusé**. Il s'agit de la première preuve visuelle que la création de salle fictive et sa lecture temps réel sur Firebase fonctionnent depuis le vrai Samsung.
- Prochaine étape : enregistrer un score de test **5–3**, confirmer la **version distante 1** et l'absence d'erreur ; ensuite tester le partage avec un second Android et une seconde identité autorisée. Ne pas considérer la synchronisation inter-appareils comme validée avant cet essai.
- Aucun transfert de tournois V1.1, joueurs, championnats ou archives Drive.
