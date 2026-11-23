# MILFT Tournois V2 — MAJ103 — Deux matchs et confirmation tardive

**23 novembre 2026.** Reprise depuis MAJ102 clôturée, commit `161dd6974fc218334d4ab704f1888c5bc5be84ce`.

## Objectif
Sur Firebase Emulator uniquement, vérifier une panne Samsung sur **deux matchs indépendants** : scores mis en file 5–2 (A) et 6–4 (B) ; le PC confirme 7–5 sur A pendant la panne. Après reconnexion, A doit conserver le conflit et le score PC, B doit être confirmé sans doublon. Les versions doivent être A=1 et B=1, avec leurs auteurs respectifs. Une reprise au premier plan ne doit pas renvoyer le conflit.

## Périmètre
- Nouveau scénario de test E2E uniquement ; **aucune modification du code applicatif** ni des règles candidates ou réelles Firebase.
- Ne pas refaire manuellement des tests acquis sur code inchangé.
- V1.1, sauvegardes et archives Drive, championnats, données réelles et Firebase Spark intacts.
- Test physique Samsung/PC et deux comptes Google réels toujours reporté.
- Saisie +/− et temps morts : backlog non prioritaire conservé.
- **Action utilisateur : aucune.**

## Vérification GitHub Actions
À compléter après exécution. Ne pas clôturer avant SUCCESS.
