# Grave Escape

A gothic-themed 2D maze runner inspired by Tomb Runner. Escape three haunted maze floors, collect every coin on each level, avoid pursuing enemies, and spend your banked coins on new skins.

## Features
- Gothic green presentation with three handcrafted 2D maze levels
- Single player and local multiplayer for up to two players
- Enemy hunters that chase the nearest player through the maze
- Coin collection objective that gates level completion
- Skin shop with persistent unlocks saved in local storage
- Win celebration after clearing all three levels
- Sidebar instructions plus in-game Rules button and `H` hotkey

## Controls
- Single Player: WASD
- Multiplayer: Player 1 uses WASD, Player 2 uses Arrow Keys
- Rules Overlay: Click `How To Play (H)` in game or press `H`
- Start or restart a run: Click `Start Game`

## How It Works
1. Choose single player or multiplayer from the sidebar.
2. Unlock or equip skins with banked coins.
3. Press `Start Game`.
4. Collect every coin in the current maze floor.
5. Reach the glowing exit to bank that level's coins and move on.
6. Clear all 3 levels to win.

## Getting Started
1. Install dependencies with `npm install`.
2. Start the development server with `npm start`.
3. Open the local URL shown in the terminal if it does not open automatically.

## Build
- Production build: `npm run build`

## Tech Stack
- TypeScript
- Phaser.js
- Webpack

## Note
All visuals are currently generated in code as placeholder shapes. Replace them with authored art and sound assets if you want a more polished release.
