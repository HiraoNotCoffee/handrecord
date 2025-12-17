import { Card, Board } from '../types';
import { CardDisplay } from './CardInput';

type BoardSlot = 'flop0' | 'flop1' | 'flop2' | 'turn' | 'river';

interface BoardInputProps {
  board: Board;
  onBoardChange: (board: Board) => void;
  usedCards: Card[];
  selectedSlot: BoardSlot | null;
  onSlotSelect: (slot: BoardSlot | null) => void;
}

export default function BoardInput({
  board,
  selectedSlot,
  onSlotSelect,
}: BoardInputProps) {
  const handleSlotClick = (slot: BoardSlot) => {
    if (selectedSlot === slot) {
      onSlotSelect(null);
    } else {
      onSlotSelect(slot);
    }
  };

  return (
    <div className="space-y-3">
      {/* ボード 5枚横一列 */}
      <div className="flex gap-2 justify-center items-end">
        {/* Flop 3枚 */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center">
            {i === 0 && <div className="text-xs text-gray-500 mb-1">Flop</div>}
            {i !== 0 && <div className="text-xs text-transparent mb-1">.</div>}
            <CardDisplay
              card={board.flop[i]}
              onClick={() => handleSlotClick(`flop${i}` as BoardSlot)}
              selected={selectedSlot === `flop${i}`}
              size="md"
            />
          </div>
        ))}

        {/* 区切り */}
        <div className="w-2" />

        {/* Turn */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">Turn</div>
          <CardDisplay
            card={board.turn}
            onClick={() => handleSlotClick('turn')}
            selected={selectedSlot === 'turn'}
            size="md"
          />
        </div>

        {/* 区切り */}
        <div className="w-2" />

        {/* River */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">River</div>
          <CardDisplay
            card={board.river}
            onClick={() => handleSlotClick('river')}
            selected={selectedSlot === 'river'}
            size="md"
          />
        </div>
      </div>

      {/* 選択中スロット表示 */}
      {selectedSlot && (
        <div className="text-center text-sm text-yellow-400 animate-fade-in">
          {selectedSlot === 'flop0' && 'フロップ 1枚目'}
          {selectedSlot === 'flop1' && 'フロップ 2枚目'}
          {selectedSlot === 'flop2' && 'フロップ 3枚目'}
          {selectedSlot === 'turn' && 'ターン'}
          {selectedSlot === 'river' && 'リバー'}
          を入力中...
        </div>
      )}
    </div>
  );
}

export type { BoardSlot };
