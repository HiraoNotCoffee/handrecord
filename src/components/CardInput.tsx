import { useState } from 'react';
import { Card, Rank, Suit, RANKS, SUITS, SUIT_SYMBOLS } from '../types';

interface CardInputProps {
  usedCards: Card[];
  onCardSelect: (card: Card) => void;
}

export default function CardInput({
  usedCards,
  onCardSelect,
}: CardInputProps) {
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  const isCardUsed = (rank: Rank, suit: Suit): boolean => {
    const card = `${rank}${suit}`;
    return usedCards.includes(card);
  };

  const isRankFullyUsed = (rank: Rank): boolean => {
    return SUITS.every((suit) => isCardUsed(rank, suit));
  };

  const handleRankClick = (rank: Rank) => {
    if (isRankFullyUsed(rank)) return;
    setSelectedRank(rank);
  };

  const handleSuitClick = (suit: Suit) => {
    if (!selectedRank) return;
    if (isCardUsed(selectedRank, suit)) return;

    const card: Card = `${selectedRank}${suit}`;
    onCardSelect(card);
    setSelectedRank(null);
  };

  const handleCancelRank = () => {
    setSelectedRank(null);
  };

  return (
    <div className="bg-gray-800 p-3 rounded-xl space-y-3">
      {/* キャンセルボタン */}
      {selectedRank && (
        <div className="flex justify-end">
          <button
            onClick={handleCancelRank}
            className="text-sm text-gray-400 hover:text-white"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* 選択中ランク表示 */}
      {selectedRank && (
        <div className="text-center text-lg font-bold text-yellow-400 animate-fade-in">
          {selectedRank} を選択中 → スートを選んでください
        </div>
      )}

      {/* ランクボタン */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {RANKS.map((rank) => {
          const fullyUsed = isRankFullyUsed(rank);
          const isSelected = selectedRank === rank;
          return (
            <button
              key={rank}
              onClick={() => handleRankClick(rank)}
              disabled={fullyUsed}
              className={`rank-btn ${
                isSelected
                  ? 'bg-yellow-500 text-gray-900'
                  : fullyUsed
                    ? ''
                    : 'hover:bg-gray-600'
              }`}
            >
              {rank}
            </button>
          );
        })}
      </div>

      {/* スートボタン */}
      <div className="flex gap-2 justify-center">
        {SUITS.map((suit) => {
          const disabled = !selectedRank || isCardUsed(selectedRank, suit);
          const suitClass = `suit-btn-${suit}`;
          return (
            <button
              key={suit}
              onClick={() => handleSuitClick(suit)}
              disabled={disabled}
              className={`suit-btn ${suitClass}`}
            >
              {SUIT_SYMBOLS[suit]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 単体カード表示コンポーネント
interface CardDisplayProps {
  card: Card | undefined;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
}

export function CardDisplay({ card, onClick, size = 'md', selected = false }: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-8 h-11 text-sm',
    md: 'w-12 h-16 text-lg',
    lg: 'w-16 h-22 text-2xl',
  };

  if (!card) {
    return (
      <button
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-lg card-back flex items-center justify-center font-bold ${
          onClick ? 'cursor-pointer btn-tap' : ''
        } ${selected ? 'ring-2 ring-yellow-400' : ''}`}
      >
        ?
      </button>
    );
  }

  const rank = card[0];
  const suit = card[1] as Suit;
  const symbol = SUIT_SYMBOLS[suit];

  const suitColorClass = {
    s: 'text-gray-900',
    h: 'text-red-500',
    d: 'text-blue-500',
    c: 'text-green-700',
  }[suit];

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} bg-white rounded-lg flex flex-col items-center justify-center font-bold shadow-md ${
        onClick ? 'cursor-pointer btn-tap' : ''
      } ${selected ? 'ring-2 ring-yellow-400' : ''} ${suitColorClass}`}
    >
      <span>{rank}</span>
      <span className="text-xs">{symbol}</span>
    </button>
  );
}
