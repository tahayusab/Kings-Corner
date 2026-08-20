import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import GameBoard from './components/GameBoard';
import Hand from './components/Hand';
import Card from './components/Card';
import { encryptData, decryptData } from './cryptoUtils';
import './index.css';

const getOpponentCoordsStyle = (index, totalOpponents) => {
  if (totalOpponents === 1) {
    return { left: '50%', top: '25px', transform: 'translate(-50%, -50%)' };
  }
  if (totalOpponents === 2) {
    return index === 0 
      ? { left: '10px', top: '50%', transform: 'translateY(-50%)' } 
      : { right: '10px', top: '50%', transform: 'translateY(-50%)' };
  }
  if (totalOpponents === 3) {
    if (index === 0) return { left: '10px', top: '50%', transform: 'translateY(-50%)' };
    if (index === 1) return { left: '50%', top: '20px', transform: 'translate(-50%, -50%)' };
    if (index === 2) return { right: '10px', top: '50%', transform: 'translateY(-50%)' };
  }
  if (totalOpponents === 4) {
    if (index === 0) return { left: '10px', top: '55%', transform: 'translateY(-50%)' };
    if (index === 1) return { left: '25%', top: '25px', transform: 'translate(-50%, -50%)' };
    if (index === 2) return { right: '25%', top: '25px', transform: 'translate(-50%, -50%)' };
    if (index === 3) return { right: '10px', top: '55%', transform: 'translateY(-50%)' };
  }
  if (totalOpponents === 5) {
    if (index === 0) return { left: '10px', top: '55%', transform: 'translateY(-50%)' };
    if (index === 1) return { left: '22%', top: '25px', transform: 'translate(-50%, -50%)' };
    if (index === 2) return { left: '50%', top: '20px', transform: 'translate(-50%, -50%)' };
    if (index === 3) return { right: '22%', top: '25px', transform: 'translate(-50%, -50%)' };
    if (index === 4) return { right: '10px', top: '55%', transform: 'translateY(-50%)' };
  }
  return { left: '50%', top: '25px', transform: 'translate(-50%, -50%)' };
};

