# MILFT Tournois V2 — MAJ110 — Banc HTTPS loopback réellement exécuté

**24 novembre 2026.** Reprise de la MAJ109 clôturée, commit `8d41876025459769c29c45da01c1cbc8d58b248d`.

## Objectif

Passer du plan de transport MAJ109 à un **banc HTTPS réellement exécuté**, toujours strictement limité à `127.0.0.1` sur une machine GitHub Actions. Aucun serveur n'est ouvert au réseau local du club, aucun projet Firebase réel n'est utilisé.

## Fonctionnement du banc

- Le test `tests/v2-https-loopback-browser.cjs` génère un certificat autosigné de courte durée dans un répertoire temporaire, supprimé à la fin. Aucune clé n'est partagée ou enregistrée dans le dépôt.
- Un serveur HTTPS minimal écoute exclusivement `127.0.0.1` sur un port éphémère et sert une simple page de précontrôle, **pas l'application**.
- Le navigateur refuse le certificat autosigné avec validation TLS normale. **Uniquement pour cette CI**, un contexte Playwright autorise temporairement le certificat pour contrôler `isSecureContext`, `navigator.locks`, localStorage et IndexedDB. Sur appareil réel, un certificat reconnu sera obligatoire, sans ignorer les avertissements.
- Deux onglets du même contexte partagent localStorage et IndexedDB, et un verrou Web Locks exclusif ne peut être acquis simultanément ; un second contexte indépendant n'accède pas aux mêmes données locales.
- Les connexions navigateur sont limitées à une seule URL HTTPS loopback ; toute autre requête est bloquée et détectée. Aucun Firebase, Google, Drive ou appareil réel n'est contacté.

## Limites

Ce test **ne prouve pas** qu'un Samsung réel acceptera un futur certificat, que deux comptes Google pourront s'authentifier ni que Firebase Emulator sera accessible aux deux appareils. L'essai physique réel et la mise en réseau restent soumis à un GO spécifique ultérieur.

V1.1 officielle, Firebase réel ou candidat, GitHub Pages, championnats et archives Drive sont intacts. Pas de publication ni de modification des fichiers applicatifs.

## Vérifications GitHub Actions

À consigner ici avant clôture : exécutions Chromium et WebKit, résultats, commits de correction le cas échéant.

**Action utilisateur : aucune.**
