# MILFT Tournois V2 — MAJ91 — Pause après erreurs réseau répétées

**23 novembre 2026 — GO utilisateur.** Départ : MAJ90 validée et publiée,
`docs/MILFT_TOURNOIS_MAJ90_V2_COPIE_BROUILLONS_CONFLITS_2026-11-23.md`.

## Problème
Les MAJ84–87 garantissent la reprise autonome après coupure réseau, mais
en cas d'erreur persistante le système pouvait continuer indéfiniment à
réessayer (jusqu'à une fois par minute), même si Firebase restait indisponible.
C'est inutile, notamment avec un forfait Firebase Spark gratuit.

## Correctif ciblé, prototype isolé
- Après **8 tentatives infructueuses** d'une même opération, la file
  conserve le score avec état `pending`, et marque une pause persistante
  `retryPaused: true` en IndexedDB. Aucune suppression ni re-création d'ID.
- Plus aucun minuteur, signal `online`, retour au premier plan ou
  rechargement navigateur ne peut envoyer automatiquement cette opération
  tant que la pause est active.
- Le bouton existant **« Renvoyer les opérations en attente »** permet
  une tentative manuelle explicite avec le **même ID** et un nouveau bail
  atomique. Si l'envoi est confirmé, la file continue normalement ;
  s'il échoue encore temporairement, elle revient en pause.
- Les scores suivants n'ignorent jamais une tête de file en pause :
  préservation FIFO, dépendances, verrous et délai de sécurité.
- Affichage clair du nombre d'envois en pause et message après 8 échecs.
  Les conflits, refus de droits et scores terminés conservent leurs
  comportements précédents.
- Champ IndexedDB optionnel ; **aucune migration**, ni changement de
  Firebase, des règles RTDB, de Spark, des données ou comptes existants.

## Contrôles automatiques
- IndexedDB Chromium et Safari/WebKit : huit échecs successifs, pause
  persistante, fermeture/réouverture de navigateur, absence de
  contournement FIFO, tentative manuelle qui réutilise l'ID, confirmation
  puis libération de la commande suivante.
- E2E deux Android simulés + Firebase Auth/RTDB **émulés seulement** :
  sept échecs préparés, huitième erreur réseau injectée ; file
  localement conservée en pause, réouverture sans renvoi automatique,
  clic explicite, score fictif 5–3 accepté une seule fois (version 1).
- Vérifier workflows concernés, interface Chrome/WebKit, simulation
  partage et GitHub Pages/empreintes ; conserver les résultats précédents
  pour les fichiers et règles de sécurité non modifiés.

## Invariants
- `MILFT37/milft-tournois` officiel V1.1, championnats, scores et
  données réels, Google Drive et archives **intouchés**.
- Firebase réel Spark gratuit, connexion Google et règles de sécurité
  inchangés. Aucun test sur données réelles.
- Test réel Samsung antérieur (salle fictive et score 5–3) déjà validé ;
  test sur deux appareils physiques avec comptes Google distincts
  toujours à effectuer ultérieurement.
- **Aucune manipulation demandée sur Samsung pour MAJ91.**

## Clôture
**En cours** — consigner les commits, runs Actions, verdicts et
publication avant validation finale.
