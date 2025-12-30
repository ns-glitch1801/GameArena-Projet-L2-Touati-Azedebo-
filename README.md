# 🎮 GameArena - Plateforme de Jeux IA

## 📋 Description du Projet

GameArena est une plateforme de jeux web interactive qui permet de jouer contre une intelligence artificielle avancée. La plateforme comprend plusieurs jeux classiques et un jeu Unity 3D.

### Jeux Disponibles

1. **Tic-Tac-Toe** - Morpion avec IA Minimax imbattable
2. **Connect 4** - Puissance 4 avec IA avancée
3. **Chess** - Échecs avec IA utilisant l'évaluation matérielle
4. **Tank War** - Jeu Unity 3D de combat de tanks

### Fonctionnalités Principales

- 🤖 **Intelligence Artificielle** : IA adaptative utilisant des algorithmes avancés (Minimax, évaluation heuristique)
- 📊 **Système d'Analyse** : Évaluation de vos parties avec feedback détaillé
- 🎯 **Progression par Niveaux** : Difficulté croissante
- 💾 **Sauvegarde Automatique** : Vos progrès sont sauvegardés localement
- 🎨 **Interface Moderne** : Design premium avec animations fluides

---

## 🚀 Comment Lancer le Projet

> **⚠️ IMPORTANT** : Si vous téléchargez le projet depuis GitHub en ZIP, **EXTRAYEZ D'ABORD LE ZIP** ! Ne lancez pas le serveur depuis le fichier ZIP compressé, sinon vous aurez des erreurs 404.

### Méthode 1 : Lancement Rapide (Recommandé)

1. **Extrayez le fichier ZIP** (si téléchargé depuis GitHub) dans un dossier de votre choix
2. **Double-cliquez** sur le fichier `START_SERVER.bat`
3. Une fenêtre de terminal s'ouvrira et **le navigateur s'ouvrira automatiquement** sur la plateforme
4. Profitez de la plateforme ! 🎮

> **Note** : Le navigateur s'ouvre automatiquement sur `http://localhost:8082/index.html`

### Méthode 2 : Lancement Manuel

Si vous préférez lancer manuellement :

```bash
# Avec Python (requis par défaut sur Windows)
python -m http.server 8082
```

Puis ouvrez `http://localhost:8082/index.html` dans votre navigateur.

### ⚠️ Comment Arrêter le Serveur

**IMPORTANT** : Pour éviter les conflits de port, arrêtez correctement le serveur après utilisation :

1. **Cliquez dans la fenêtre du terminal** où le serveur tourne
2. **Appuyez sur `Ctrl+C`**
3. Le serveur s'arrêtera proprement

> **Note** : Si vous fermez simplement la fenêtre sans faire `Ctrl+C`, le serveur peut continuer à tourner en arrière-plan. Si vous rencontrez une erreur "port déjà utilisé", ouvrez le Gestionnaire des tâches (Ctrl+Shift+Esc), allez dans "Détails", et arrêtez tous les processus `python.exe`.

---

## 📁 Structure du Projet

```
GameArena_Submission/
├── index.html              # Page principale
├── START_SERVER.bat        # Script de démarrage
├── README.md              # Ce fichier
├── css/                   # Styles CSS
│   ├── global.css
│   ├── components.css
│   └── games.css
├── js/                    # Code JavaScript
│   ├── app.js            # Point d'entrée
│   ├── game.js           # Gestion du jeu
│   ├── core/             # Modules core
│   │   ├── App.js
│   │   ├── Router.js
│   │   └── EventBus.js
│   └── games/            # Logique des jeux
│       ├── TicTacToe.js
│       ├── Connect4.js
│       └── Chess.js
└── assets/               # Ressources
    └── tankwar/          # Jeu Unity
```

---

## 🔧 Configuration (Optionnel)

### Intégration API IA

Pour activer l'analyse IA avancée, vous pouvez configurer une clé API :

1. Lancez la plateforme
2. Allez dans **Paramètres**
3. Entrez votre clé API Gemini ou OpenAI
4. L'IA passera de OFFLINE 🔴 à ONLINE 🟢

> **Note** : La plateforme fonctionne parfaitement sans API grâce aux IA locales implémentées.

---

## 🎯 Comment Jouer

1. **Sélectionnez un jeu** depuis le menu principal
2. **Choisissez votre niveau** (Level 1 pour commencer)
3. **Jouez contre l'IA**
4. **Recevez une analyse** de votre performance
5. **Progressez** vers les niveaux supérieurs

---

## ⚙️ Prérequis Techniques

- **Navigateur Web Moderne** : Chrome, Firefox, Edge, Safari (version récente)
- **Python** : Inclus par défaut sur Windows 10/11
- **Connexion Internet** : Optionnelle (uniquement pour les fonctionnalités IA en ligne)

---

## 🐛 Dépannage

### Le serveur ne démarre pas ?

- Vérifiez que le port 8082 n'est pas déjà utilisé
- Essayez de fermer et relancer `START_SERVER.bat`

### Le jeu Unity ne se charge pas ?

- Assurez-vous que le serveur web est actif
- Vérifiez que les fichiers dans `assets/tankwar/` sont présents
- Essayez de rafraîchir la page (F5)

### Les jeux ne s'affichent pas correctement ?

- Videz le cache du navigateur (Ctrl + F5)
- Vérifiez la console du navigateur (F12) pour les erreurs

---

## 📜 Technologies Utilisées

- **Frontend** : HTML5, CSS3, JavaScript ES6+
- **Architecture** : Composants modulaires, Event Bus
- **IA** : Algorithmes Minimax, Heuristiques
- **3D** : Unity WebGL
- **Serveur** : Python HTTP Server

---

## 👨‍💻 Développement

### Version

**GameArena v11.7**

### Dernières Améliorations

- ✅ Système d'analyse IA implémenté
- ✅ Interface utilisateur refinée
- ✅ IA Minimax optimisée pour Tic-Tac-Toe
- ✅ Intégration du jeu Unity Tank War
- ✅ Système de progression par niveaux
- ✅ Architecture modulaire avec Event Bus

---

## 📞 Support

Pour toute question ou problème, consultez :
- La console du navigateur (F12)
- Les logs du serveur dans le terminal

---

**Bon jeu ! 🎮🏆**
