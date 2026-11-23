# MILFT Tournois V2 — MAJ99 — Deux onglets et lecture seule (émulateurs)

**23 novembre 2026 — GO permanent de poursuite autonome utilisateur.** Reprise depuis MAJ98 clôturée, commit `63c2b11db82e761af652e3b984acd3807408a8e6`.

## Avancement initial
- Commit applicatif + tests `158a8684a415392a962ea59d38ce4e3c0080ffac`.
- Le même appareil peut ouvrir **deux onglets** partageant un brouillon local. Au moment de l'envoi, le prototype relit la valeur persistante et refuse l'envoi si le jeton du brouillon a été remplacé depuis l'onglet courant. Ceci protège du départ d'une saisie obsolète lorsque l'autre onglet a déjà modifié le brouillon, sans effacement automatique.
- Les rôles `viewer` / sans autorisation rendent désormais les champs de score en lecture seule, pas seulement le bouton d'envoi. En revenant `editor`, la saisie redevient possible.
- Le parcours Playwright comporte un troisième onglet fictif dans le contexte du PC : premier brouillon 5–2, nouvel onglet 5–3, refus d'envoi du 5–2 depuis l'onglet périmé, acceptation 5–3 uniquement, version et score exacts. Les tests existants de dégradation/rétablissement des droits ont des assertions sur les champs non modifiables.
- Le parcours MAJ94–98 précédemment validé reste préservé, sans répéter les autres campagnes V1.1.

## Périmètre et garde-fous
- Tous les tests utilisent Firebase Auth et Realtime Database Emulator, pas le projet Firebase réel.
- Pas de publication des nouvelles règles, pas de déploiement GitHub Pages et aucune intégration à V1.1.
- Les tournois, championnats, données réelles, comptes Google réels et archives Drive sont intouchés. Firebase Spark demeure gratuit.
- Les tests physiques sur deux appareils et deux comptes Google distincts restent à programmer ultérieurement ; leur succès n'est pas présumé.
- **Aucune action nécessaire depuis le Samsung.**

## Clôture MAJ99 — 23 novembre 2026
**MAJ99 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**
- Commit de développement `158a8684a415392a962ea59d38ce4e3c0080ffac`.
- GitHub Actions E2E multi-match / deux onglets / permissions `45165369219` : **SUCCESS**.
- Simulation partage V2 isolée `45165369066` : **SUCCESS**.
- Deux onglets même appareil : la saisie obsolète 5–2 est refusée, la saisie plus récente 5–3 est transmise seule ; la version distante et les droits sont contrôlés.
- Passage `editor → viewer → editor` : les champs de saisie sont en lecture seule puis réactivés, et les boutons d'envoi suivent déjà les rôles.
- Ni application V1.1, ni site public, ni Firebase réel, ni archives Drive ni données réelles modifiés.
- **Action utilisateur : aucune.**
- Suite potentielle MAJ100 : sécuriser une modification simultanée du brouillon *avant l'envoi* dans deux onglets (ne pas permettre à un onglet ancien d'écraser silencieusement un brouillon plus récent) ; poursuivre les tests de tolérance aux pannes sans déploiement réel.

