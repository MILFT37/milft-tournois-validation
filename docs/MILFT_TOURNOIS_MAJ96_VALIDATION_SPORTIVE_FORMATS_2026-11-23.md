# MILFT Tournois V2 — MAJ96 — Validation sportive selon le format (Firebase Emulator)

**23 novembre 2026. GO utilisateur explicite.** Reprise depuis la MAJ95 entièrement clôturée : `d9a75f9ac0ef963f8d8a255ff569f6585eecdd54`.

## Périmètre strict
- Prototype **multi-match émulé uniquement**, aucune règle réelle publiée.
- Ni application V1.1, ni Github Pages, ni championnats/tournois réels, ni sauvegardes/archives Drive modifiés.
- Le test physique sur deux appareils et deux comptes Google distincts reste futur et **non validé**.
- Firebase Spark gratuit conservé ; aucune manipulation Samsung demandée.

## Développement MAJ96
Commit initial : `59cf4804284a460d38c9b353b824fbf22fbf17b3`. Corrections ciblées des tests : `2f729699`, `6984e01a`, `e27628ad`.
- Chaque match fictif porte désormais un `format` configuré à la création, visible par les deux appareils et **immuable** côté règles RTDB candidates.
- `v2/score-formats-emulator.mjs` distingue quatre cas :
  - `manche5` : une équipe atteint 5, adversaire au plus 4.
  - `partie7` : une équipe atteint 7, adversaire au plus 6 ; nul 6–6 possible.
  - `partie8` : une équipe atteint 8, adversaire au plus 7 ; nul 7–7 possible.
  - `belle5` : 5–0 à 5–3, 6–4, 7–5, 8–6 ou 8–7 (symétriques) ; ni 5–4 ni 6–5 ni 7–6 ni 8–8 ni 9–7.
- La validation se fait **avant** de sauvegarder une commande localement, **avant** d'émettre une commande reprise de la file, puis dans les règles candidates RTDB à l'écriture distante. Les formats non connus sont refusés.
- Les commandes conservent leur format et les signatures de déduplication en tiennent compte. Un match et un autre restent indépendants ; aucune notion d'appareil maître.
- Cette étape modélise le résultat d'une unique manche/partie par match fictif ; elle **n'intègre pas** le décompte des manches gagnées, le paramétrage complet des compétitions réelles ni les règles BYE/forfait : à intégrer seulement après validation spécifique de leur modèle V2.

## Tests ciblés
- `tests/v2-rtdb-multimatch-candidate.cjs` : matrice de scores admis/refusés selon chacun des 4 formats, immutabilité et refus de format absent ou inconnu, sans contact Firebase réel.
- `tests/v2-mobile-multimatch-emulator-e2e.cjs` : conservation des parcours MAJ94/95, avec scores sportifs cohérents (belle), plus refus d'un 5–4 côté interface avant mise en file.
- Seuls les workflows associés aux fichiers modifiés doivent être relancés automatiquement. Ne **pas** répéter manuellement les essais validés sur du code inchangé.

## Suivi GitHub Actions
- `45160346025` — Simulation partage V2 : **SUCCESS** (commit `59cf4804`).
- `45160346026` — Règles candidates RTDB : **FAILURE** (première erreur de syntaxe du scénario, corrigée).\n- `45160554055` — Règles candidates RTDB : **FAILURE** (bloc de test dupliqué, supprimé).\n- `45160695666` — Règles candidates RTDB : **SUCCESS**, validation côté serveur des quatre formats sportifs, sans Firebase réel.
- `45160346119` — Deux navigateurs simulés E2E : **FAILURE** (premier score non confirmé, diagnostic ajouté).\n- `45160721731` — Deux navigateurs simulés E2E : **EN COURS** au moment du présent relevé.

## Diagnostic et correction du stockage local (suite MAJ96)
- E2E `45160721731` : **FAILURE** au premier score, mais diagnostic détaillé : les deux matchs restaient à 0–0 et chacun conservait un brouillon en conflit ; les formats étaient bien présents sur RTDB.
- Cause vérifiée dans le code : le normaliseur générique `v2/outbox-idb.js` retire tous les champs inconnus et ne conservait pas `command.format`. L'émetteur refusait donc légitimement une commande privée de son format sportif.
- Correctif `965e90ed` : création d'une **copie isolée** `v2/outbox-multimatch-emulator.js` qui exige et conserve le format sportif, sans modifier `v2/outbox-idb.js` déjà utilisé par le prototype public. HTML et workflow d'émulation ajustés ; aucun fichier de publication V1.1 modifié.
- **Workflow `45161011854` : SUCCESS** — scénario E2E Samsung/PC émulés complet, score validé, déconnexion dans les deux sens, brouillons/conflits/doublons et gestion des rôles.\n- **Workflow `45161012014` : SUCCESS** — simulation partage V2.

## Clôture — 23 novembre 2026
**MAJ96 VALIDÉE ET CLÔTURÉE SUR ÉMULATEURS UNIQUEMENT.**
- Tests des règles candidates RTDB : `45160695666` **SUCCESS**.
- Scénario E2E Samsung/PC émulés : `45161011854` **SUCCESS**.
- Simulation partage V2 : `45161012014` **SUCCESS**.
- Comparaison GitHub avec la clôture MAJ95 `d9a75f9a` : seuls le prototype multi-match émulé, ses règles candidates, ses tests, son workflow, la copie IndexedDB d'essai et ce document ont changé.
- Les erreurs intermédiaires figurent plus haut pour traçabilité et sont corrigées ; il n'est pas nécessaire de recommencer les campagnes passées sur du code inchangé.
- **Prochaine étape autonome : MAJ97** (rechargement navigateur avec brouillons non envoyés distincts par match, acquittements tardifs et éventuel stockage persistant des saisies non encore mises en file). Garder la protection des formats et la règle d'unicité des matchs.
- **Aucun déploiement** de la nouvelle règle candidate dans Firebase réel. Aucun test physique sur deux comptes Google réels effectué. Aucun changement du site V1.1, des tournois, championnats ou archives Drive.


**Action utilisateur : aucune pour les étapes émulées.**
