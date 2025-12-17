import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Hand,
  POSITIONS_BY_TABLE_SIZE,
  DEFAULT_SETTINGS,
} from '../types';
import {
  getHandsSorted,
  saveHand,
  deleteHand,
  getSettings,
} from '../utils/storage';

// カード表示用ヘルパー
function formatCard(card: string | undefined): string {
  if (!card) return '??';
  const rank = card[0];
  const suit = card[1];
  const suitSymbol: Record<string, string> = {
    s: '♠',
    h: '♥',
    d: '♦',
    c: '♣',
  };
  return `${rank}${suitSymbol[suit] || suit}`;
}

function getSuitColor(suit: string): string {
  switch (suit) {
    case 's':
      return 'text-gray-300';
    case 'h':
      return 'text-red-400';
    case 'd':
      return 'text-blue-400';
    case 'c':
      return 'text-green-400';
    default:
      return 'text-gray-400';
  }
}

function CardDisplay({ card }: { card: string | undefined }) {
  if (!card) {
    return <span className="text-gray-500">??</span>;
  }
  const suit = card[1];
  return <span className={getSuitColor(suit)}>{formatCard(card)}</span>;
}

function HandListItem({
  hand,
  onDelete,
}: {
  hand: Hand;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/hand/${hand.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('このハンドを削除しますか？')) {
      onDelete(hand.id);
    }
  };

  const date = new Date(hand.updatedAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      className="list-item"
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              hand.status === 'done'
                ? 'bg-green-900 text-green-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}
          >
            {hand.status === 'done' ? '完了' : '下書き'}
          </span>
          <span className="text-gray-400 text-sm">{hand.blind}</span>
          <span className="text-gray-400 text-sm">{hand.tableSize}max</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-medium">{hand.heroPosition}</span>
          <span className="font-mono text-lg">
            <CardDisplay card={hand.heroCards[0]} />
            <CardDisplay card={hand.heroCards[1]} />
          </span>
        </div>
        {hand.board.flop[0] && (
          <div className="text-sm text-gray-400 mt-1 font-mono">
            {hand.board.flop.map((c, i) => (
              <span key={i} className="mr-1">
                <CardDisplay card={c} />
              </span>
            ))}
            {hand.board.turn && (
              <span className="mr-1">
                <CardDisplay card={hand.board.turn} />
              </span>
            )}
            {hand.board.river && (
              <span>
                <CardDisplay card={hand.board.river} />
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-gray-500 text-xs">{dateStr}</span>
        <button
          onClick={handleDelete}
          className="text-gray-500 hover:text-red-400 p-1"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [hands, setHands] = useState<Hand[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'done'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    setHands(getHandsSorted());
  }, []);

  const filteredHands = hands.filter((h) => {
    if (filter === 'all') return true;
    return h.status === filter;
  });

  const handleNewHand = () => {
    const settings = getSettings();
    const positions = POSITIONS_BY_TABLE_SIZE[settings.lastTableSize] || POSITIONS_BY_TABLE_SIZE[6];

    const newHand: Hand = {
      id: uuidv4(),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tableSize: settings.lastTableSize || DEFAULT_SETTINGS.lastTableSize,
      blind: settings.lastBlind || DEFAULT_SETTINGS.lastBlind,
      heroPosition: 'BTN',
      heroCards: [undefined, undefined],
      tableAssignments: Object.fromEntries(
        positions.map((pos) => [pos, {}])
      ),
      board: {
        flop: [undefined, undefined, undefined],
        turn: undefined,
        river: undefined,
      },
      actions: [],
      result: {
        winnersPositions: [],
        showdown: false,
      },
      opponentHands: {},
      spotMemo: '',
    };

    saveHand(newHand);
    navigate(`/hand/${newHand.id}`);
  };

  const handleDelete = (id: string) => {
    deleteHand(id);
    setHands(getHandsSorted());
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Hand Recorder</h1>
            <div className="flex gap-2">
              <Link
                to="/players"
                className="p-2 text-gray-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </Link>
              <Link
                to="/settings"
                className="p-2 text-gray-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* フィルター */}
          <div className="flex gap-2 mt-3">
            {(['all', 'draft', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'すべて' : f === 'draft' ? '下書き' : '完了'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* リスト */}
      <main className="flex-1 px-4 py-4 pb-24">
        {filteredHands.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p>ハンドがありません</p>
            <p className="text-sm mt-2">下の「+」ボタンで新規作成</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHands.map((hand) => (
              <HandListItem
                key={hand.id}
                hand={hand}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* 新規作成ボタン */}
      <button
        onClick={handleNewHand}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white text-3xl btn-tap"
      >
        +
      </button>
    </div>
  );
}
