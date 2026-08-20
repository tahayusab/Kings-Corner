import React from 'react';

const Card = ({ card, onPress, isSelected, isEmptyPlaceholder, isDrawPile, count, isDoubleDeck }) => {
  if (isEmptyPlaceholder) {
    return (
      <div className="card empty" onClick={onPress}></div>
    );
  }

  if (isDrawPile) {
    return (
      <div className="card draw-pile" onClick={onPress}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>KINGS</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>{count}</div>
        {isDoubleDeck && (
          <div style={{ 
            fontSize: '8px', 
            fontWeight: 'bold', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            padding: '2px 4px', 
            borderRadius: '4px',
            marginTop: '4px',
            border: '1px solid rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap'
          }}>
            2 DECKS
          </div>
        )}
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'text-red' : 'text-black';
  
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  return (
    <div 
      className={`card ${isSelected ? 'selected' : ''}`}
      onClick={onPress}
    >
      <div className={`card-top-left ${colorClass}`}>
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
      </div>
      <div className={`card-center ${colorClass}`}>
        {getSuitSymbol(card.suit)}
      </div>
      <div className={`card-bottom-right ${colorClass}`}>
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
};

export default Card;
