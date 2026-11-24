# MILFT Tournois V2 — MAJ111 — Libération de verrou au départ d'un onglet

**24 novembre 2026.** Reprise après la MAJ110 clôturée, commit `fa4d2b1bbc1a1d4958db214afb6068385aa42093`.

## Périmètre

Compléter uniquement le banc HTTPS loopback MAJ110 : ne modifier ni le prototype de production V1.1, ni les règles Firebase, ni les données de tournois ou les archives Drive.

## Scénario ajouté

- Deux onglets sur la même origine HTTPS simulée et le même contexte navigateur ; un onglet détient un verrou Web Locks exclusif.
- Le second onglet attend ce verrou.
- Fermeture soudaine de l'onglet détenteur : son verrou doit être libéré par le navigateur, puis le second onglet doit pouvoir continuer.
- Vérifier la conservation du brouillon fictif en IndexedDB/localStorage après la fermeture et après le rechargement du second onglet.
- Exécuter le tout sur Chromium et WebKit, sans serveur LAN, sans Firebase réel, sans comptes Google et sans transfert des ressources de test sur le réseau.

## Limites

Cette simulation vérifie uniquement la sémantique des verrous et du stockage dans le navigateur. Elle n'autorise pas un test physique ni la connexion de deux vrais comptes Google. Un certificat approuvé et un environnement isolé seront encore nécessaires avant un vrai essai réseau avec GO spécifique.

## Tests GitHub Actions

À consigner après succès.

**Action utilisateur : aucune.**
