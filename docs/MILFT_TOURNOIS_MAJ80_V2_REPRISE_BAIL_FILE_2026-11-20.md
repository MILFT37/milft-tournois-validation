# MILFT Tournois — MAJ80 — Reprise sûre des opérations « en cours »

**20 novembre 2026 — GO explicite.** Continuité de MAJ79 : `docs/MILFT_TOURNOIS_MAJ79_V2_DOUBLE_CLIC_FILE_HORS_LIGNE_2026-11-20.md`.

## Risque relevé
Après fermeture ou rechargement de la page **pendant** une transmission, IndexedDB conserve volontairement une opération en état `sending` et son bail `leaseUntil`. C'est nécessaire pour protéger les autres onglets contre deux transmissions concurrentes. Toutefois, si le bail n'était pas encore expiré au moment du redémarrage, l'ancien prototype ne réessayait pas automatiquement à son expiration : l'utilisateur devait appuyer sur « Renvoyer les opérations en attente ».

## Correction V2 isolée
- `v2/mobile-demo.mjs` : détection des baux `sending` en cours et programmation **d'une reprise automatique à leur expiration**, sans anticiper l'échéance. Après ce délai, la file reprend l'opération **avec son même ID** et le mécanisme de comparaison de version/empreinte Firebase existant.
- Annulation des reprises programmées lorsque la salle, le compte ou le navigateur passe hors ligne ; aucun envoi depuis un compte en lecture seule. Vérification du `roomGeneration` et de la portée avant la reprise.
- Après chaque tentative de transmission, rafraîchissement de la file lorsque la portée est encore active pour armer au besoin la reprise du bail.
- Indication près de la file : « Reprise automatique après le délai de sécurité ». Rien n'est supprimé sans accusé de réception ; les conflits continuent d'être conservés.

## Vérification ciblée
- `tests/v2-mobile-demo-e2e.cjs` : sous Firebase Auth+Realtime Database **émulés**, création d'une troisième salle fictive, ajout d'un événement 2–1, réservation du bail de 5 secondes, fermeture du navigateur avant l'envoi, réouverture immédiate avec le même profil ; vérification qu'aucun envoi anticipé n'a lieu, puis qu'un seul envoi reprend automatiquement après l'échéance et passe la version distante à 1.
- Conserver les validations MAJ75 à MAJ79 (score réel fictif Samsung 5–3, deux téléphones émulés, droits, collisions, hors ligne, double-clic et changement de salle).
- Contrôler les nouveaux workflows GitHub Actions, puis la publication et la conformité des fichiers publics.

## Garde-fous
- Aucun changement de l'application de production `MILFT37/milft-tournois`, des données de tournois, du championnat annuel ou des archives Google Drive.
- Base Firebase réelle, règles publiées, configuration Google Auth et forfait gratuit Spark inchangés.
- Aucun nouveau test utilisateur sur Samsung ; test inter-appareils physiques avec **deux comptes distincts toujours non effectué**, à réaliser lorsqu'un PC ou un deuxième Android sera disponible.

## Clôture MAJ80 — quatre contrôles réussis
- Commit d'application `61cd53a45887ed45ee868ea64cbd9d5bffa11984` : reprise automatique après délai de bail IndexedDB, contrôle de salle active et messages d'interface.
- Simulation partage V2 `44827687963` : **SUCCESS**.
- Test mobile Chromium et WebKit `44827686937` : **SUCCESS**.
- Déploiement GitHub Pages avec comparaison des fichiers publics `44827687131` : **SUCCESS**.
- Test E2E initial `44827687080` : **FAILURE**, non pas à cause de la nouvelle reprise mais d'une attente du compteur de file précédent. Diagnostic ciblé du compteur ajouté dans `a1f719d4` ; deuxième exécution a confirmé la fin de ce parcours, puis relevé une synchronisation trop précoce du test de création de la salle suivante.
- Test corrigé dans `624071cf` : attente explicite du nouveau code de salle avant vérification. Test E2E final `44828236235` : **SUCCESS** (règles Firebase compactes, reprise du bail après fermeture, score 2–1 sans envoi anticipé, plus scénarios préexistants).
- La nouvelle application V2 est publiée par Pages ; les modifications des deux derniers commits concernaient seulement les tests. **MAJ80 validée côté code, publication et tests automatisés.**
- Aucun test réel sur deux appareils physiques n'a encore été effectué. L'authentification Google, la création de salle et le score fictif 5–3 déjà validés sur le vrai Samsung (MAJ75) restent acquis.
- Production officielle `MILFT37/milft-tournois` dernier commit `d81c9f03f7e7ca016e517c6df8ae1f458285ee0c` : non modifiée. Aucune modification de données, archives Drive, règles RTDB réelles ou formule Spark.
