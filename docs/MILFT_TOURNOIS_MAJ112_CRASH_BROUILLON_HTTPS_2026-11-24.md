# MILFT Tournois V2 — MAJ112 — Onglet disparu pendant une sauvegarde de brouillon

**24 novembre 2026.** Reprise après MAJ111 clôturée, commit `5098d506e87fa9217c8326439776d1fb9d4ce3c5`.

## Objectif

Tester le **véritable module V2 des brouillons** `v2/draft-multimatch-emulator.mjs` dans Chromium et WebKit, plutôt que tester seulement l'API Web Locks du navigateur. Cas critique : onglet fermé alors qu'il attend d'acquérir le verrou de sauvegarde, et reprise depuis la dernière écriture effectivement confirmée.

## Scénario automatisé

- Un serveur HTTPS de fixture minimal écoute exclusivement `127.0.0.1` dans GitHub Actions, avec certificat éphémère supprimé après le test. Il sert uniquement une page vide et le module de brouillons émulé déjà existant.
- Deux onglets du même contexte partagent les données ; un deuxième contexte possède un stockage isolé. Un compte fictif distinct dans le même contexte ne peut pas lire le brouillon de l'autre.
- L'onglet A détient le verrou du match A. L'onglet B essaie de sauvegarder une modification sous ce verrou mais se ferme avant son obtention. Vérifier que l'écriture n'a pas eu lieu et que l'ancienne version durable subsiste.
- Pendant que A reste verrouillé, B peut sauvegarder un **autre match** sans attendre ; l'isolation est par match, salle, compte et appareil.
- Après le départ de B, un nouveau navigateur reprend depuis le dernier jeton durable, écrit une nouvelle version et rejette toute tentative avec l'ancien jeton.
- Une confirmation ancienne ne doit pas supprimer le nouveau brouillon, et la fermeture de l'onglet après écriture ne doit pas empêcher la relecture persistante.
- Sans Web Locks, le module doit refuser la sauvegarde plutôt que procéder sans protection.

## Sécurité et limites

**Tests uniquement sur émulateur de navigateur HTTPS loopback dans CI.** Aucun appareil réel, Firebase réel, authentification Google, serveur LAN ou URL publique utilisée. Aucune modification du code applicatif, du prototype officiel V1.1, de Firebase Spark ou des archives Drive. Le test physique Samsung/PC et deux vrais comptes Google reste à organiser ultérieurement après accord ciblé.

## GitHub Actions

À documenter avant clôture (Chromium et WebKit). Ne pas prétendre valider le test physique.

**Action utilisateur : aucune.**
