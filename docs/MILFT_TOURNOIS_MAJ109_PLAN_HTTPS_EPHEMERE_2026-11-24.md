# MILFT Tournois V2 — MAJ109 — Architecture HTTPS éphémère sur LAN (non activée)

**24 novembre 2026.** Reprise après MAJ108 clôturée : `d1678a8406e4a4f803de0a9600aecfa9675c95a8`.

## Décision : préparation sans activation

**Architecture proposée uniquement, aucun serveur démarré, aucun test physique réel exécuté.** L'objectif est de pouvoir faire tester ultérieurement le prototype V2 multi-match sur Samsung et PC, sans déployer le prototype sur GitHub Pages et sans utiliser Firebase réel.

### Option privilégiée pour une première validation de transport

Un serveur d'essai temporaire sur le PC du club, servi en HTTPS avec un **certificat approuvé** par le Samsung et le PC, limité au réseau local de confiance et à une fenêtre de test explicitement autorisée. Un reverse proxy HTTPS pourra présenter l'interface de test et relayer **exclusivement** les ports nécessaires des émulateurs Auth/RTDB, qui devront rester en écoute loopback et non sur `0.0.0.0`. Tous les chemins non autorisés seront refusés. Les URL Firebase côté navigateur et les connexions WebSocket éventuelles devront être testées après adaptation **dans une copie réservée à l'essai**, jamais dans les modules de production ou sur les règles Firebase réelles.

**Point déterminant :** servir en HTTPS ne garantit pas à lui seul l'authentification réelle de deux comptes Google. Les identités émulées restent anonymes et les deux vrais comptes devront faire l'objet d'une étape de validation distincte. Ne pas mélanger ce prétest de transport et ce futur test d'identités Google.

### Préconditions de sécurité à vérifier avant toute ouverture

1. **GO spécifique de mise en réseau de l'essai** : aucun équipement du club ou adresse locale ne doit être exposé sans autorisation distincte.
2. Certificat HTTPS reconnu par le téléphone sans forcer « continuer malgré l'avertissement » ; les mécanismes Web Locks, stockage et IndexedDB doivent fonctionner dans ce contexte sécurisé.
3. Accès filtré sur le réseau local privé et durée limitée ; pas de port ouvert vers Internet, redirection NAT, DNS public ni tunnel externe.
4. Aucun accès aux données réelles, aucune importation de sauvegardes et archives Drive ; seulement des salles et matchs fictifs.
5. Auth et Database Emulator sur `127.0.0.1`, projet `demo-milft-v2-94` exclusivement ; proxy filtré. Pas d'écriture dans Firebase réel.
6. Deux contextes navigateur physiquement distincts, aucun appareil maître et reprise bidirectionnelle ; arrêt du test si incohérence de droits, de scores ou de brouillons.
7. Arrêt net : extinction du serveur HTTPS d'essai, de son proxy et des émulateurs ; vérifier que rien n'écoute encore sur le LAN. Ne pas restaurer de données réelles ni supprimer des archives.

### Choix techniques restant à arbitrer

- Confiance et distribution du certificat : autorité interne ou autre méthode de confiance contrôlée, sans installation ni modification sur le Samsung à ce stade.
- Accès au PC servant les émulateurs, pare-feu, isolation réseau et éventuel usage du partage de connexion.
- Gestion des URL Auth/RTDB et des connexions persistantes via HTTPS/WebSocket, et séparation des origines pour les protections de stockage.
- Test de l'authentification Google réelle dans un environnement dédié, nécessitant une autorisation future spécifique et distincte.
- Compatibilité du mode iPhone/Safari, si retenu pour une phase ultérieure.

### Portée de la MAJ109

Préparation documentaire et audit statique automatique uniquement. **Pas de configuration proxy déployable**, de certificat créé, de serveur ou tunnel démarré, ni de connexion au LAN. Les fichiers `v2/mobile-multimatch-emulator.*`, Firebase et la V1.1 restent inchangés.

**Aucune action utilisateur nécessaire.** Le test physique réel reste non réalisé.

## Validation GitHub Actions

- Commit de préparation `b28acbdfa6edd4c744b6147c24562ff4029ca982`.
- GitHub Actions `45360212921` : **SUCCESS**. Audit hors réseau des exigences du plan, du loopback Firebase Emulator et de l'absence de publication multi-match via GitHub Pages.

## Clôture MAJ109 — 24 novembre 2026

**MAJ109 VALIDÉE ET CLÔTURÉE — PLAN / AUDIT SEULEMENT.**

Aucun serveur HTTPS installé ni démarré. Aucun émulateur accessible depuis un autre appareil. Aucune connexion à des comptes Google réels. Aucun déploiement, aucune modification des règles Firebase, de V1.1, des données des championnats ou des archives Drive.

**Suite :** la préparation documentaire et les contrôles non intrusifs sont terminés pour cette étape. Une mise en réseau véritable et un test sur appareil physique devront faire l'objet d'une autorisation ciblée ; ne pas les lancer automatiquement au titre du GO de développement autonome.

**Action utilisateur actuelle : aucune.**
