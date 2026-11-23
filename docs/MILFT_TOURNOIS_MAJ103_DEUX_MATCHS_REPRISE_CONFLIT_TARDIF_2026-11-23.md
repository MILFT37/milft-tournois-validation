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
- Premier commit du scénario : `a7bdb3fc`.
- `45246824870` : **FAILURE** sur une attente textuelle héritée de la MAJ102, sans exécution du nouveau scénario.
- Correctif `3f6b34a0` : contrôle direct de la file IndexedDB, sans dépendre du délai d'affichage du tableau de synthèse.
- `45247256495` : **SUCCESS** sur Firebase Auth/RTDB Emulator ; parcours multi-match comprenant la MAJ103 réussi.

## Clôture MAJ103 — 23 novembre 2026

**MAJ103 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**

Deux matchs fictifs A et B ont des commandes distinctes dans la file du Samsung hors connexion. Le PC confirme A à un score divergent ; après reconnexion, A conserve un brouillon local en conflit sans écraser la version du PC, tandis que B est confirmé avec sa propre version et son auteur. Le retour au premier plan ne rejoue pas A. Les tests antérieurs du parcours E2E restent inclus dans le workflow.

**Aucun changement du code applicatif, des règles Firebase réelles/candidates, de la V1.1, des données réelles ou des archives Drive.** Tests physiques Samsung/PC avec deux comptes Google distincts toujours à effectuer plus tard.

**Suite proposée MAJ104 :** durcir les vérifications de reprise en cas de pertes réseau répétées, sans doublons, en ciblant les cas non encore couverts. Le backlog saisie +/− et temps morts reste non prioritaire.

**Action utilisateur : aucune.**
