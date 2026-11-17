# MILFT Tournois V1.1 — GO / NO-GO opérationnel, MAJ 52
**Établi le 17 novembre 2026. DOCUMENT DE PRÉPARATION — AUCUNE MISE EN PRODUCTION EXÉCUTÉE.**

## Décision actuelle : NO-GO pour une mise en service immédiate
L'application et son paquet technique sont prêts pour les vérifications finales, mais la publication ou la restauration des données réelles ne sont **pas autorisées** par le GO de finalisation. La production ne contient aujourd'hui qu'une page de préparation.

### Sources figées et éléments techniques vérifiés
| Élément | Référence contrôlée |
|---|---|
| Dépôt de validation, documentation | `MILFT37/milft-tournois-validation` — main après MAJ51 `3c467624f7ee93b964463e270dc6771e11767b17` |
| Dépôt de production, à ne pas modifier sans GO spécifique | `MILFT37/milft-tournois` — main `3174eb8e707a16f71351f8a124e1da8a7f69e386` |
| Paquet de production **non publié** | branche figée `candidate-v1.1-privacy-empty-state-2026-11-17-d7c2a863`, commit `d7c2a86387888d48a0e6d1d02a54ca65310a96da` |
| Fichier principal du paquet | `MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html` |
| Fichiers à publier avec autorisation | `manifest.production.webmanifest`, deux icônes PNG 192/512, `index.production.html` **à servir sous le nom index.html** |
| Recette automatisée du paquet final après message de première utilisation | Chrome Windows `44069816899` **SUCCESS** ; WebKit tactile `44069816966` **SUCCESS** |
| Validation publique actuelle sans annuaire préchargé | commit `df734356d628490239fa8933c2f6a2697148c21a`, Pages `44067222827` **SUCCESS** avec contrôle des octets ; huit workflows liés tous **SUCCESS** |

### Données du championnat : non négociable
- Dernière sauvegarde de référence connue : **12 novembre 2026**, conservée privée. La V2 corrigée contient **5 événements métier** (4 en cours, 1 archivé), répartis en **7 objets techniques**, dont poules + A + B du même événement. Ne jamais afficher « 7 tournois » comme 7 compétitions indépendantes.
- Les **4 événements déjà visibles avant importation** dans les liens de validation peuvent simplement être récupérés du stockage existant sous `milft37.github.io`. Le V de la recette Android ne prouve **pas** un import depuis un état vierge. Les tests automatisés de ce cas sont verts, mais ne deviennent pas des tests physiques.
- Avant une éventuelle bascule : exporter depuis le **profil Chrome habituel** et conserver le JSON hors du navigateur. Contrôler sa fraîcheur, le nombre d'événements, les résultats récents et les attributions de tables. Ne pas présumer que la V2 du 12/11 reste à jour après la séance du jeudi **19/11/2026**.
- Ne pas vider les données du navigateur habituel. Restaurer dans le nouveau stockage uniquement sur décision explicite, après comparaison ; vérifier la persistance après rechargement puis réexporter une copie.
- La future application utilise des **clés de stockage séparées** de la validation pour les tournois, le thème, la simulation, les préférences d'avancement et IndexedDB. L'index de production pointe vers un HTML précis. Aucun transfert automatique entre ces clés n'est prévu.
- Le mode privé sert à une recette et **ne convient pas** comme conservation longue durée. La sauvegarde JSON doit rester hors du navigateur.

### Audit de confidentialité complémentaire (MAJ52)
- **Validation :** les cinq fichiers HTML présents sur `main` ont été nettoyés de l'annuaire préchargé (MAJ50), et Pages a déployé les deux fichiers concernés ; aucune sauvegarde nominative JSON n'a été publiée.
- **Production :** les **cinq anciennes pages de test HTML** présentes dans `MILFT37/milft-tournois` contiennent encore l'annuaire de référence et des noms. Elles sont séparées de la simple page d'accueil de production mais restent des fichiers accessibles dans le dépôt public. Les fichiers :
  - `MILFT_Tournois_V1_1_GITHUB_TEST_RESTAURATION_TABLES_2026-11-02.html`
  - `MILFT_Tournois_V1_1_TEST_HTTPS_Drive_2026-11-02.html`
  - `MILFT_Tournois_V1_1_TEST_HTTPS_Drive_CORRECTIFS_2026-11-02.html`
  - `MILFT_Tournois_V1_1_TEST_HTTPS_Drive_ERGONOMIE_2026-11-02.html`
  - `MILFT_Tournois_V1_1_TEST_ISOLE_SANS_ECRITURE_DRIVE_2026-11-02.html`
- **Action conditionnée :** intégrer leur nettoyage ou retrait au plan autorisé de production, sans changer les clés ou réécrire les résultats. Le GO technique actuel **n'autorise pas** une modification du dépôt de production.
- **Historique :** la correction des branches actives n'efface pas les commits précédents, branches figées, liens directs, copies ni caches. Une éventuelle purge de l'historique public exige un arbitrage séparé ; ne pas réécrire des références Git sans autorisation.

### Préconditions avant passage GO
1. **Code** : vérifier que les artefacts publiés sont strictement ceux de la candidate figée, hormis les noms de fichiers de l'index et du manifeste prévus. Les tests de conformité Chrome/WebKit sont acquis si le code reste identique.
2. **Navigateurs physiques** : PC **Windows 11 / Chrome** à tester une seule fois ; **Safari iPhone** si disponible. WebKit simulé et Chrome Windows Server ne remplacent pas l'examen physique. Ne pas répéter Android en bloc. Documenter explicitement un éventuel report de ces contrôles.
3. **Sauvegarde** : JSON **fraîchement exporté** du championnat courant, conservé hors navigateur et comparé à la référence précédente.
4. **Confidentialité** : décider du sort des cinq anciennes pages publiques du dépôt de production et documenter le risque historique résiduel.
5. **Autorisation** : obtenir un **« GO mise en production » explicite et distinct** avant toute écriture dans `MILFT37/milft-tournois` ou transfert vers le stockage du navigateur habituel.

### Procédure autorisée ultérieurement (non exécutée)
- Relever et conserver le commit de production antérieur, sans supprimer les anciennes données du navigateur.
- Préparer dans un arbre de publication strictement limité : HTML V1.1 figé, index propre, manifeste cohérent, icônes valides, et traitement approuvé des anciens HTML de test.
- Avant push, vérifier qu'aucun JSON privé, aucune liste nominative préchargée et aucune clé locale commune avec la validation ne figurent dans les fichiers servis.
- Publier, contrôler HTTPS/Pages, manifest/index, puis faire une **recette isolée** sans effacer de profils existants.
- Après contrôle du JSON frais, importer volontairement les données avec les confirmations requises, vérifier événements/rencontres/scores/manches et réexporter.
- Retour arrière : rétablir le commit et les fichiers publics précédents **sans effacer localStorage/IndexedDB**, conserver les sauvegardes hors navigateur et réconcilier tout score produit dans l'intervalle.

### Reste réellement à faire par l'utilisateur
Une session physique PC Windows 11, une éventuelle session Safari iPhone, l'export actuel avant la bascule, et la décision expresse concernant la production. Rien n'impose de recommencer les validations automatisées vertes à code inchangé.

**Portée de ce document :** procédure et bilan, non autorisation de publier ni de manipuler les données.
