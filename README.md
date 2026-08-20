# Kings Corner

Copyright © 2026 tahayusab. All Rights Reserved.

This repository and its contents are the intellectual property of tahayusab. You are welcome to view the code for educational purposes. However, you may not copy, clone, distribute, modify, or use this code, in whole or in part, without explicit written permission from the author.

---

## About the Game

Kings Corner (also known as Kings in the Corner) is a classic multiplayer card game. 

### Gameplay Rules
- 2 to 6 players. If 5 or more players join, the game automatically shuffles and combines two standard decks.
- Players drag and drop cards to build descending stacks of alternating colors on the board cross piles.
- Kings can only be placed on the corner piles (NW, NE, SW, SE).
- The first player to play all the cards from their hand wins!

---

## Technical Features
- **Custom Pointer Drag & Drop**: Bypasses browser restrictions to allow custom cursors (grabbing hand) and eliminate default cancel indicators.
- **Dynamic Layout**: Smooth table-like circular seating positioning for up to 6 players.
- **Visual Enhancements**: Real-time turn indicators (glowing active badges) and custom geometric card back designs.
- **Crossplay Ready**: Runs on Socket.IO and Express, allowing games to be hosted on cloud services (Render + Vercel) for mobile crossplay on iOS and Android.

---

## How to Run Locally

### 1. Run Backend Server
```bash
cd server
npm install
node index.js
```

### 2. Run Frontend Client
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
