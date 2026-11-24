# MILFT Tournois V2 — État réel : développement, préparation, essais et intégration

**24 novembre 2026 — correction de lisibilité demandée par l'utilisateur.**
Dernière MAJ technique clôturée : **MAJ113**, commit `402537440869b3dc8f117f0bcf273d6694aa48ca`.

## Attention aux statuts

Une mention **« validée » dans les MAJ95–113** désigne le résultat du **test précis** effectué sur une brique du prototype, généralement avec Firebase Emulator ou sur un banc HTTPS loopback. Elle **ne signifie PAS** que l'application V2 complète est prête, que la connexion Google réelle a été testée ou qu'une intégration officielle est réalisée.

**Utiliser quatre statuts distincts :**
- **Validé sur émulateurs** : une brique technique a passé les tests automatisés.
- **Préparation partielle** : documentation, architecture et précontrôles créés, mais environnement accessible aux deux appareils non disponible.
- **Non réalisé** : fonction, intégration ou essai n'a pas encore été effectué.
- **À valider en réel** : l'essai doit être effectué sur les appareils et services effectivement choisis, après préparation et autorisations requises.

## Tableau de suivi consolidé

| Chantier | État exact au 24/11/2026 | Ce qu'il reste |
|---|---|---|
| Synchronisation bidirectionnelle de plusieurs matchs et deux identités | **Validée sur émulateurs** (MAJ95–106) | Intégrer puis valider dans un vrai environnement accessible, sans appareil maître |
| Brouillons, conflits, déconnexions, doublons, baux, pauses et reprises | **Validés sur prototype émulé et bancs ciblés** (MAJ95–106, 111–113) | Vérifications physiques, adaptation/intégration et validation finale |
| Contrôle sportif du score | **Validé pour les quatre formats du prototype** (MAJ96) | Intégration dans l'application réelle et contrôle des différents parcours de compétition, phases, manches, forfaits/BYE selon cahier des charges |
| Architecture de test réseau local et HTTPS | **Étudiée et testée en loopback uniquement** (MAJ107–113) | Créer/configurer une candidate isolée réellement accessible au Samsung et PC, avec HTTPS fiable et garde-fous |
| Authentification de deux comptes Google réels | **Non préparée opérationnellement, non testée** ; les identités de test actuelles sont anonymes et émulées | Préparer une solution isolée et autorisée, puis valider connexion, droits et séparation des comptes |
| Test physique Samsung / PC | **Non réalisé** | Essayer réellement les cas P01–P11 de la MAJ107 après préparation |
| Intégration du prototype multi-match dans MILFT Tournois officiel | **Non commencée** | Adapter les mécanismes du prototype, vérifier compatibilité des autres modules/écrans/données, effectuer intégration non destructive puis tests |
| Validation finale V2 et mise en production | **Non réalisée** | Recette fonctionnelle, autorisation dédiée pour toute mise à jour Firebase réel ou déploiement officiel |
| Saisie directe avec +/− et temps morts paramétrables | **Backlog non prioritaire** | Spécification complète, réalisation, tests par formats et droits plus tard |

## Chemin critique — étapes NON encore terminées

**P1 — Préparer la candidate d'essai accessible.** Cette phase ne se limite pas à la documentation HTTPS déjà réalisée. Elle implique un environnement distinct, un transport réellement utilisable sur les deux appareils, la configuration de Firebase/test et des contrôles d'accès. Ne pas confondre préparation documentée avec candidate opérationnelle. Aucun déploiement réel autorisé par le GO technique général.

**P2 — Préparer les identités réelles.** Les tests anonymes de l'émulateur ne démontrent pas la connexion de deux comptes Google distincts. Ne pas demander de mots de passe et ne pas activer de ressources hébergées ou modifier les règles Firebase réelles sans GO spécifique.

**P3 — Réaliser la recette physique.** Samsung + PC avec les deux comptes, en reprenant la matrice P01–P11 de la MAJ107 : scores concurrents, deux matchs, coupures réseau sur chaque appareil, conflits, brouillons, droits, formats et absence de doublons.

**P4 — Intégrer les fonctionnalités à MILFT Tournois V2.** La V2 multi-match reste actuellement un prototype isolé ; le résultat des tests de ce prototype ne peut pas être assimilé à une validation du reste de l'application. Préserver la V1.1 et les archives.

**P5 — Recette finale et autorisations.** Validation globale des modules, publication uniquement après GO dédié et vérification de la compatibilité Firebase Spark et Google Drive.

## À ne pas faire

- Ne pas présenter **« tout est vert sauf les tests réels »** : c'est inexact.
- Ne pas considérer MAJ107–113 comme la construction d'un serveur LAN utilisable : il n'existe que le **plan** et des **bancs loopback CI**.
- Ne pas laisser croire que les résultats sur émulateurs valident la connexion Google réelle, l'intégration de l'application complète ou le déploiement.
- Ne pas modifier la V1.1, les championnats, les données ou archives Drive sans GO.
- Ne pas publier de nouvelles règles dans Firebase réel sans autorisation spécifique.

## Statut utilisateur

**Aucune action immédiate** tant que les travaux sont documentaires ou limités à l'émulateur, mais des interventions seront indispensables **plus tard** pour un véritable test Samsung/PC avec deux comptes Google distincts. Mettre visiblement « aucune action pour l'étape actuelle » plutôt que « rien à faire » sans nuance.

## Références

- [MAJ107 — préparation du test physique](MILFT_TOURNOIS_MAJ107_PREPARATION_TEST_PHYSIQUE_2026-11-24.md).
- [MAJ109 — plan HTTPS non activé](MILFT_TOURNOIS_MAJ109_PLAN_HTTPS_EPHEMERE_2026-11-24.md).
- [MAJ113 — dernier test IndexedDB en HTTPS local](MILFT_TOURNOIS_MAJ113_REPRISE_FILE_INDEXEDDB_HTTPS_2026-11-24.md).
- [Backlog non prioritaire](MILFT_TOURNOIS_V2_BACKLOG_AMELIORATIONS_NON_PRIORITAIRES.md).
