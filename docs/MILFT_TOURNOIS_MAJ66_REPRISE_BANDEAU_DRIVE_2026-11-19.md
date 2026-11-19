# MILFT Tournois — MAJ 66 — Reprise nouveau chat : bandeau Google Drive V1.1

**Date : 19 novembre 2026.** Point de transmission après les MAJ 47–65. **Ceci est une feuille de route de reprise, pas une fonctionnalité déployée.**

## GO en cours — à exécuter dès le prochain chat

L'utilisateur a constaté sur son Samsung, dans la **production V1.1**, le grand bandeau jaune en haut :
> « SAUVEGARDE LOCALE ACTIVE • Google Drive facultatif : connexion et sauvegardes dans Paramètres »

La capture de l'écran Paramètres montre aussi « **Données complètes — Google connecté à MILFT** ».

Sa question : « Car je suis connecté donc partagé sur drive et donc c'est plus local ». Réponse validée :
- **Les données restent locales** sur le navigateur/appareil, pour les matchs et joueurs.
- **Google connecté** prouve la connexion OAuth, **pas** l'envoi immédiat des dernières modifications.
- La sauvegarde Drive est une **copie ponctuelle** : manuelle sur confirmation ou automatique seulement si l'utilisateur l'a activée ; pas de synchronisation multi-appareils V1.1 (report V2.0).
- L'utilisateur a répondu **« Oui go »** pour **remplacer le bandeau jaune par un indicateur compact et dynamique** distinguant les états. **Ne pas lui redemander ce GO.**

L'assistant a annoncé une correction validation → tests → production. Il a commencé l'inspection du code, **mais le changement de chat est intervenu avant que les modifications d'application ne soient enregistrées**. Ne pas déclarer la correction faite tant que les fichiers ne sont pas modifiés, les workflows réussis et la production publiée.

## Attendu d'interface

- Remplacer l'immense bandeau jaune statique par un bloc **compact**, mobile-first, lisible sur Samsung, sans masquer l'en-tête MILFT.
- **Ne pas écrire « Drive synchronisé » ou « données partagées »** : cela promettrait un partage temps réel inexistant.
- Distinguer explicitement :
  - **Données conservées localement** (toujours vrai pour l'instance actuelle).
  - Drive non connecté / en cours de connexion / connecté (OAuth confirmé).
  - Modifications locales en attente d'un envoi Drive.
  - Dernière **sauvegarde Drive confirmée**, seulement après confirmation effective de l'API Drive et avec une date connue ; ne pas confondre autorisation OAuth et envoi réussi.
  - Sauvegarde automatique désactivée ou activée **avec la fréquence choisie** (5, 10, 15, 30 ou 60 min) ; arrêtée ou en erreur si quota 200/jour, 403, 429 ou expiration.
  - Hors connexion : ne pas annoncer un envoi possible.
- Si l'état n'est pas connu après rechargement, afficher un état honnête plutôt qu'un faux horodatage.
- Éviter les libellés contradictoires dans le panneau Paramètres et le grand indicateur.
- Ne pas créer une nouvelle sauvegarde réelle pour tester l'indicateur : utiliser une API Drive fictive et des données synthétiques dans les tests automatisés.

## Références fiables du projet

- **Production officielle** : dépôt `MILFT37/milft-tournois`, branche `main`, commit confirmé au 19/11 : **`0ef73bbb85cae5e2aacabd3f219c02b7c2013a7b`**.
- Dernières vérifications production : GitHub Pages n°20 run `44547379995` **SUCCESS** et PWA n°7 run `44547381352` **SUCCESS**. Ne pas les refaire sur une version inchangée.
- **Validation** : dépôt `MILFT37/milft-tournois-validation`, branche `main`, commit au point de reprise **`cd0c3c29b807e6f4d0032ad2caf92bae9205c0e2`**.
- HTML validation : `MILFT_Tournois_V1_1_VALIDATION_HEBERGEMENT_STABLE_2026-11-02.html`.
- Module validation : `milft-drive-v11-validation.js`.
- Candidate production isolée : `candidate-production-v11/MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html`, module `candidate-production-v11/milft-drive-v11-production.js`.
- Production réelle : `MILFT_Tournois_V1_1_PRODUCTION_PRETE_2026-11-17.html`, `milft-drive-v11-production.js`, `sw.production.js`.
- Test de parité : `tests/production-candidate-parity.cjs`, tests Drive `tests/drive-v11-browser.cjs`, et candidate `tests/production-candidate-browser.cjs`.
- Versionner les caches `sw.validation.js` et `candidate-production-v11/sw.production.js` si les HTML/modules changent. Tester la PWA avant publication.
- Corriger **validation et candidate d'abord**, ajouter des tests sur l'état du bandeau, vérifier les workflows, puis promouvoir **uniquement cette correction d'interface**, maintenant autorisée par le GO utilisateur.
- Actualiser cette feuille de route avec les commits, workflows, preuves et étapes effectuées.

## État des données — NE PAS TOUCHER

- Production V1.1 ouverte et confirmée sur Samsung.
- Capture Samsung à 15 h 40 : **42 joueurs** et **4 tournois à suivre** déjà présents dans la production. Ne pas restaurer la sauvegarde réelle car elle pourrait les remplacer.
- Archive réelle historique du 19/11/2026 à 11:55, fichier `MILFT_TOURNOIS_manuel_2026-11-19T10-55-22-532Z_f933b9ad-5e9.json`, 42 joueurs / 7 enregistrements techniques, conservée sur Drive ; aucune nouvelle écriture demandée.
- Aucun effacement local, aucun import automatique, aucune modification de joueurs, scores, formats ou classements.
- Sauvegardes automatiques Drive **désactivées par défaut**, fréquence réglable 5/10/15/30/60 min, défaut 15 min et quota de 200 envois auto/jour/appareil ; sauvegarde manuelle hors quota automatique.
- La synchronisation réelle multi-appareils est **V2.0**. La MAJ 65 a créé une simulation isolée réussie (workflow n°1 `44548490947` SUCCESS), **pas** une synchronisation Firebase en service.

## Protocole impératif de reprise

1. **Ne pas redemander le GO** : il a déjà été donné pour le bandeau dynamique de V1.1.
2. Inspecter les positions précises du bandeau HTML (dont `milft-iso-warning`) et les fonctions `status`, `changed`, `upload`, `toggleAuto`, `disconnect`, `refreshButtons` dans les modules Drive. Réutiliser leurs états réels, éviter les statuts simulés.
3. Modifier directement le HTML/JS de **validation**, et la candidate, en assurant la parité métier et l'isolation des clés. Ajouter des tests Chromium/WebKit sur les états affichés.
4. Vérifier GitHub Actions et GitHub Pages puis déployer sur le dépôt officiel **sans altérer les données**. Le GO couvre cette correction visuelle, pas une restauration ou un élargissement des permissions Drive.
5. Vérifier l'état final et inscrire une MAJ 67 si nécessaire.
6. L'utilisateur n'intervient que si indispensable, **depuis son Samsung Android**. Ne pas lui demander de répéter des vérifications déjà validées.
7. Document et tests GitHub font foi d'un chat à l'autre. Continuer de manière autonome, ne pas s'arrêter après chaque étape pour demander « GO ».
