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
**Tests GitHub Actions à confirmer**. Inscrire ici commit et verdicts avant de déclarer MAJ94 validée.
