# MILFT Tournois V1.1 — MAJ 63 — Production officielle publiée et contrôlée

Date : 19 novembre 2026. Référence : MAJ 47–62 et protocole de reprise autonome.

## Autorisation expresse
« GO mise en production MILFT Tournois V1.1. J'autorise le déploiement de la candidate validée sur le site officiel, sans restauration automatique, sans écrasement des données ou archives, et avec les sauvegardes automatiques désactivées par défaut. »

## Publication réelle sur GitHub
- Dépôt officiel `MILFT37/milft-tournois`, branche `main`.
- Avant : `76a19f14a0af8a0ef2bf2154e7918004545d9214`.
- Après : **`77da71bb97978939feff21e650db608a8f621e74`**, commit de publication atomique incluant HTML complet V1.1, nouveau module Drive, service worker PWA, test PWA adapté, nouveau test de release et protocole de publication.
- La candidate validée provient de `MILFT37/milft-tournois-validation/candidate-production-v11/` ; son HTML publié a le blob SHA `79be6c8a0c6a50d770485621370b364e070a1b4b` et son module Drive `64888b83804a2ebb6a1b6981cce57d9885315bb6`.
- `index.html`, manifeste et icônes de production conservés **inchangés** car leurs blobs correspondaient déjà à la candidate.
- Fichiers privés (sauvegarde club, JSON, données joueurs) **non intégrés au dépôt public**.

## Contrôles de production réussis
- GitHub Actions « Verification PWA production V1.1 » **n°6, run `44545242631` : completed / SUCCESS**, sur le commit publié `77da71bb...`. Test hors connexion/cache PWA à 6 ressources, vérification des scripts, des clés locales et du consentement Drive.
- GitHub Pages « pages build and deployment » **n°19, run `44545242201` : completed / SUCCESS**, jobs `build`, `deploy`, `report-build-status` tous SUCCESS sur le même commit.
- Vérification post-déploiement des contenus GitHub : le HTML officiel référence le module Drive versionné `20261119-prod-candidate-200-01` et présente « SAUVEGARDE LOCALE ACTIVE • Google Drive facultatif ». Le module production contient 200 sauvegardes automatiques/jour/appareil, les choix 5/10/15/30/60 minutes, 15 minutes par défaut et `auto=false` au démarrage.
- Contrôles candidate validés avant promotion : parité du moteur de tournoi et de l'interface sur 3 222 lignes, navigateur Chromium, moteur WebKit/Safari, sauvegarde et restauration synthétiques (pas de compte Google réel).
- Le contrôle GitHub Pages confirme le déploiement. Les outils disponibles n'ont pas permis une lecture HTTPS indépendante directe du site public (requête web non accessible) ; ne pas prétendre à un test physique de bout en bout du lien officiel après publication.

## Intégrité des données
- **Aucune restauration automatique**, aucun transfert entre stockage de validation `milft_iso_...` et stockage production `milft_prod_v11_20261117_...`. L'application de production peut donc afficher zéro joueur/tournoi sur un navigateur où elle n'avait pas encore de données. Ce n'est pas une preuve de perte de la sauvegarde source.
- Sauvegarde réelle du Samsung du 19/11/2026 à 11:55 confirmée en MAJ59 : **42 joueurs, 7 objets techniques de tournoi**, fichier `MILFT_TOURNOIS_manuel_2026-11-19T10-55-22-532Z_f933b9ad-5e9.json`. **Jamais restaurée automatiquement** et toujours à préserver.
- Archives Drive nouvelles et anciennes inchangées ; l'archive fictive du 18 novembre reste protégée contre la restauration.
- Google Drive : connexion volontaire, création d'un nouvel instantané après confirmation, sauvegardes automatiques désactivées par défaut. Activation seulement après première sauvegarde réussie et confirmation explicite. Pas de synchronisation en temps réel entre PC et Samsung (V2.0).
- Les clés de production sont conservées et le service worker PWA passe à un nouveau cache sans purger `localStorage` ni IndexedDB.

## Site et étape utile suivante
- Accueil officiel : `https://milft37.github.io/milft-tournois/`
- Application directe : `https://milft37.github.io/milft-tournois/MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html`
- Sur Samsung, ouvrir le lien **en Chrome normal** ; constater que le site s'affiche. **Ne pas importer une archive tant que le contenu local de production n'est pas identifié et comparé à la sauvegarde du 19/11.**
- Pour récupérer les données de validation sur production : exiger une décision explicite sur la restauration de l'archive réelle, effectuer un aperçu des quantités et une sauvegarde de secours des éventuelles données existantes avant de confirmer le remplacement. Aucun test supplémentaire de sauvegarde réelle requis.
- Les sauvegardes automatiques restent désactivées tant que l'utilisateur ne les active pas volontairement. Les mises à jour du code ne remplacent pas une synchronisation entre appareils.

## Reprise
Ne pas redéployer ou relancer les validations déjà SUCCESS. En cas de problème isolé Android, se concentrer sur le nouveau domaine de stockage et la session Chrome utilisée, sans effacer les données ; conserver le commit de retour arrière `76a19f14...`. Mettre à jour cette feuille de route après toute opération de migration de données.
