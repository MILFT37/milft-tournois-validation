# MILFT Tournois V2 — MAJ97 — Brouillons non envoyés et rechargements multi-match

**23 novembre 2026 — GO utilisateur.** Reprise depuis la MAJ96 clôturée, commit `a9a5b2f3121d7e08bd7941cd7386f779f1c07d30`.

## Objectif et principe
Conserver les chiffres **simplement saisis, mais pas encore placés dans la file d'envoi**, lorsque le navigateur est rechargé ou que l'utilisateur change de match, même si un autre appareil continue à saisir. Ne jamais confondre un brouillon de saisie avec une opération déjà en file IndexedDB. Aucune transmission automatique des simples brouillons.

## Développement initial
- Commit `f505149555eef6ef89c067f12ca02eedb5650d12`.
- Nouveau module **réservé à l'émulateur** : `v2/draft-multimatch-emulator.mjs`.
- Sauvegarde immédiate à chaque modification du score dans `localStorage`, sous une clef locale incluant **salle, UID Firebase, identifiant persistant de l'appareil et ID du match**. Les brouillons ne sont pas partagés par Firebase.
- Les valeurs et la **version distante de départ** sont conservées. Un changement de version serveur provoque un avertissement visible, jamais une suppression ou un écrasement du brouillon.
- Un jeton renouvelé à chaque saisie permet de n'effacer un brouillon qu'après son **acquittement d'ajout en file IndexedDB** ; une saisie modifiée pendant l'opération asynchrone est préservée.
- Le brouillon reste conservé en cas d'échec de l'enregistrement en file ; le module rejette ou signale le stockage illisible/incohérent sans nettoyage automatique.
- Le format sportif MAJ96 demeure attaché à chaque brouillon et validé à la restauration : une ancienne saisie ne peut pas être réutilisée sous un autre format.
- `v2/mobile-multimatch-emulator.html` affiche le statut du brouillon local, sans nouvelle action utilisateur requise.

## Tests ajoutés au parcours E2E émulé
- Deux brouillons distincts dans un même tournoi fictif (`draftA` belle et `draftB` partie7), sans écriture Firebase avant envoi.
- Rechargement du navigateur Samsung : reprise des deux saisies locales exactes et de leurs formats.
- Le PC confirme `draftA` entre-temps : le brouillon Samsung reste visible, averti de la modification distante, puis peut être acquitté **sans deuxième version ni changement d'auteur**.
- L'acquittement de `draftA` ne touche pas `draftB` ; deuxième rechargement puis envoi de `draftB` avec confirmation unique.
- Isolation des saisies par appareil et par compte ; contrôles de rôles et autres scénarios MAJ94–96 conservés.
- Aucun test V1.1 répété ; les seules vérifications déclenchées concernent les chemins V2 modifiés.

## Contrôle GitHub Actions
- Workflow E2E multi-match (Firebase Auth/RTDB Emulator uniquement) : `45162107732`, **en cours** au relevé initial.
- Workflow simulation partage V2 : `45162107588`, **en cours** au relevé initial.
- La clôture nécessite **SUCCESS** des deux exécutions concernées ; les autres règles candidates MAJ96 restent inchangées.

## Sécurité / exclusions
- **Firebase réel, Firebase Spark, règles publiées, production V1.1, site public, tournois, championnats et archives Google Drive inchangés**.
- Aucune intégration prématurée à l'application officielle.
- Test physique deux appareils/deux comptes Google distincts toujours non réalisé.
- **Action utilisateur : aucune**. Tous les tests sont effectués sur émulateurs, sans besoin d'intervenir depuis le Samsung.

## Prochaine étape
Contrôler les workflows, corriger les éventuels défauts ciblés ; avant clôture vérifier notamment le comportement au retour des droits et la protection contre les acquittements asynchrones.
