# MILFT Tournois — MAJ 72 — Reprise fiable des modifications en attente (20/11/2026)

## Autorisation et priorité
GO utilisateur après MAJ71 pour poursuivre au plus vite le partage Samsung ↔ autre Android, PC et iPhone, **gratuit**, sans toucher à ses vrais tournois. GO couvert : travaux V2 isolés et tests, pas transfert/migration des données du club ni modification de la V1.1 officielle.

## Point de reprise vérifié
MAJ 71 : `docs/MILFT_TOURNOIS_MAJ71_PROTO_PARTAGE_MOBILE_2026-11-20.md`. Interface dédiée `https://milft37.github.io/milft-tournois-validation/v2/mobile-demo.html`, déjà publiée sur GitHub Pages validation. `v2/firebase-config.mjs` contient `firebaseConfig = null` : **la connexion et le partage réels restent inactifs**. Firebase SDK ne peut agir sur aucun projet réel à ce stade.

## Correction livrée
Un problème potentiel de reprise a été identifié : le prototype créait auparavant un identifiant d'appareil en `sessionStorage`. Après fermeture complète du navigateur, une nouvelle session pouvait recevoir un nouvel identifiant et ne plus retrouver les commandes IndexedDB liées au précédent.

- `v2/mobile-demo.mjs` (commit `4fa15945b5af73d6d6e161a6ad3f5f5792ee0d51`) : identifiant d'appareil désormais **stable en localStorage V2 isolé**, `MILFT_V2_DEMO_DEVICE_ID`, vérifié dès l'initialisation. Le dernier code de salle est aussi mémorisé uniquement dans `MILFT_V2_DEMO_LAST_TRIAL`.
- Lors d'un accès à un essai autorisé, la file locale est relue et un renvoi est tenté en cas de connectivité ; renvoi également à l'événement `online`. Les commandes en conflit et refusées ne sont **pas** effacées.
- Aucun changement aux clés locales de la V1.1, aux vrais joueurs, scores, classements, tournois ou archives Google Drive.
- `tests/v2-mobile-demo-browser.cjs` (commit `6f901bb6339bef28f201659949b525a8d94d25fc`) : vérifie la stabilité de l'identifiant V2 à travers rechargement et fermeture/réouverture de page ; conservation du brouillon IndexedDB ; aucun appel extérieur lorsque Firebase n'est pas configuré.
- Tests Chromium Android simulé + Safari WebKit workflow `44747096141` **SUCCESS**.
- Publication sur Pages validation avec le nouveau code : workflow `44747030704` **SUCCESS**, y compris contrôle du contenu public publié.
- Régression logique des commandes V2 : `44747030715` **SUCCESS**.

## État de la connexion Firebase
Le plugin officiel **Firebase** a été suggéré au client lors de la MAJ71 et a été recherché à nouveau ce jour : statut `installed:false` (20/11/2026). **Ne pas suggérer une nouvelle fois dans les 7 jours** ; l'utilisateur doit accepter l'installation/connexion proposée. Aucun outil Firebase connecté n'est actuellement disponible. Il est donc impossible d'accéder au projet Firebase privé du club ou d'en créer un dans son compte à ce stade.

## Suite minimale pour parvenir au premier partage réel
1. L'utilisateur connecte l'intégration Firebase précédemment proposée dans ChatGPT, ou crée volontairement un projet Firebase **Spark sans facturation** depuis son Android. Ne demander aucun mot de passe, code OAuth, jeton ou clé privée.
2. Installer les règles sécurisées validées `v2/database.rules.json`, activer Firebase Authentication/Google, autoriser le domaine `milft37.github.io`, initialiser RTDB et l'application Web dans le projet neuf. Aucune archive réelle ne doit être migrée.
3. Renseigner uniquement les paramètres de configuration Web publique (apiKey/authDomain/databaseURL/projectId/appId) dans `v2/firebase-config.mjs` et vérifier que les règles sont en service avant de publier la configuration.
4. Faire un seul essai fictif sur Samsung + autre Android avec même compte, puis deux comptes autorisés, y compris une écriture concurrente, une coupure réseau, une reprise et une révocation. Stopper en cas de divergence.
5. **Le partage des vrais tournois MILFT demande encore un raccordement de tous les formats, du moteur des tables, des matchs, des phases finales et des permissions.** Obtenir un GO séparé avant toute bascule de production ou transfert de données.

## Règle de reprise
Ne pas recommencer les vérifications V1.1 historiques. Vérifier seulement nouveaux commits/actions et poursuivre autonome dans `v2/`. La V1.1 officielle (dépôt `MILFT37/milft-tournois`) reste à `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c`. Les archives et données locales de production restent intactes. L'utilisateur ne doit intervenir depuis son Samsung que lorsque la connexion Firebase ou les essais réels deviennent indispensables.
