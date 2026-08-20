const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createGame, joinGame, playerAction } = require('./gameLogic');

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

  // We should ideally filter hands here to prevent cheating, 
  // but for local co-op V1 we can send the full state and let the client hide it.
  // To be safe, let's filter it per socket.
  io.in(roomCode).fetchSockets().then(sockets => {
    sockets.forEach(socket => {
      const sanitizedState = { ...game };
      // Deep copy players to hide hands of others
      sanitizedState.players = game.players.map(p => {
        if (p.id === socket.id) {
          return p; // Send full hand to the owner
        } else {
          return { ...p, hand: [], cardCount: p.hand.length }; // Hide hand from others
        }
      });
      socket.emit('gameState', sanitizedState);
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

  socket.on('action', ({ roomCode, actionType, payload }, callback) => {
    const game = games[roomCode];
    if (game) {
      const success = playerAction(game, socket.id, actionType, payload);
      if (success) {
        broadcastGameState(roomCode);
        if (callback) callback({ success: true });
      } else {
        if (callback) {
          // Give a generic helpful message, or specific if we want
          let msg = "Invalid move.";
          if (actionType === 'PLAY_CARD' && !game.hasDrawnThisTurn) {
            msg = "You must draw a card first!";
          }
          callback({ success: false, message: msg });
        }
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
