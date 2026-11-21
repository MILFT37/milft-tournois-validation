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
**MAJ86 VALIDÉE et publiée — 21 novembre 2026.**

- Commit applicatif/tests/feuille de route : `78feb7fc93c7231fca05ee76c7ca34bd4a80ae75`. Fichiers changés : `v2/mobile-demo.mjs`, `tests/v2-mobile-demo-e2e.cjs` et ce document uniquement.
- **Simulation partage V2** : GitHub Actions `44900011685` — **SUCCESS**.
- **Interface Chromium et Safari/WebKit** : `44900011665` — **SUCCESS**.
- **E2E deux Android simulés avec Firebase Auth/Realtime Database émulés** : `44900011670` — **SUCCESS**. Test de 18 événements locaux consécutifs sur la même salle fictive : après reconnexion, version distante 18, dernier ID `eMAJ86_18`, score final 18–17, file vide et poursuite automatique après les 15 premières transmissions.
- **GitHub Pages et empreintes des fichiers publics** : `44900011672` — **SUCCESS**. Prototype V2 déployé séparément de la V1.1 officielle.
- **IndexedDB, règles RTDB et Firebase réel** : fichiers inchangés, validations antérieures maintenues sans relance inutile.
- Production officielle `MILFT37/milft-tournois`, V1.1, tournois, championnats, archives Google Drive, règles de sécurité Firebase et forfait Spark **inchangés**.
- **Aucune manipulation sur Samsung**. Test inter-appareils réels avec deux identités Google distinctes **toujours en attente**.
- Prochaine reprise : **MAJ87**, depuis cette feuille de route ; poursuivre la fiabilisation du prototype isolé, sans répéter les validations des versions inchangées ni intégrer V2 prématurément à V1.1.
