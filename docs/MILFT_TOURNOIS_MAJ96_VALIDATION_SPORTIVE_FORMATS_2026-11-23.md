# MILFT Tournois V2 — MAJ96 — Validation sportive selon le format (Firebase Emulator)

**23 novembre 2026. GO utilisateur explicite.** Reprise depuis la MAJ95 entièrement clôturée : `d9a75f9ac0ef963f8d8a255ff569f6585eecdd54`.

## Périmètre strict
- Prototype **multi-match émulé uniquement**, aucune règle réelle publiée.
- Ni application V1.1, ni Github Pages, ni championnats/tournois réels, ni sauvegardes/archives Drive modifiés.
- Le test physique sur deux appareils et deux comptes Google distincts reste futur et **non validé**.
- Firebase Spark gratuit conservé ; aucune manipulation Samsung demandée.

## Développement MAJ96
Commit initial : `59cf4804284a460d38c9b353b824fbf22fbf17b3`.
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
- `45160346026` — Règles candidates RTDB : **EN COURS** au moment du présent relevé.
- `45160346119` — Deux navigateurs simulés E2E : **EN COURS** au moment du présent relevé.

## Suite
1. Contrôler les deux workflows ciblés et corriger le cas échéant, sans retoucher V1.1 ni Firebase réel.
2. Étendre le contrôle des brouillons distincts par match et des acquittements tardifs lors des rechargements navigateur, uniquement si un scénario non couvert apparaît.
3. Clôturer la MAJ96 **uniquement après SUCCESS** des vérifications ciblées et mettre à jour ce document avec commits et exécutions exacts.

**Action utilisateur : aucune pour les étapes émulées.**
