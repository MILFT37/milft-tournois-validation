# MILFT Tournois V2 — MAJ94 — Interface multi-match en émulation exclusivement

**23 novembre 2026 — GO utilisateur.** Reprise depuis `docs/MILFT_TOURNOIS_MAJ93_CANDIDAT_REGLES_MULTIMATCH_EMULATEUR_2026-11-23.md`, validation de sécurité MAJ93 acquise.

## Architecture et isolation
- Ajout de **nouveaux fichiers autonomes**, `v2/mobile-multimatch-emulator.html` et `v2/mobile-multimatch-emulator.mjs`, sans toucher au démonstrateur public `v2/mobile-demo.html` et sans modifier l'application officielle V1.1.
- La nouvelle interface **ne charge ni les identifiants du projet Firebase réel ni les modules CDN de production**. Les deux modules `multimatch-emulator-sdk-test-only.mjs` et `multimatch-emulator-config-test-only.mjs` sont fournis *uniquement* par un serveur Playwright sur 127.0.0.1 et dirigent toutes les opérations vers les émulateurs locaux. Ces modules n'existent pas sur GitHub Pages.
- La page refuse l'initialisation hors des noms d'hôte locaux. Elle ne figure pas dans la liste des fichiers publiés par `.github/workflows/milft-pages-deploy.yml` ; aucun déploiement de règles réelles n'est prévu.
- Réutilisation du composant IndexedDB V2 précédemment validé, avec **nom de base distinct** pour l'essai multi-match. Aucun effacement ni migration des bases existantes.

## Parcours utilisateur simulé
- Le propriétaire crée une salle fictive (match initial `demo`), puis un autre match `courtB` via les règles candidates MAJ93.
- Un second compte distinct est autorisé comme `editor` pour saisir au PC. Sélection de match explicite via liste ; chaque score local est rattaché au match choisi. La file affiche les attentes/conflits par match et conserve les brouillons séparément.
- Samsung et PC peuvent saisir simultanément **deux matchs différents**, chacun avec sa version distante indépendante.
- Si le PC perd sa connexion et enregistre un résultat local sur un match que le Samsung met à jour, le score du PC est conservé comme conflit après reconnexion ; l'autre match reste modifiable. Aucun appareil maître, aucun verrou global.
- Passage temporaire `editor → viewer` et révocation doivent immédiatement empêcher la saisie. Aucun brouillon supprimé.

## Tests obligatoires
- Workflow dédié : `.github/workflows/v2-mobile-multimatch-emulator.yml`.
- Deux contextes navigateur Playwright (Samsung mobile et PC), **Auth et Realtime Database émulés exclusivement** avec règle candidate ; deux UID distincts ; deux scores simultanés, versions et auteurs indépendants ; panne réseau du PC ; conflit du même match ; autre match continuant normalement ; révocation et lecture seule.
- Aucune requête vers un hôte externe autorisée par le serveur de test. Aucun contact avec Firebase ou Google Drive réels.
- Préserver les validations MAJ75–93 sur fichiers inchangés. Ne pas relancer inutilement les tests de la V1.1, de sauvegarde Drive ou des règles déjà validées.

## Limites maintenues
- Les règles candidates `v2/database.rules.multimatch-candidate.emulator.json` **ne sont pas déployées sur Firebase réel** ; l'interface nouvelle est réservée à l'émulation, pas à l'usage en compétition.
- L'essai sur **deux appareils physiques et deux comptes Google distincts** reste à faire après les validations nécessaires.
- Production V1.1, tournois, championnats, données et archives Drive intouchés. Firebase Spark gratuit, règles existantes et comptes réels inchangés.
- **Aucune intervention Samsung** pour cette étape.

## Clôture
**MAJ94 VALIDÉE SUR ÉMULATEURS — 23 novembre 2026. AUCUN déploiement Firebase réel ni Pages.**

- Commit initial des nouveaux fichiers isolés, test automatisé et workflow : `839ead3417b5eca435c079945484f0aa9aa89554`.
- Premier test E2E `45154173294` : **FAILURE de test**. Playwright attendait la visibilité d'un élément `option` non visible par définition ; correction du scénario `03c384a24cb12039aa1e412012dd0d15f8ccb830`.
- Deuxième test `45154463801` : **FAILURE** après création des matchs. Diagnostic ajouté dans le scénario `6c9b28ba7f4af110cf402cc3e883a4e89463152b`.
- Troisième test `45154789285` : **FAILURE**, cause identifiée : la confirmation asynchrone de création de `courtB` remettait ce match au premier plan après une sélection manuelle de `demo`. Le score 5–3 était donc dirigé vers le mauvais match fictif dans le test. **Correction applicative réelle** `480ec2241a19c466095cbe0870b9e2f271ae2929` : ne plus écraser le match sélectionné pendant la réponse asynchrone.
- **E2E deux appareils simulés avec Firebase Auth/RTDB Emulator, workflow `45155181901` : SUCCESS.** Deux identités indépendantes, matchs `demo` et `courtB` ; saisies simultanées 5–3 et 7–6 sur leurs matchs respectifs, versions distinctes ; panne réseau du PC, conflit 9–4 contre 8–5 sur `demo` sans écrasement ; `courtB` continue avec 6–4 ; lecture seule, retour des droits et révocation testés.
- **Simulation de partage V2 préexistante, workflow `45155182052` : SUCCESS.** Tests MAJ75–93 sur composants inchangés non répétés manuellement.
- Vérification du dépôt après succès : le dernier commit `480ec224` change **uniquement** `v2/mobile-multimatch-emulator.mjs`. Les règles candidates, la démonstration publique `v2/mobile-demo.mjs` et les règles réellement publiées `v2/database.rules.console-v2-only.json` sont inchangées.
- Le nouveau module `v2/mobile-multimatch-emulator.mjs` et sa page test **ne figurent pas dans la liste de déploiement GitHub Pages**. Le workflow de la MAJ94 ne publie rien vers Firebase réel : il fournit les modules d'authentification et de base **uniquement via un serveur local émulé**.
- Production V1.1 officielle, tournois, championnats, archives Drive, règles Firebase réelles, comptes et forfait Spark intouchés.
- **Aucune action sur Samsung.** Test physique avec deux appareils et deux comptes Google distincts encore non effectué.
- **Reprise recommandée MAJ95 :** renforcer les tests d'aller-retour hors connexion sur plusieurs matchs et préparer une version d'essai compatible avec les règles candidates, toujours **sans publication sur Firebase réel** tant qu'une autorisation séparée n'a pas été donnée.
