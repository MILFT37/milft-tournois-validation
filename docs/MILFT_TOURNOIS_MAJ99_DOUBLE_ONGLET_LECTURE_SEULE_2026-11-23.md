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

## Vérifications et clôture
Lancement automatique par modification du module émulé et du E2E. Inscrire ici les IDs et conclusions GitHub Actions. Ne déclarer VALIDÉ que si le parcours ciblé est SUCCESS. Pour tout problème, corriger uniquement les chemins de l'essai émulé.
