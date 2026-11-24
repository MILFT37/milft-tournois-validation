# MILFT Tournois V2 — MAJ108 — Faisabilité réseau local et sécurité de la saisie

**24 novembre 2026 — GO de continuation technique.** Reprise après MAJ107 clôturée (`cd39d4ec059b99d2c5cc104b99c2795cf19c9902`).

## Statut et décision

**Étude technique + contrôle automatique uniquement.** Le test physique Samsung/PC avec deux comptes Google distincts reste **non réalisé**. Il n'existe pas encore de serveur LAN exposé, ni de candidate V2 publiée sur Firebase réel.

La MAJ108 ne change ni le prototype multi-match existant ni le contenu de GitHub Pages. Elle identifie un préalable bloquant à un vrai test sur appareils séparés : **l'usage de HTTPS en réseau local**, car le système de brouillons MAJ100 dépend de `navigator.locks`, réservé à un contexte sécurisé. `http://localhost` est considéré comme digne de confiance par les navigateurs courants, mais **`http://192.168.x.x` ne l'est pas**. Une simple ouverture du serveur Firebase Emulator sur le réseau ne suffit donc pas et serait un faux test.

## Livrables MAJ108

- `tests/v2-lan-preflight-browser.cjs` : teste avec Chromium puis WebKit que `http://127.0.0.1` fournit un contexte sûr et des Web Locks, alors qu'une **origine IP LAN simulée, sans émission de requête réseau**, est non sécurisée et ne fournit pas Web Locks.
- `.github/workflows/v2-lan-preflight.yml` : contrôle ciblé, sans Firebase, Google, authentification, données réelles ni accès au réseau local.
- Contrôles de sécurité dans le test : configuration Auth/RTDB Emulator limitée à `127.0.0.1`, code prototype protégé par son garde `localhost`, files multi-match exclues du déploiement GitHub Pages.
- Les fichiers V1.1 et l'application officielle restent inchangés. Pas de campagne de validation sportive répétée sur les fichiers inchangés.

## Architecture cible à préparer **plus tard**, sans activation

1. Choisir une configuration de test temporaire et fermée au LAN, en HTTPS avec certificat réellement accepté par le Samsung et le PC (pas simplement un avertissement navigateur ignoré).
2. Servir un **clone isolé** de la page et des scripts de test, distinct de la V1.1 et du prototype V2 public, en n'exposant que les ressources nécessaires.
3. Distinguer explicitement les origines navigateur et les adresses du PC : une connexion Firebase Emulator à `127.0.0.1` depuis le Samsung viserait le téléphone lui-même, pas le PC. Utiliser un routage d'essai sécurisé explicitement accepté et un réseau limité, sans liaison au Firebase réel du club.
4. Prévoir les protections de session, de droits, de brouillons et de nettoyage des seules données fictives ; pas de suppression d'archives Drive ou de tournois.
5. Pour le test **réel** avec deux comptes Google, l'émulation anonyme ne suffit pas : cette capacité devra faire l'objet d'une autorisation spécifique et d'une configuration distincte. Ne jamais demander ni enregistrer de mots de passe Google.

## Non-objectifs et interdictions

- **Ne pas** lier Auth/RTDB Emulator à `0.0.0.0` ou une IP privée à cette étape.
- **Ne pas** modifier les règles Firebase réelles ou candidates, ni publier les modules d'émulation via GitHub Pages.
- **Ne pas** changer V1.1, Firebase Spark, championnats, données réelles ou archives Google Drive.
- **Ne pas** confondre ce test de prérequis local avec une réussite physique entre deux appareils.

## Critère de clôture

Deux tests navigateur **SUCCESS** (Chromium + WebKit) ; le dernier commit et les identifiants GitHub Actions seront enregistrés ici. Le test physique demeure en attente et nécessitera son **GO spécifique**.

**Action utilisateur maintenant : aucune.**
