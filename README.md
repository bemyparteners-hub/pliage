# PliaCRM + Atelier Idle

Interface statique en HTML/CSS/JavaScript vanilla pour présenter :

1. un CRM de prospection pour une entreprise de pliage industriel ;
2. un onglet **Admin** qui contient un idle game / jeu de gestion éthique, sans argent réel, sans publicité et sans backend.

## Analyse et architecture

La demande combine une interface CRM existante et un jeu web indépendant dans un onglet Admin. L'architecture retenue est volontairement simple :

- `index.html` contient la structure de l'application, les deux vues principales et tous les points d'accroche DOM.
- `style.css` centralise le design du CRM, du panneau Admin et du jeu responsive.
- `app.js` contient deux blocs logiques : navigation/filtres CRM, puis module `IdleGame` autonome.
- `README.md` documente le lancement, les règles du jeu et les points d'équilibrage.

Cette première version ne dépend d'aucun framework, d'aucun backend et d'aucune image externe pour le jeu.

## Lancer le projet

Ouvrir directement `index.html` dans un navigateur moderne.

Pour servir localement depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir : <http://localhost:8000>

## Logique du jeu

Le joueur commence avec un petit atelier qui génère des pièces :

- le bouton **Produire** donne des pièces immédiatement ;
- chaque clic donne aussi de l'XP ;
- la boutique permet d'acheter des améliorations de gains par clic ou de gains automatiques par seconde ;
- les prix augmentent progressivement avec une formule exponentielle simple ;
- les missions courtes donnent des pièces, de l'XP et parfois des coffres ;
- les coffres sont gratuits et obtenus uniquement par progression ;
- des bonus aléatoires rares peuvent apparaître, comme x2 pièces ou un bonus d'XP ;
- les succès affichent des notifications lors du déblocage ;
- la progression est sauvegardée automatiquement dans `localStorage`.

## Fichiers créés

- `index.html` : structure du CRM et de l'onglet Admin avec toutes les sections de jeu.
- `style.css` : styles responsive, cartes, animations, grille de jeu, notifications et états visuels.
- `app.js` : navigation, filtres prospects, gameplay idle, missions, coffres, succès, sauvegarde.
- `README.md` : documentation de lancement et d'évolution.

## Équilibrage facile à modifier

Dans `app.js` :

- `upgradeDefinitions` : noms, coûts de base, croissance des prix, gains par clic/seconde et XP donnée.
- `missionDefinitions` : objectifs courts fixes, métriques suivies, récompenses et coffres.
- `getDynamicMissions()` : objectifs dynamiques qui garantissent toujours au moins trois missions proches.
- `achievementDefinitions` : conditions de succès.
- `xpForNextLevel()` : courbe de progression des niveaux.
- `rollRandomBonus()` : probabilité et nature des bonus aléatoires.
- `drawChestReward()` : raretés et récompenses des coffres.

## Idées pour une V2

- Ajouter une vue de statistiques détaillées par session.
- Ajouter des événements temporaires non monétisés, par exemple “commande urgente atelier”.
- Ajouter des spécialisations d'atelier : inox, aluminium, acier épais.
- Ajouter une mini-carte de production avec postes à débloquer.
- Ajouter un export/import manuel de sauvegarde.
- Ajouter des tests unitaires pour les formules d'économie.
- Brancher le CRM et le jeu sur un backend uniquement si nécessaire, sans changer la boucle de jeu éthique.
