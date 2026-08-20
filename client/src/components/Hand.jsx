import React, { useRef, useEffect } from 'react';
import Card from './Card';

const Hand = ({ cards, selectedCardIndex, isMyTurn, onPointerDown, onPointerMove, onPointerUp }) => {
  const totalCards = cards.length;
  
  // Calculate balanced rows (max 7 per row)
  const maxPerRow = 7;
  const numRows = Math.ceil(totalCards / maxPerRow);
  
  // Distribute evenly
  const rows = [];
  let remaining = totalCards;
  for (let i = 0; i < numRows; i++) {
    const cardsForThisRow = Math.ceil(remaining / (numRows - i));
    rows.push(cards.slice(totalCards - remaining, totalCards - remaining + cardsForThisRow));
    remaining -= cardsForThisRow;
  }

  let globalCardIndex = 0;

  return (
    <div className="hand-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {rows.map((rowCards, rowIndex) => {
        const cardsInRow = rowCards.length;
        
        return (
          <div key={rowIndex} style={{ display: 'flex', marginTop: rowIndex > 0 ? '-60px' : '0' }}>
            {rowCards.map((card, colIndex) => {
              const currentIndex = globalCardIndex++;
              const middleIndex = (cardsInRow - 1) / 2;
              const offsetFromCenter = colIndex - middleIndex;
              
              // Gentle fan curve per row
              const rotateAngle = offsetFromCenter * 4; 
              const dropY = Math.abs(offsetFromCenter) * 3; 
              
              // Overlap
              const marginLeft = colIndex === 0 ? 0 : -30;

              return (
                <div 
                  key={currentIndex} 
                  className={`hand-card-wrapper ${isMyTurn ? 'draggable-card' : ''}`}
                  style={{
                    transform: `rotate(${rotateAngle}deg) translateY(${dropY}px)`,
                    zIndex: currentIndex, 
                    marginLeft: `${marginLeft}px`,
                    touchAction: 'none'
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPointerDown(e, { type: 'hand-card', index: currentIndex, card });
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  <Card 
                    card={card} 
                    isSelected={selectedCardIndex === currentIndex}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default Hand;
