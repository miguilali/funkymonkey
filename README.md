# 🐵 FUNKY MONKEY — Prototype jouable (7 Mondes)

Prototype HTML5 jouable **directement dans le navigateur du téléphone**, d'après le pitch
**FUNKY MONKEY — Take OFF 2026** (Edgar von Bobono, platformer 2D mid-core).

## 🎮 Contenu

- **7 mondes** générés avec difficulté progressive :
  1. La Jungle Profonde — **King Croc**
  2. La Savane Dorée — **Rhynok**
  3. Le Désert Mystique — **Scorpion Pharaon**
  4. La Forêt Enchantée — **Sorcière Araignée**
  5. Le Canyon des Esprits — **Sultan Mané**
  6. Le Marais Toxique — **Venom Rex**
  7. Le Volcan du Chaos — **Gorilla King** (boss final, 2 phases)
- Mécaniques du pitch : course fluide, sauts précis (coyote time + saut variable),
  combat (coup de poing + écrasement), bananes à collecter, 3 cœurs.
- Chaque boss a un pattern télégraphié et une **fenêtre de vulnérabilité** (étoile ⭐ au-dessus).
- Contrôles **tactiles** (gauche/droite/saut/attaque) + clavier pour tester sur PC.
- Sauvegarde de la progression (localStorage), musique et bruitages (WebAudio).
- Visuels 100% dessinés en code (canvas) : **provisoires**, prêts à être remplacés
  par les assets définitifs.

## 📱 Jouer sur téléphone

1. Héberger le dossier (ex. **GitHub Pages** : Settings → Pages → branche `main`).
2. Ouvrir l'URL sur le téléphone → jouer. Optionnel : « Ajouter à l'écran d'accueil ».

Sur PC : ouvrir `index.html` — flèches ← →, **Espace** = sauter, **X** = attaquer.

## 📁 Structure

```
index.html          Page unique (canvas + écrans DOM)
style.css           Interface (HUD, boutons tactiles, menus)
js/audio.js         Sons & musique (WebAudio, zéro fichier)
js/input.js         Contrôles tactiles + clavier
js/worlds.js        Thèmes des 7 mondes + génération procédurale des niveaux
js/entities.js      Edgar (physique), ennemis, projectiles
js/bosses.js        IA des 7 boss + dessins des boss
js/game.js          Boucle de jeu, collisions, caméra, rendu des décors
js/main.js          Menus, carte des mondes, sauvegarde
```

## 🎨 Intégration des assets définitifs (à venir)

Le dossier `assets/` accueillera les visuels du studio. Points de remplacement prévus :

| Asset attendu | Remplace | Où |
|---|---|---|
| `edgar.png` (idle/run/jump) | Edgar dessiné en code | `drawPlayer` (js/game.js) |
| `fond-<monde>.png` | ciel + collines | `drawBackground` |
| `tiles-<monde>.png` | tuiles sol/plateformes | `drawTiles` |
| `boss-<type>.png` | boss dessinés en code | `drawBoss` (js/bosses.js) |
| `ennemi-<monde>.png` | ennemis | `drawEnemy` |

La mécanique (physique, IA, niveaux) est indépendante du rendu : les remplacements
ne toucheront qu'aux fonctions de dessin.

## 🗺️ Roadmap (cf. pitch)

- [x] Prototype core loop : course / saut / combat
- [x] 7 mondes + 7 boss (scope étendu à la demande)
- [ ] Remplacement par les assets définitifs
- [ ] Réglage de la difficulté + playtests (rétention D1, complétion tuto)
- [ ] Monétisation éthique : cosmétiques Edgar, Funky Pass (zéro pay-to-win)
