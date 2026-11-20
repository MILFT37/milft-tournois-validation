# MILFT Tournois — MAJ 72 — Test complet deux Android simulés (20/11/2026)

## Périmètre autorisé et garanties
Le GO utilisateur couvre les développements V2 **strictement isolés**, sans migration et sans édition des données V1.1. Priorité : Samsung ↔ autre Android (puis PC / iPhone), 100 % gratuit, avec protection des conflits. Le dépôt officiel `MILFT37/milft-tournois`, les archives historiques Google Drive et les données du Samsung ne doivent jamais être modifiés sans GO distinct.

## Jalons accomplis
1. Vérification de la MAJ 71 : Chromium et Safari WebKit sur l'interface V2 sans configuration — workflow `44747096141` **SUCCESS**. Déploiement Pages validation des fichiers `v2/` : workflow `44747030704` **SUCCESS**.
2. **Identifiant stable de l'appareil** : `v2/mobile-demo.mjs` utilise désormais une clé locale réservée V2 `MILFT_V2_DEMO_DEVICE_ID` à la place du précédent `sessionStorage`; la même portée `tournoi/UID/appareil` est retrouvée après fermeture. La dernière salle fictive est mémorisée uniquement dans `MILFT_V2_DEMO_LAST_TRIAL`. La reprise de la file IndexedDB et la tentative d'envoi lors de la reconnexion sont ajoutées. Commit `4fa15945b5af73d6d6e161a6ad3f5f5792ee0d51`.
3. Tests navigateur supplémentaires de persistance après fermeture d'onglet Android/WebKit dans `tests/v2-mobile-demo-browser.cjs`, commit `6f901bb6339bef28f201659949b525a8d94d25fc`. Workflow **`44747096141` SUCCESS**.
4. Nouveau test d'intégration **de l'interface réelle de démonstration** avec deux contextes Android Chromium simulés, SDK Firebase Web **réel**, Auth et Realtime Database **émulés**, aucun accès aux services réels. Fichiers `tests/v2-mobile-demo-e2e.cjs`, `firebase.v2.browser.emulator.json`, `.github/workflows/v2-mobile-demo-e2e.yml` ; commit de création `88ebcec27940de4cb9c31072cb5a72167460d3f0`.
5. Scénarios couverts : deux identités distinctes authentifiées, création d'une salle de démonstration, refus d'accès initial au non-invité, invitation depuis le propriétaire, lecture de score en direct, protection contre une saisie obsolète alors que l'utilisateur éditait déjà, brouillon conservé en cas de conflit, nouvelle commande hors ligne puis fermeture/réouverture et renvoi, vérification du score accepté et révocation.
6. Les trois premiers runs du nouveau test ont échoué **dans la lecture d'audit final par le test**, alors que le parcours d'interface arrivait jusqu'à la fin. Problèmes identifiés et corrigés : le helper `withSecurityRulesDisabled` ne transmet pas le snapshot directement, et l'instance de test utilisait un autre namespace RTDB que le SDK Web. Commits : `5c0317e6e409a38f03c878614daf08c7a9ba9e10`, `732a4fb7c26f6adecde1b7e528b094ac521a353f`, `397b611d5308f87bc2f8626942af063c76384bf5`.
7. **VERDICT FINAL DU TEST COMPLET : workflow `44755259448` — SUCCESS**, commit `397b611d5308f87bc2f8626942af063c76384bf5`, job `136353183578` **SUCCESS**. L'émulateur RTDB de l'audit lit maintenant explicitement le namespace `demo-milft-v2-71-default-rtdb`, identique à celui des deux navigateurs fictifs.

## Ce qui est réellement disponible
- La page `https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html` est sur **GitHub Pages de validation**, séparée de l'application officielle.
- Elle demeure volontairement désactivée tant que `v2/firebase-config.mjs` contient `firebaseConfig = null`. Elle ne synchronise donc **pas encore deux appareils physiques** et n'accède à aucune donnée réelle.
- Les règles Firebase de démonstration `v2/database.rules.json` ont déjà réussi leur suite dédiée dans l'émulateur (MAJ71 `44745186062` SUCCESS).
- La MAJ72 apporte désormais une preuve E2E de **l'interface complète**, pas seulement des commandes fictives Node.

## Verrou réel à lever ensuite
Le plugin officiel Firebase proposé dans ChatGPT a été vérifié le 20/11/2026 et reste **non installé**. Suggestion déjà envoyée le même jour : **ne pas la répéter**. La connexion demande une action explicite de l'utilisateur, depuis son Samsung. Alternativement, création manuelle d'un projet Firebase **Spark (gratuit, sans facturation)** sous son compte Google.

Après connexion ou configuration du projet, il faudra : créer/inspecter projet Firebase réel neuf, activer Auth Google, autoriser le domaine `milft37.github.io`, créer RTDB et **publier les règles verrouillées avant toute donnée**, recueillir la configuration Web publique de Firebase et renseigner `v2/firebase-config.mjs`, puis tester le match **strictement fictif** sur deux vrais Android. Ne demander **aucune clé privée, mot de passe ou jeton**. N'activer aucun forfait payant. Les imports de joueurs, tournois V1.1 et archives Drive restent interdits.

## Prudence technique
- Le prototype n'est pas encore le moteur complet de compétition MILFT : seuls les scores d'un match fictif sont réellement échangés par le SDK, pas la gestion globale des tables, tableaux, classements, Championnat ou Course aux points.
- Les conflits sont conservés dans IndexedDB mais la résolution manuelle reste à concevoir ; le code de salle n'accorde aucun droit en dehors des règles serveur.
- L'automatisation teste deux navigateurs **simulés**, pas une connexion Firebase réelle entre deux téléphones physiques. Ne jamais annoncer le partage utilisable par les membres du club avant ce test et sa validation.
- La V1.1 officielle est conservée intégralement ; **ne pas refaire ses tests historiques** pour une modification V2 qui n'y touche pas.

## Reprise automatique
Repartir de cette MAJ72, statut GitHub Actions E2E **SUCCESS** run `44755259448`, vérifier seulement les nouveaux commits concernés et l'accès Firebase, puis avancer vers le premier essai fictif réel. Limiter les interventions utilisateur aux autorisations Firebase indispensables depuis Samsung.
