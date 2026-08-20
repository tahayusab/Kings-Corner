const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createGame, joinGame, playerAction } = require('./gameLogic');
const { encryptData, decryptData } = require('./cryptoUtils');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store games in memory
const games = {};

// Helper to send game state to all players in a room, hiding other players' hands
function broadcastGameState(roomCode) {
  const game = games[roomCode];
  if (!game) return;

  io.in(roomCode).fetchSockets().then(sockets => {
    sockets.forEach(async socket => {
      const sanitizedState = { ...game };
      sanitizedState.players = game.players.map(p => {
        if (p.id === socket.id) {
          return p;
        } else {
          return { ...p, hand: [], cardCount: p.hand.length };
        }
      });
      
      try {
        const jsonStr = JSON.stringify(sanitizedState);
        const encrypted = await encryptData(jsonStr, roomCode);
        socket.emit('gameState', { encryptedData: encrypted });
      } catch (err) {
        console.error("Failed to encrypt game state broadcast", err);
      }
    });
  });
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('createRoom', (playerName, callback) => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    games[roomCode] = createGame(roomCode);
    
    const result = joinGame(games[roomCode], socket.id, playerName);
    if (result.success) {
      socket.join(roomCode);
      broadcastGameState(roomCode);
      callback({ success: true, roomCode });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  socket.on('joinRoom', ({ roomCode, playerName }, callback) => {
    const game = games[roomCode];
    if (!game) {
      return callback({ success: false, message: "Room not found" });
    }

    const result = joinGame(game, socket.id, playerName);
    if (result.success) {
      socket.join(roomCode);
      broadcastGameState(roomCode);
      callback({ success: true, roomCode });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  socket.on('startGame', (roomCode) => {
     const game = games[roomCode];
     if (game && game.status === 'LOBBY') {
        game.status = 'PLAYING';
        game.turnIndex = 0;
        game.hasDrawnThisTurn = false;
        broadcastGameState(roomCode);
     }
  });

  socket.on('action', async ({ roomCode, encryptedData }, callback) => {
    const game = games[roomCode];
    if (game) {
      try {
        const decryptedStr = await decryptData(encryptedData, roomCode);
        const { actionType, payload } = JSON.parse(decryptedStr);
        
        const success = playerAction(game, socket.id, actionType, payload);
        if (success) {
          broadcastGameState(roomCode);
          if (callback) callback({ success: true });
        } else {
          if (callback) {
            let msg = "Invalid move.";
            if (actionType === 'PLAY_CARD' && !game.hasDrawnThisTurn) {
              msg = "You must draw a card first!";
            }
            callback({ success: false, message: msg });
          }
        }
      } catch (err) {
        console.error("Action decryption failed", err);
        if (callback) callback({ success: false, message: "Security error." });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // For V1, we won't aggressively delete rooms on disconnect to allow reconnects
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
