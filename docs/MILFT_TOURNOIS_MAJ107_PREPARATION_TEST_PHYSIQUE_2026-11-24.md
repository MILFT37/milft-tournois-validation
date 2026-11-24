# MILFT Tournois V2 — MAJ107 — Préparation du test physique Samsung / PC

**24 novembre 2026.** Départ de la MAJ106 clôturée, commit `dfb2f00931981c2f06be32da50a3e7eb7707ab3b`.

## Statut de la MAJ107

**Préparation et contrôle de sécurité seulement. Test physique non réalisé.** Ne pas présenter les simulations MAJ95–106 comme un test sur de vrais comptes ou appareils. **Aucun GO spécifique** n'a été donné pour publier des règles Firebase réelles ni pour lancer un test physique utilisant un service réel.

### Constats techniques (vérifiés dans le dépôt)
- `v2/mobile-multimatch-emulator.mjs` est réservé à `127.0.0.1` / `localhost` / `::1` et importe des modules test-only produits par le serveur de test. La page ne peut pas simplement être ouverte sur deux appareils physiques à partir de GitHub Pages.
- La fixture `tests/v2-mobile-multimatch-emulator-e2e.cjs` **simule deux comptes Firebase anonymes** grâce à Auth Emulator ; elle ne réalise **aucune connexion Google authentique**.
- RTDB Emulator et Auth Emulator écoutent sur `127.0.0.1`. Le PC et le Samsung ne peuvent pas accéder tels quels au **même** serveur d'émulation à distance.
- La publication GitHub Pages conserve son prototype V2 public distinct `v2/mobile-demo.*`, mais **exclut** les fichiers multi-match d'émulation et les règles candidates. Ne pas modifier ces exclusions.
- Les droits propriétaire / éditeur / lecteur, les scores par format, la reprise réseau et la déduplication sont validés **seulement sur émulateurs**.

## Préconditions avant toute tentative physique

**Étape future, suspendue jusqu'à demande et autorisation distinctes.** Ne pas entreprendre la mise en réseau d'un émulateur accessible au Samsung ni la création / utilisation d'un environnement Firebase hébergé sans nouveau **GO spécifique** sur l'environnement et les règles.

1. Disposer d'un **environnement d'essai séparé de la production**, dont les règles et le cycle de vie ont été validés séparément. Aucun tournoi réel, aucune donnée de championnat, aucun accès Drive : uniquement une salle fictive dédiée et des noms inventés.
2. Fournir une interface accessible depuis le Samsung et le PC par un canal explicitement autorisé, sans remplacer la V1.1, le site officiel ou le prototype déjà publié.
3. Vérifier l'authentification de **deux comptes Google distincts** (propriétaire et **compte invité**) ; les identités anonymes de l'émulateur ne prouvent pas ce fonctionnement. Ne jamais demander de mot de passe ou de code de connexion à l'utilisateur.
4. Vérifier le partage des permissions et la sécurité de la nouvelle infrastructure sur son environnement de test, jamais sur Firebase réel du club sans autorisation explicite. Conserver la compatibilité Firebase Spark gratuit.
5. Définir une méthode non destructive de traçabilité et de sortie : aucune restauration automatique ni purge de données / archives réelles.

## Matrice de validation physique future

| Cas | Manipulation future | Résultat attendu |
|---|---|---|
| P01 — Deux identités | Samsung propriétaire, PC invité avec deux sessions Google indépendantes | Accès au même essai, UID différents, aucune notion d'appareil maître |
| P02 — Matchs indépendants | Créer deux matchs fictifs A et B, saisir depuis les deux appareils | Versions / scores / auteurs distincts, synchronisation bidirectionnelle |
| P03 — PC déconnecté | Mettre le PC hors ligne, saisir sur PC et poursuivre un autre match sur Samsung | Brouillon PC durable ; Samsung continue ; reprise du PC sans perte |
| P04 — Samsung déconnecté | Inverser les rôles, éventuellement via partage de connexion du PC | Brouillon Samsung durable ; PC continue ; reprise correcte |
| P05 — Même score | Saisir le même résultat sur les deux appareils avec coupure | Un seul résultat confirmé, pas de seconde version |
| P06 — Scores divergents | Confirmer 7–5 sur PC, conserver 5–3 sur Samsung hors ligne | Conflit visible et conservé, jamais écrasement silencieux |
| P07 — Brouillons / rechargement | Saisir sans envoyer, basculer de match et recharger un appareil | Brouillon sauvegardé et isolé par salle / compte / appareil / match |
| P08 — Droits | Dégrader le **compte invité** en **mode lecture seule** puis retirer l'accès | Saisie désactivée, aucune écriture non autorisée, accès retiré |
| P09 — Formats sportifs | Essayer 9–7 et 8–8 ; tester une belle 5–4 et 8–7 | Résultats impossibles refusés selon format ; 8–7 accepté dans la belle |
| P10 — Plusieurs reconnexions | Faire deux coupures successives et redémarrer navigateur | Pas de doublon, brouillons et reçus inchangés |
| P11 — Audit final | Comparer comptes, versions, scores, files et conflit par match | Tous les résultats fictifs attendus, sans interaction avec la V1.1 |

**Critères d'arrêt immédiat :** identité ou environnement incorrect, données réelles visibles, synchronisation vers le Firebase réel du club sans autorisation, perte de brouillon, score incompatible accepté ou actions sur archives Drive. Documenter le constat ; ne jamais « réparer » en remplaçant des données.

## Action demandée à l'utilisateur

**Aucune action actuellement.** La préparation continue automatiquement. Quand la phase physique sera effectivement autorisée, les seules interventions prévues seront sur le Samsung et, si indispensable, le PC / le second compte Google pour réaliser les gestes réels ; elles seront expliquées précisément à ce moment-là.

## Vérifications automatiques MAJ107

Le script `tests/v2-physical-readiness-audit.cjs` et le workflow GitHub Actions `v2-physical-readiness-audit.yml` doivent contrôler les protections sans accès réseau externe, sans authentification réelle et sans relancer inutilement la campagne E2E déjà validée sur code inchangé.

**Statut de clôture : à renseigner après SUCCESS de GitHub Actions.**
