# MILFT Tournois V1.1 — MAJ 58 — Sécurisation de l'activation des sauvegardes réelles

Date : 19 novembre 2026. Complément des MAJ 47–57. L'utilisateur a donné son GO pour poursuivre les travaux sur GitHub **en validation**, pas pour exporter ses données personnelles vers Drive ou promouvoir en production.

## Références et acquis non à recommencer
- La MAJ 57 valide sur Samsung la lecture des archives après déplacement manuel des dossiers vers **Appli MILFT / MILFT Tournoi**, avec protection de l'archive fictive mal classée.
- Les tests anciens sont conservés : Drive n°32, PWA n°10, Pages n°233, WebKit n°25, Chromium mobile n°256, championnat annuel n°318, Course aux points n°274, attribution tables n°234, ergonomie n°209 : SUCCESS.
- Les nouveaux tests généraux déclenchés par ce correctif applicatif : Pages n°234, PWA n°11, Chromium mobile n°257, WebKit n°26, championnat annuel n°319, Course aux points n°275, ergonomie n°210 : SUCCESS au dernier contrôle. Attribution tables n°235 était encore en cours : vérifier son résultat avant validation globale.

## Modifications techniques
- Commit `e0737e3304f4b5e0f1a866b0fcd56053ddbec3a6`, dépôt `MILFT37/milft-tournois-validation` :
  - Avant le **premier envoi manuel ou automatique**, présentation d'un aperçu quantitatif basé uniquement sur le navigateur courant : nombre de joueurs et d'enregistrements internes de tournois ; avertissement si la source est vide. Cette information ne constitue pas un calcul des événements A/B séparés.
  - Aucun envoi sans confirmation explicite. Les archives préexistantes ne sont jamais remplacées.
  - Le bouton de sauvegarde manuelle et le bouton d'activation automatique sont désactivés pendant une requête d'envoi pour éviter les actions concurrentes.
  - L'automatisation n'est activée **qu'après confirmation du premier téléversement**. Si ce premier envoi échoue, elle reste désactivée ; les données locales sont conservées.
  - En cas de jeton Google expiré, l'automatisation est arrêtée et les boutons rafraîchis : une reconnexion réelle est requise.
  - Le cache PWA et les deux pages de validation utilisent le module versionné `?v=20261119-drive-consent-01`.
  - Aucun changement dans la production officielle ni aucune écriture réelle sur le Drive utilisateur effectuée depuis ce travail.
- Test `tests/drive-v11-browser.cjs` étendu : aperçu explicite, échec du premier envoi et désactivation de l'automatique, succès après reconnexion, annulation sans écriture et conservation des données locales.
- Drive n°33, run `44507204238`, a échoué sur un scénario de test qui réactivait l'automatique immédiatement après un HTTP 403 sans nouvelle connexion (blocage de sécurité attendu).
- Commit de correction du **test uniquement** `1d11336a2203c44a3159082630c86d6761a0e956` : reconnexion Google simulée explicitement avant test du succès ; le mécanisme de blocage après refus reste intact.
- Drive n°34, run `44507451145` : **en cours au point de rédaction**. Contrôler le résultat et corriger uniquement si un défaut réel est révélé.

## Limites et suite
1. Conserver tous les contrôles déjà réussis, sans nouveaux essais Samsung répétés.
2. Vérifier Drive n°34 et attribution tables n°235. Ne pas annoncer leur succès sans GitHub.
3. Quand ces contrôles sont verts, proposer la **seule validation réelle encore manquante** : consentement informé et premier dépôt de sauvegarde des données réelles depuis l'application complète, avec confirmation que le bon appareil contient bien le championnat ; vérifier ensuite l'archive sans restauration destructrice. Cette écriture nécessite un accord distinct de l'utilisateur.
4. La sauvegarde automatique n'est pas garantie lorsque l'application est fermée, le navigateur suspendu ou la connexion Google expirée ; Drive est une archive JSON, **pas une synchronisation temps réel entre Android et PC**. Tout doit rester 100 % gratuit.
5. Promotion en production seulement sur **GO distinct et explicite**, sans effacer la sauvegarde de référence du championnat ni les données locales.
