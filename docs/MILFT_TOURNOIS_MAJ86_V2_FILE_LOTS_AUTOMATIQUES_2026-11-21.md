# MILFT Tournois V2 — MAJ86 — Transmission automatique de la file au-delà de 15 opérations

**21 novembre 2026 — GO utilisateur.** Reprise de la MAJ85 clôturée : `docs/MILFT_TOURNOIS_MAJ85_V2_MATCH_INDISPONIBLE_ET_REPRISE_2026-11-21.md`.

## Risque métier identifié
Le traitement de la file V2 par `transmit()` s'arrêtait après 15 événements.
Le rafraîchissement final ne reprogram­mait un nouvel envoi que devant
un bail `sending` actif ou une erreur temporaire avec `retryAt`. Si
16, 20 ou davantage de scores avaient été enregistrés hors connexion,
les opérations suivantes pouvaient rester `pending` indéfiniment
jusqu'au prochain clic ou événement de reconnexion.

## Correction isolée MAJ86
- `v2/mobile-demo.mjs` : compter les opérations effectivement réservées
  dans un lot. Quand la limite de 15 est atteinte, rafraîchir la file et
  **programmer automatiquement le lot suivant** seulement si sa tête est
  prête ; laisser une courte temporisation de 250 ms entre lots.
- Ne jamais franchir un bail actif, un délai de reprise `retryAt`,
  un refus d'autorisation ou une dépendance non acquittée.
- Réutiliser les garde-fous existants de portée : génération de salle,
  compte Google, rôle admin/editor et état réseau. Tout changement de salle
  annule le minuteur ; les conflits et brouillons restent intacts.
- Afficher « Suite des opérations automatique » près de la file au
  moment d'un envoi par lots, sans demander de clic supplémentaire.
- Aucun changement du schéma IndexedDB, des règles Firebase, de Spark,
  de l'application V1.1 ni des sauvegardes/archives Google Drive.

## Vérification ciblée
- `tests/v2-mobile-demo-e2e.cjs` : deux environnements Android simulés
  avec Auth et Realtime Database **émulés**. Après création d'une nouvelle
  salle fictive, empiler **18 scores** successifs hors connexion, vérifier
  les versions locales 0 à 17, reconnecter, puis constater sans autre
  intervention le score final 18–17, la version distante 18, l'ID final
  attendu et une file vide.
- Le même test garde les validations des étapes MAJ75–85 déjà incluses ;
  ne pas faire revalider les anciens parcours par l'utilisateur.
- Vérifier GitHub Actions : simulation V2, interface Chromium/WebKit,
  E2E Android/Firebase émulé, déploiement Pages et empreintes des fichiers.
- IndexedDB et règles Firebase inchangés : leurs validations précédentes
  restent acquises ; ne pas déclencher d'autres campagnes inutiles.

## Contraintes de sécurité et reprise
- Production officielle `MILFT37/milft-tournois`, tournois réels,
  championnat annuel et archives Drive **intouchés**.
- Firebase réel, règles de sécurité, Auth Google et forfait **Spark gratuit**
  inchangés ; aucune écriture de données réelles par les tests.
- Le test réel sur Samsung (Google, salle fictive, score 5–3) reste acquis.
  Le test physique entre deux appareils avec deux comptes Google distincts
  n'a pas encore été effectué, et ne bloque pas cette MAJ.
- **Aucune action de l'utilisateur sur Samsung.**

## Clôture
**En cours** — noter les commits, les workflows GitHub Actions et le
contrôle de publication avant de déclarer cette MAJ validée.
