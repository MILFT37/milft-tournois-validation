# MILFT Tournois — MAJ76 — Parité des règles Firebase et ergonomie d'invitation

**20 novembre 2026.** Reprise après validation de la connexion Firebase Spark et du score fictif 5–3 sur le Samsung (MAJ75).

## Objectifs validés
- Poursuivre l'amélioration du prototype V2 sur GitHub sans exiger immédiatement de deuxième appareil ; aucune modification de la production V1.1 ni des données, tournois, classements et archives Google Drive.
- Vérifier **le fichier compact réellement publié** dans la console Firebase du club : `v2/database.rules.console-v2-only.json`, et non uniquement les règles complètes de référence.
- Faciliter l'utilisation mobile au moment du partage et des invitations, sans changer les droits côté serveur.

## Changement de code
- L'émulateur du parcours E2E navigateur/deux Android utilise désormais le fichier compact V2 (`firebase.v2.browser.emulator.json`).
- `tests/v2-mobile-demo-e2e.cjs` vérifie avant le test que les autorisations racine sont interdites et que tout le sous-arbre `v2Trials` de la version compacte est **strictement identique** à celui des règles complètes de référence. Le test conserve les parcours existants création, refus non invité, autorisation, score simultané, conflit, hors-ligne, reprise et révocation. **Aucune connexion au Firebase réel dans GitHub Actions**.
- `v2/mobile-demo.html` affiche maintenant les confirmations de copie **auprès du code/lien** et de l'invitation/révocation **auprès des boutons**. Le deuxième appareil peut être un autre Android ou un PC Chrome, avec un **compte Google différent**.
- `v2/mobile-demo.mjs` produit ces confirmations locales tout en gardant les messages globaux et les contrôles d'autorisation existants. Ces retouches ne changent pas la gestion de scores ni les sauvegardes.
- Le workflow E2E est déclenché si les règles compactes changent.

## État opérationnel
- Les cinq workflows MAJ75 étaient **SUCCESS** au 20/11/2026 : Pages, navigateur Chromium/WebKit, simulation V2, E2E Firebase sur émulateurs, diagnostic Pages.
- Samsung réel : Google Auth OK ; création de salle `v2Trials` OK ; score distant **5–3**, version **1**, file **0** (capture).
- **Test réel avec deux appareils/identités distinctes non encore effectué** : à réaliser quand un autre Android ou un PC est disponible, sans répéter les validations Samsung déjà acquises.
- Après ce commit, relever les seuls nouveaux workflows déclenchés et consigner leurs résultats dans cette feuille. Ne déclarer la nouvelle MAJ réussie qu'après les vérifications concernées.

## Interdictions permanentes
- Ne pas changer `MILFT37/milft-tournois` (production), ne pas restaurer/importer/transférer des données V1.1 ou archives Drive.
- Ne pas augmenter le forfait Firebase Spark, ne pas demander de carte bancaire, ne pas modifier les règles dans la console sans motif et accord.

## Clôture des contrôles MAJ76
- Commit fonctionnel : `505769ecc5c2dfa1595a3ecde8e177e3eef6ac38`.
- Workflow simulation partage V2 `44806065006` : **SUCCESS**.
- Workflow interface navigateur Android Chromium/Safari WebKit `44806064909` : **SUCCESS**.
- Workflow complet deux Android + SDK Firebase sur émulateurs + règles **compactes** `44806064980` : **SUCCESS**. Aucun accès au Firebase réel pendant les tests.
- Premier déploiement GitHub Pages `44806065004` : **FAILURE de récupération d'artefact GitHub** ; le packaging et l'upload avaient réussi, mais deploy-pages ne retrouvait pas l'artefact immédiatement. Relance du même run en tentative 2 : GitHub voyait deux artefacts de nom identique. **Échec lié au workflow d'artefact, pas au code métier.**
- Correction de publication dans `.github/workflows/milft-pages-deploy.yml`, commit `ace9bd0813d671ec7f4f24935466556f56fe0ceb` : attendre que l'API de GitHub expose exactement un artefact Pages avant l'appel de déploiement.
- **Nouveau run propre** GitHub Pages `44806300946` : **SUCCESS**. Diagnostic de publication `44806300947` : **SUCCESS**. La nouvelle MAJ76 est donc **publiée et validée côté workflows**.
- **Pas encore validé physiquement entre deux appareils** : inviter une deuxième identité distincte puis vérifier score en direct et révocation quand un autre Android ou PC sera disponible. Ne pas refaire la connexion/écriture Firebase Samsung déjà acquises.
- Production V1.1 officielle et archives Google Drive : aucune modification. Aucun changement du forfait Spark ni des règles déjà publiées dans la console Firebase.
