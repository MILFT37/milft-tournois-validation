# MILFT Tournois V2 — MAJ85 — Match terminé ou absent : ne pas réessayer indéfiniment

**21 novembre 2026 — GO utilisateur.** Reprise après MAJ84 validée : `docs/MILFT_TOURNOIS_MAJ84_V2_REPRISE_ERREURS_TEMPORAIRES_2026-11-21.md`.

## Défaut identifié
La MAJ84 sait reprendre une erreur réseau temporaire. Toutefois, `execute()`
classait comme `temporary-error` les états irréversibles d'un match fictif
supprimé (`get().exists() === false`) ou terminé (`status !== playing`).
Le prototype risquait donc d'envoyer **indéfiniment** une commande impossible,
à intervalle de 60 secondes, consommant inutilement les quotas Spark.

## Correction ciblée, V2 uniquement
- `v2/mobile-demo.mjs` distingue les cas `missing-match` et
  `closed-match` des véritables erreurs réseau. Les commandes restent dans
  IndexedDB en état `conflict`, avec leur score et leur ID initial ;
  aucun nouveau renvoi automatique n'est prévu pour ces cas.
- Les messages visibles distinguent clairement « Match fictif terminé »
  et « Match fictif introuvable » d'une panne temporaire.
- Les contrôles de saisie sont désactivés dès qu'un match distant n'existe
  plus ou que son statut n'est plus `playing`; une invocation directe de
  `sendScore` applique la même protection.
- Une panne réelle ou un acquittement incertain conserve le mécanisme
  de temporisation et de reprise de MAJ84.
- Aucune migration IndexedDB, règle Firebase modifiée, nouvelle permission,
  opération payante, ni modification du code de la production.

## Tests ciblés
- E2E deux navigateurs Android simulés + Firebase Auth et Realtime Database
  **émulés**. Finir puis supprimer deux matchs synthétiques uniquement dans
  les émulateurs de test ; placer une commande en attente localement, tenter
  l'envoi et constater : score conservé, `conflict`, `retryAt=0`, une seule
  tentative, pas de score distant modifié ni de match recréé, boutons de saisie
  désactivés. Les validations précédentes de la même suite sont conservées.
- Contrôles navigateur Chromium et Safari/WebKit, simulation de partage V2,
  déploiement GitHub Pages + empreintes publiques exactes.
- Le test IndexedDB MAJ84 reste acquis : **son module est inchangé**,
  aucun besoin de répéter son workflow.

## Garde-fous
- V1.1 officielle `MILFT37/milft-tournois`, championnats,
  tournois réels, données locales et archives Drive intouchés.
- Projet Firebase Spark gratuit, règles de sécurité réelles et comptes Google
  inchangés ; tests uniquement avec données fictives et émulateurs.
- Le premier test réel Samsung (connexion Google, salle fictive, score 5–3)
  est déjà validé : ne pas le redemander.
- Deuxième appareil physique avec un autre compte Google toujours à tester
  plus tard ; cela n'empêche pas de fiabiliser le prototype.
- **Aucune intervention sur Samsung pour cette MAJ.**

## Clôture
**MAJ85 VALIDÉE et publiée — 21 novembre 2026.**

- Commit applicatif/tests/feuille de route : `7c98e789b84c67e97a4c664f37e3c103fda9349f`. Modifications limitées à `v2/mobile-demo.mjs`, aux tests E2E émulés et à ce document.
- **Simulation partage V2** : workflow `44899711804` — **SUCCESS**.
- **Interface démonstration Android, Chromium et WebKit** : workflow `44899711831` — **SUCCESS**.
- **E2E deux Android simulés, Firebase Auth + Realtime Database émulés** : workflow `44899711827` — **SUCCESS**. Vérification du refus définitif si match `finished` ou absent, de l'absence de nouvelles tentatives, de la conservation des brouillons et de l'absence d'écriture/récréation distante.
- **GitHub Pages et contrôle des fichiers publics** : workflow `44899711819` — **SUCCESS**.
- **IndexedDB MAJ84** : code inchangé ; validation précédente `44836351818` maintenue, aucun nouveau test nécessaire.
- Le prototype V2 demeure **isolé** ; aucune intégration à l'application officielle `MILFT37/milft-tournois`, aucune modification des tournois/championnats/archives Drive, des règles Firebase ou du forfait Spark.
- **Aucune action sur Samsung**. Le test réel entre deux appareils physiques avec deux comptes Google distincts reste non effectué.
- **Reprise prochaine : MAJ86** depuis cette clôture ; préserver les acquis et ne pas répéter les tests sur une version inchangée.

