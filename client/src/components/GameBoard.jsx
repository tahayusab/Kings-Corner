import React from 'react';
import Card from './Card';

const GameBoard = ({ layout, drawPileCount, onPilePress, onDrawPress, selectedPile, isMyTurn, onPointerDown, onPointerMove, onPointerUp, dragOverPile, isDragging, isDoubleDeck }) => {

  const renderPile = (position) => {
    const pile = layout[position];
    const isSelected = selectedPile === position;
    const isDragOver = dragOverPile === position;
    
    return (
      <div 
        className={`grid-cell ${isDragOver ? 'drag-over' : ''}`} 
        key={position} 
        style={{ position: 'relative' }}
        data-pile={position}
      >
        {pile && pile.length > 0 ? (
          <div onClick={(e) => { e.stopPropagation(); onPilePress(position); }} style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
            {pile.map((card, i) => {
              if (i !== 0 && i !== pile.length - 1) return null;
              
              // If it's the last card (and not the only card), offset it by 30px
              const isLast = i === pile.length - 1 && i !== 0;
              const topOffset = isLast ? 30 : 0;
              const isTopCard = i === pile.length - 1;

              return (
                <div 
                  className={isMyTurn && isTopCard ? 'draggable-card' : ''}
                  style={{ 
                    position: 'absolute', 
                    top: `${topOffset}px`, 
                    left: 0, 
                    zIndex: i,
                    touchAction: isTopCard ? 'none' : 'auto'
                  }}
                  onPointerDown={(e) => {
                    if (isTopCard) {
                      e.stopPropagation();
                      onPointerDown(e, { type: 'board-pile', sourcePile: position });
                    }
                  }}
                  onPointerMove={isTopCard ? onPointerMove : undefined}
                  onPointerUp={isTopCard ? onPointerUp : undefined}
                >
                  <Card 
                    card={card} 
                    isSelected={isSelected && isTopCard} 
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div onClick={(e) => { e.stopPropagation(); onPilePress(position); }}>
            <Card isEmptyPlaceholder={true} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`board-container ${isDragging ? 'dragging-active' : ''}`}>
      <div className="board-row">
        {renderPile('NW')}
        {renderPile('N')}
        {renderPile('NE')}
      </div>
      <div className="board-row">
        {renderPile('W')}
        <div className="grid-cell" onClick={(e) => { e.stopPropagation(); onDrawPress(); }}>
           <Card isDrawPile={true} count={drawPileCount} isDoubleDeck={isDoubleDeck} />
        </div>
        {renderPile('E')}
      </div>
      <div className="board-row">
        {renderPile('SW')}
        {renderPile('S')}
        {renderPile('SE')}
      </div>
    </div>
  );
};

export default GameBoard;
