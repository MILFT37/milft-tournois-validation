# MILFT Tournois V2 — Améliorations non prioritaires à prévoir

**Créé le 23 novembre 2026 — demandes utilisateur.**
**Statut : À FAIRE PLUS TARD / NON PRIORITAIRE.** Ne pas commencer ce développement avant les travaux de fiabilisation et de synchronisation en cours. Ce document conserve les besoins et les points à préciser, sans prétendre qu'ils sont déjà développés ou validés.

## NP-01 — Saisie du score en direct par incréments (+ / −)

**Contexte** : lorsqu'un **arbitre** suit et saisit lui-même le match, ou lorsqu'un **capitaine d'équipe** saisit le score dans la **course aux points**, la saisie doit pouvoir être actualisée point par point pendant le jeu.

**Demande** :
- Prévoir, pour **chaque camp**, un contrôle de score avec un bouton **−** à gauche, le score actuel au centre et un bouton **+** à droite, avec des zones d'appui suffisamment grandes pour Android.
- Un appui sur `+` ajoute exactement un but/point ; un appui sur `−` retire exactement un but/point (correction d'une erreur).
- Conserver la **saisie manuelle classique** actuelle comme alternative : la nouvelle interface n'est pas imposée à tous les matches ni à tous les utilisateurs.
- Prévoir un mode de suivi en direct pour les matchs gérés par arbitre et la course aux points pilotée par capitaine. Étudier le choix de ce mode dans la configuration du format et/ou du match.

**Contraintes d'intégration ultérieure** :
- Bien différencier un **score provisoire en cours de jeu** (par exemple 1–0, 2–1) d'un **score final validé**. Les contraintes de fin de manche (5, 7, 8, belles à deux d'écart et maximum 8–7) ne doivent pas interdire les étapes intermédiaires légitimes.
- Garder les bornes adaptées au **format choisi**, sans appliquer le plafond général de 8 indépendamment du format. Interdire les compteurs négatifs et les incréments au-delà des règles applicables.
- Les +/− doivent être fiables en multi-appareils, y compris perte réseau, file locale, conflit, double appui, reprise et plusieurs intervenants. Un appui ne doit pas être compté deux fois.
- Clarifier avant implémentation les **droits d'accès** d'un arbitre / capitaine, sans confondre ces rôles sportifs avec les droits `admin/editor/viewer` du prototype.
- La logique des compteurs en **course aux points** devra respecter le bloc/relais et ses paliers configurés, et ne pas être traitée comme une simple manche 5/7/8.
- Aucun changement immédiat au prototype, aux règles Firebase réelles, à la V1.1 ou aux données existantes.

## NP-02 — Temps morts pendant le match en direct

**Contexte** : pouvoir indiquer et suivre les temps morts accordés pendant une rencontre en direct, avec un compteur adapté au format sportif.

**Valeurs par défaut souhaitées par l'utilisateur** :

| Type de rencontre | Temps morts par défaut | Unité de comptage |
|---|---:|---|
| Poules | **0** | Par manche/partie selon la configuration du format |
| Tableaux / phases finales | **2** | **Par manche** |
| Course aux points | **1** | **Par bloc** (relais), et non par manche du tableau |

**Paramétrage envisagé** :
- Ajouter dans les **paramètres du format** un nombre de temps morts autorisés, modifiable pour chaque format/phase ; les nombres ci-dessus sont des **préréglages** et non des limites codées en dur.
- Pendant le suivi en direct : indiquer qu'un temps mort a été pris et afficher le nombre **utilisé / restant** ; prévoir la correction d'une saisie accidentelle avec traçabilité, sans dépasser le quota.
- Réinitialiser le compteur à la bonne unité : nouvelle manche du tableau, nouveau bloc de course aux points, ou selon la configuration retenue pour les poules.
- Avant de développer, confirmer **qui bénéficie du quota** (par équipe/camp ou pour l'ensemble de la rencontre), ainsi que le rôle autorisé à le déclarer, la durée éventuelle et les règles particulières. Ne pas imposer une hypothèse non validée.
- En multi-appareils, empêcher qu'un même temps mort soit décompté deux fois et garantir la reprise après déconnexion, selon les mêmes mécanismes sûrs que les scores.

## Priorité, conditions et validation

- **Priorité actuelle : basse / plus tard**, distincte des MAJ de fiabilisation V2 et du test physique Samsung/PC toujours à réaliser.
- Prévoir les deux fonctionnalités comme options compatibles avec les **formats configurables**, sans modifier les règles de compétition déjà validées.
- Au moment de leur réalisation : tests unitaires de format, tests sur Firebase Emulator et vérifications GitHub Actions avant toute demande d'autorisation de déploiement réel.
- **V1.1 de production, Firebase réel, tournois/championnats et archives Google Drive intouchables sans autorisation spécifique.**

**Enregistrement documentaire uniquement — aucune action utilisateur nécessaire actuellement.**
