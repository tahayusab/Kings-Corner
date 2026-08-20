const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getCardColor(suit) {
  return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

function getRankValue(rank) {
  return RANKS.indexOf(rank) + 1; // A=1, K=13
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createGame(roomCode) {
  const deck = createDeck();
  return {
    roomCode,
    status: 'LOBBY', // LOBBY, PLAYING, FINISHED
    players: [],
    turnIndex: 0,
    hasDrawnThisTurn: false,
    winner: null,
    board: {
      drawPile: deck,
      layout: {
        N: [], S: [], E: [], W: [], // Cross
        NW: [], NE: [], SW: [], SE: [] // Corners
      }
    }
  };
}

function joinGame(game, playerId, playerName) {
  if (game.status !== 'LOBBY') {
    return { success: false, message: 'Game already started' };
  }
  if (game.players.length >= 6) {
    return { success: false, message: 'Room is full' };
  }
  if (game.players.find(p => p.id === playerId)) {
    return { success: true, gameState: game }; // Already joined
  }

  // If this is the 5th player joining (length is 4), combine another deck
  if (game.players.length === 4) {
    const extraDeck = createDeck();
    game.board.drawPile = game.board.drawPile.concat(extraDeck);
    for (let i = game.board.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [game.board.drawPile[i], game.board.drawPile[j]] = [game.board.drawPile[j], game.board.drawPile[i]];
    }
  }

  // Deal 7 cards to player
  const hand = game.board.drawPile.splice(0, 7);
  game.players.push({
    id: playerId,
    name: playerName,
    hand,
    cardCount: hand.length
  });

  // If this is the 1st player, they are host (not strictly needed, but good)
  // We initialize the board cross when the game starts, wait.
  // Actually, we should initialize the 4 cross cards immediately after the first player joins, 
  // or right before status becomes PLAYING. Let's do it on the first player join for simplicity.
  if (game.players.length === 1) {
    game.board.layout.N.push(game.board.drawPile.pop());
    game.board.layout.S.push(game.board.drawPile.pop());
    game.board.layout.E.push(game.board.drawPile.pop());
    game.board.layout.W.push(game.board.drawPile.pop());
  }

  return { success: true, gameState: game };
}

function isValidPlay(bottomCard, topCard) {
  // If moving a card (bottomCard) ONTO a destination pile's top card (topCard)
  if (getCardColor(bottomCard.suit) === getCardColor(topCard.suit)) return false;
  if (getRankValue(bottomCard.rank) !== getRankValue(topCard.rank) - 1) return false;
  return true;
}

function playerAction(game, playerId, actionType, payload) {
  if (game.status !== 'PLAYING') return false;
  
  const currentPlayer = game.players[game.turnIndex];
  if (currentPlayer.id !== playerId) return false; // Not their turn

  if (actionType === 'DRAW_CARD') {
    if (game.hasDrawnThisTurn) return false;
    if (game.board.drawPile.length > 0) {
      currentPlayer.hand.push(game.board.drawPile.pop());
      currentPlayer.cardCount++;
      game.hasDrawnThisTurn = true;
      return true;
    }
  }

  if (actionType === 'PLAY_CARD') {
    // payload: { cardIndex: number, destinationPile: string }
    if (!game.hasDrawnThisTurn) return false; // Must draw first

    const { cardIndex, destinationPile } = payload;
    const card = currentPlayer.hand[cardIndex];
    if (!card) return false;

    const dest = game.board.layout[destinationPile];
    const isCorner = ['NW', 'NE', 'SW', 'SE'].includes(destinationPile);

    // Rules for playing a card
    if (dest.length === 0) {
      // Empty pile
      if (isCorner && card.rank !== 'K') return false; // Only Kings in corners
      // Cross piles can take any card if empty
    } else {
      // Pile has cards, check alternating colors and descending rank
      const topCard = dest[dest.length - 1];
      if (!isValidPlay(card, topCard)) return false;
    }

    // Move is valid
    dest.push(card);
    currentPlayer.hand.splice(cardIndex, 1);
    currentPlayer.cardCount--;

    // Check win condition
    if (currentPlayer.hand.length === 0) {
      game.status = 'FINISHED';
      game.winner = currentPlayer.name;
    }
    return true;
  }

  if (actionType === 'MOVE_PILE') {
    // payload: { sourcePile: string, destinationPile: string }
    if (!game.hasDrawnThisTurn) return false; // Must draw first

    const { sourcePile, destinationPile } = payload;
    const src = game.board.layout[sourcePile];
    const dest = game.board.layout[destinationPile];

    if (src.length === 0) return false;
    
    const bottomCardOfSrc = src[0];

    if (dest.length === 0) {
      const isCorner = ['NW', 'NE', 'SW', 'SE'].includes(destinationPile);
      if (isCorner && bottomCardOfSrc.rank !== 'K') return false;
    } else {
      const topCardOfDest = dest[dest.length - 1];
      if (!isValidPlay(bottomCardOfSrc, topCardOfDest)) return false;
    }

    // Move entire pile
    game.board.layout[destinationPile] = dest.concat(src);
    game.board.layout[sourcePile] = [];
    return true;
  }

  if (actionType === 'END_TURN') {
    if (!game.hasDrawnThisTurn) return false; // Must draw before ending
    game.turnIndex = (game.turnIndex + 1) % game.players.length;
    game.hasDrawnThisTurn = false;
    return true;
  }

  return false;
}

module.exports = {
  createGame,
  joinGame,
  playerAction
};
