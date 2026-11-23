# MILFT Tournois V2 — MAJ98 — Sécurité des brouillons sous échec de stockage

**23 novembre 2026 — GO utilisateur permanent pour les étapes techniques autonomes.** Reprise depuis MAJ97 clôturée, commit `fc7eda59d42541cc4175cf81720199a592a0b8ef`.

## Objectif
Fiabiliser le prototype multi-match uniquement sur Firebase Emulator en cas de `localStorage` refusé ou plein, brouillon corrompu, changement de salle ou compte, et confirmation tardive d'une commande. Aucun compte réel ni données de production utilisés.

## Développement initial
Commit `dedf9529ffab6fff17ac47628aebdec9ec4c543c`.
- Le prototype enregistre explicitement l'état `unsavedDraft` quand la sauvegarde locale synchrone échoue. Le score en cours de saisie reste à l'écran, avec alerte visible ; la déconnexion, la création/ouverture d'une autre salle et le changement de match sont alors bloqués pour éviter une perte silencieuse.
- Une saisie ultérieure qui réussit à se sauvegarder retire l'alerte et autorise la navigation. Les brouillons intacts, stockés avant la panne, ne sont pas supprimés.
- Chaque frappe avance une révision locale. L'acquittement d'une ancienne opération asynchrone ne doit pas nettoyer une saisie plus récente si elle a changé entre-temps.
- Les permissions et restrictions réseau de la MAJ97 restent actives ; Firebase réel et les règles candidates sont inchangés.
- Nouveau test de sécurité local `tests/v2-multimatch-draft-safety.cjs` : isolation par salle, compte, appareil et match ; stockage refusant lectures/écritures/suppressions ; enregistrement corrompu non effacé ; ancien token ne pouvant détruire la dernière saisie.
- Extension du test E2E Samsung/PC avec `Storage.prototype.setItem` défaillant uniquement sur les clés fictives de brouillons : l'utilisateur reste sur le match pendant l'échec, puis récupère un brouillon fiable quand le stockage redevient disponible.

## Vérifications ciblées
- Workflow émulateur E2E `45164963584` : déclenché.
- Workflow simulation partage isolée `45164963604` : déclenché.
- Aucune reprise manuelle des tests acquis sur code inchangé.

## Protections impératives
- **V1.1 officielle, application publique, déploiement Firebase réel, championnats, données de tournois, sauvegardes et archives Google Drive absolument inchangés.**
- Forfait Spark gratuit et règles Firebase actuellement publiées préservés.
- Test physique à deux appareils et deux comptes Google distincts toujours non effectué.
- Aucune intervention requise depuis le Samsung.

## Suite
Contrôler les deux workflows et corriger tout défaut identifié ; consigner les commits et exécutions avant clôture. Ne jamais déclarer la MAJ98 validée si le E2E est en échec.
