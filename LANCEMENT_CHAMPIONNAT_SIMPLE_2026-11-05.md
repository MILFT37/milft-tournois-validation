# MILFT Tournois — championnat annuel Simple — lancement du 5 novembre 2026

## Version gelée
- Branche de lancement : `release-championnat-simple-2026-11-05`.
- Application : `index.html` (redirige vers le fichier HTML de validation).
- Production `MILFT37/milft-tournois` : ne pas modifier.
- La validation des tests automatisés de la branche de développement a été confirmée verte avant création de cette branche.

## Avant le lancement officiel
1. Vérifier que l'hébergement publie **cette branche** et non une autre. La présence du code sur GitHub ne prouve pas que GitHub Pages sert cette branche.
2. Ouvrir le lien public réel depuis le téléphone qui servira à saisir les résultats. Vérifier l'écran de création du championnat annuel Simple.
3. Créer le championnat avec les joueurs et le bon choix **aller simple** ou **aller-retour**. Vérifier le nombre de rencontres : N × (N − 1) / 2 (aller) ou N × (N − 1) (aller-retour).
4. Exporter immédiatement une sauvegarde JSON, puis vérifier que le fichier existe dans les téléchargements.
5. Après chaque séance, exporter une nouvelle sauvegarde et la conserver sur un autre support (par exemple Drive).
6. Ne pas effacer les données du navigateur ni changer de navigateur ou de téléphone en supposant que les données se synchronisent automatiquement.

## Risques à garder en tête
- Les données du championnat sont stockées localement dans le navigateur. L'accès depuis un autre appareil ne garantit pas la présence des mêmes données.
- Le bouton de sauvegarde exporte une sauvegarde globale de l'application, pas uniquement le championnat.
- Le parcours complet a été vérifié par tests automatisés ; le lien d'hébergement et un export réel sur le téléphone doivent encore être vérifiés avant le lancement.

## Retour arrière
Conserver les sauvegardes JSON précédentes ; ne pas restaurer un fichier sans contrôler sa date et son contenu.