function App() {
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  // Interaction state
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [dragOverPile, setDragOverPile] = useState(null);

  useEffect(() => {
    if (dragState) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState]);

  const handlePointerDown = (e, item) => {
    if (e.button !== 0) return;
    
    setDragState({
      ...item,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState) return;
    
    const newX = e.clientX;
    const newY = e.clientY;
    
    setDragState(prev => {
      if (!prev) return null;
      return { ...prev, x: newX, y: newY };
    });
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const cell = element?.closest('[data-pile]');
    if (cell) {
      const pileName = cell.getAttribute('data-pile');
      setDragOverPile(pileName);
    } else {
      setDragOverPile(null);
    }
  };

  const handlePointerUp = (e) => {
    if (!dragState) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    const distance = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
    
    if (distance < 5) {
      if (dragState.type === 'hand-card') {
        handleCardPress(dragState.index);
      } else if (dragState.type === 'board-pile') {
        handlePilePress(dragState.sourcePile);
      }
    } else {
      if (dragOverPile) {
        if (dragState.type === 'hand-card') {
          sendAction('PLAY_CARD', { cardIndex: dragState.index, destinationPile: dragOverPile }, (res) => {
            if (!res.success) showToast(res.message);
          });
        } else if (dragState.type === 'board-pile') {
          sendAction('MOVE_PILE', { sourcePile: dragState.sourcePile, destinationPile: dragOverPile }, (res) => {
            if (!res.success) showToast(res.message);
          });
        }
      }
    }
    
    setDragState(null);
    setDragOverPile(null);
  };

  const getDraggedCard = () => {
    if (!dragState) return null;
    if (dragState.type === 'hand-card') return dragState.card;
    if (dragState.type === 'board-pile') {
      const pile = gameState.board.layout[dragState.sourcePile];
      return pile && pile.length > 0 ? pile[pile.length - 1] : null;
    }
    return null;
  };

  const currentRoomCodeRef = useRef(null);
  const pendingDecryptionRef = useRef(null);

  const sendAction = async (actionType, payload, callback) => {
    if (!gameState) return;
    const roomCode = gameState.roomCode;
    try {
      const jsonStr = JSON.stringify({ actionType, payload });
      const encrypted = await encryptData(jsonStr, roomCode);
      socket.emit('action', { roomCode, encryptedData: encrypted }, callback);
    } catch (err) {
      console.error("Encryption failed", err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('gameState', async (data) => {
      let state = data;
      if (data.encryptedData) {
        const roomCode = currentRoomCodeRef.current || roomCodeInput;
        if (!roomCode) {
          pendingDecryptionRef.current = data.encryptedData;
          return;
        }
        try {
          const decryptedStr = await decryptData(data.encryptedData, roomCode);
          state = JSON.parse(decryptedStr);
        } catch (err) {
          console.error("Failed to decrypt game state", err);
          return;
        }
      }
      setGameState(state);
      setSelectedCardIndex(null);
      setSelectedPile(null);
    });

    return () => {
      socket.off('connect');
      socket.off('gameState');
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName) return showToast('Enter a name');
    socket.emit('createRoom', playerName, async (res) => {
      if (res.success) {
        currentRoomCodeRef.current = res.roomCode;
        if (pendingDecryptionRef.current) {
          try {
            const decryptedStr = await decryptData(pendingDecryptionRef.current, res.roomCode);
            setGameState(JSON.parse(decryptedStr));
            pendingDecryptionRef.current = null;
          } catch (err) {
            console.error("Failed to decrypt pending state", err);
          }
        }
      } else {
        showToast(res.message);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName || !roomCodeInput) return showToast('Enter name and room code');
    socket.emit('joinRoom', { roomCode: roomCodeInput, playerName }, async (res) => {
      if (res.success) {
        currentRoomCodeRef.current = res.roomCode;
        if (pendingDecryptionRef.current) {
          try {
            const decryptedStr = await decryptData(pendingDecryptionRef.current, res.roomCode);
            setGameState(JSON.parse(decryptedStr));
            pendingDecryptionRef.current = null;
          } catch (err) {
            console.error("Failed to decrypt pending state", err);
          }
        }
      } else {
        showToast(res.message);
      }
    });
  };

  const handleStartGame = () => {
    if (gameState) {
      socket.emit('startGame', gameState.roomCode);
    }
  };

  const handleDraw = () => {
    if (gameState) {
      sendAction('DRAW_CARD', null, (res) => {
        if (!res.success) showToast(res.message);
      });
    }
  };

  const handleEndTurn = () => {
    if (gameState) {
      sendAction('END_TURN', null, (res) => {
        if (!res.success) showToast(res.message);
      });
    }
  };

  const handleCardPress = (index) => {
    if (selectedCardIndex === index) {
      setSelectedCardIndex(null); // Deselect if tapped again
    } else {
      setSelectedCardIndex(index);
      setSelectedPile(null);
    }
  };

  const handlePilePress = (pileName) => {
    if (selectedCardIndex !== null) {
      sendAction('PLAY_CARD', { cardIndex: selectedCardIndex, destinationPile: pileName }, (res) => {
        if (!res.success) showToast(res.message);
      });
      // Optionally deselect after attempting to play (whether success or fail)
      setSelectedCardIndex(null);
    } else if (selectedPile === pileName) {
      setSelectedPile(null); // Deselect if tapped again
    } else if (selectedPile === null) {
      setSelectedPile(pileName);
    } else {
      sendAction('MOVE_PILE', { sourcePile: selectedPile, destinationPile: pileName }, (res) => {
        if (!res.success) showToast(res.message);
      });
      // Deselect after moving pile
      setSelectedPile(null);
    }
  };



  if (!gameState) {
    return (
      <div className="app-container">
        <div className="lobby-container">
          <h1 className="title">KINGS CORNER</h1>
          
          <input
            className="input-field"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          
          <button className="btn" onClick={handleCreateRoom}>
            CREATE GAME
          </button>
          
          <div className="or-text">OR</div>
          
          <input
            className="input-field"
            placeholder="Room Code"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
            maxLength={4}
          />
          
          <button className="btn btn-secondary" onClick={handleJoinRoom}>
            JOIN GAME
          </button>
        </div>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === socket.id);
  const isMyTurn = gameState.players[gameState.turnIndex]?.id === socket.id;

  const handleBackgroundClick = () => {
    setSelectedCardIndex(null);
    setSelectedPile(null);
  };

  return (
    <div className="app-container" onClick={handleBackgroundClick}>
      {toastMessage && <div className="toast">{toastMessage}</div>}
      <div className="header">
        <div style={{ color: '#94a3b8' }}>Room: {gameState.roomCode}</div>
        <div className="turn-indicator">
           {isMyTurn ? "YOUR TURN" : `${gameState.players[gameState.turnIndex]?.name}'s Turn`}
        </div>
      </div>

      {gameState.status === 'LOBBY' ? (
        <div className="lobby-container" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: '20px', color: '#cbd5e1', marginBottom: '16px' }}>
            Players ({gameState.players.length}/6)
          </div>
          {gameState.players.map((p, i) => (
            <div key={i} style={{ fontSize: '18px', marginBottom: '8px' }}>• {p.name}</div>
          ))}
          <button className="btn" style={{ marginTop: '24px' }} onClick={handleStartGame}>
            START GAME
          </button>
        </div>
      ) : gameState.status === 'FINISHED' ? (
        <div className="lobby-container" style={{ alignItems: 'center' }}>
          <h1 className="title">{gameState.winner} WINS!</h1>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
          
          {(() => {
            const myIndex = gameState.players.findIndex(p => p.id === socket.id);
            const opponents = [];
            if (myIndex !== -1) {
              for (let i = 1; i < gameState.players.length; i++) {
                opponents.push(gameState.players[(myIndex + i) % gameState.players.length]);
              }
            }
            return (
              <div className="game-table-container" style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '85px 40px 20px 40px', boxSizing: 'border-box' }}>
                {opponents.map((p, index) => {
                  const positionStyle = getOpponentCoordsStyle(index, opponents.length);
                  const isOpponentTurn = gameState.players[gameState.turnIndex]?.id === p.id;
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`opponent-badge ${isOpponentTurn ? 'active-turn' : ''}`}
                      style={{
                        position: 'absolute',
                        ...positionStyle,
                        zIndex: 10
                      }}
                    >
                      <div className="opponent-name">{p.name}</div>
                      <div className="opponent-cards">{p.cardCount} cards</div>
                    </div>
                  );
                })}

                <GameBoard 
                  layout={gameState.board.layout}
                  drawPileCount={gameState.board.drawPile.length}
                  onDrawPress={handleDraw}
                  onPilePress={handlePilePress}
                  selectedPile={selectedPile}
                  isMyTurn={isMyTurn}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  dragOverPile={dragOverPile}
                  isDragging={dragState !== null}
                  isDoubleDeck={gameState.players.length > 4}
                />
              </div>
            );
          })()}

          <div className="action-row" style={{ margin: '16px 0' }}>
            {isMyTurn && !gameState.hasDrawnThisTurn && (
              <button className="btn" style={{ backgroundColor: '#64748b', opacity: 0.8 }} disabled>
                DRAW A CARD FIRST
              </button>
            )}
            {isMyTurn && gameState.hasDrawnThisTurn && (
              <button className="btn btn-danger" onClick={handleEndTurn}>
                END TURN
              </button>
            )}
          </div>

          {me && (
            <div style={{ marginTop: 'auto', width: '100%' }}>
              <Hand 
                cards={me.hand} 
                selectedCardIndex={selectedCardIndex}
                isMyTurn={isMyTurn}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            </div>
          )}
        </div>
      )}
      
      {dragState && getDraggedCard() && (
        <div 
          style={{
            position: 'fixed',
            left: dragState.x,
            top: dragState.y,
            transform: 'translate(-50%, -50%) scale(1.05)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <Card card={getDraggedCard()} />
        </div>
      )}
    </div>
  );
}

export default App;
