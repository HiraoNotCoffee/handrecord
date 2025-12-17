import { useState, useEffect } from 'react';
import { Player, Position } from '../types';
import { getRecentPlayers, searchPlayers, savePlayer, updatePlayerLastSeen } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';

interface PlayerSelectorProps {
  position: Position;
  selectedPlayerId?: string;
  onSelect: (playerId: string | undefined) => void;
  isHero: boolean;
  onSetHero: () => void;
}

export default function PlayerSelector({
  position,
  selectedPlayerId,
  onSelect,
  isHero,
  onSetHero,
}: PlayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPlayers, setRecentPlayers] = useState<Player[]>([]);
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTags, setNewPlayerTags] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    setRecentPlayers(getRecentPlayers(8));
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchPlayers(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPlayerId) {
      const players = getRecentPlayers(100);
      const player = players.find((p) => p.id === selectedPlayerId);
      setSelectedPlayer(player || null);
    } else {
      setSelectedPlayer(null);
    }
  }, [selectedPlayerId]);

  const handleSelectPlayer = (player: Player) => {
    updatePlayerLastSeen(player.id);
    onSelect(player.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreatePlayer = () => {
    if (!newPlayerName.trim()) return;

    const tags = newPlayerTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newPlayer: Player = {
      id: uuidv4(),
      name: newPlayerName.trim(),
      tags,
      note: '',
      lastSeenAt: Date.now(),
    };

    savePlayer(newPlayer);
    onSelect(newPlayer.id);
    setIsOpen(false);
    setShowNewPlayerForm(false);
    setNewPlayerName('');
    setNewPlayerTags('');
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(undefined);
    setSelectedPlayer(null);
  };

  const displayedPlayers = searchQuery.trim() ? searchResults : recentPlayers;

  return (
    <div className="relative">
      {/* 選択ボタン */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSetHero()}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            isHero
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {position}
        </button>

        {isHero ? (
          <span className="text-yellow-400 font-medium text-sm">Hero</span>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="flex-1 text-left px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 btn-tap"
          >
            {selectedPlayer ? (
              <div className="flex items-center gap-2">
                <span className="text-white">{selectedPlayer.name}</span>
                {selectedPlayer.tags.length > 0 && (
                  <span className="text-gray-400 text-xs">
                    ({selectedPlayer.tags.join(', ')})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">プレイヤーを選択...</span>
            )}
          </button>
        )}

        {selectedPlayer && !isHero && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-500 hover:text-red-400"
          >
            ×
          </button>
        )}
      </div>

      {/* プレイヤーノート表示 */}
      {selectedPlayer && selectedPlayer.note && !isHero && (
        <div className="mt-1 px-3 py-2 bg-gray-800 rounded text-sm text-gray-400 border-l-2 border-blue-500">
          {selectedPlayer.note}
        </div>
      )}

      {/* プレイヤー選択モーダル */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{position} のプレイヤー</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 検索 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前 or タグで検索..."
              className="input-field mb-4"
              autoFocus
            />

            {/* プレイヤーリスト */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {displayedPlayers.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  {searchQuery ? '該当するプレイヤーがいません' : '最近のプレイヤーがいません'}
                </div>
              ) : (
                displayedPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full text-left px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 btn-tap"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{player.name}</span>
                      {player.tags.length > 0 && (
                        <div className="flex gap-1">
                          {player.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`chip ${getTagClass(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {player.note && (
                      <div className="text-sm text-gray-400 mt-1 truncate">
                        {player.note}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* 新規作成 */}
            {showNewPlayerForm ? (
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="名前"
                  className="input-field"
                />
                <input
                  type="text"
                  value={newPlayerTags}
                  onChange={(e) => setNewPlayerTags(e.target.value)}
                  placeholder="タグ（カンマ区切り: REG, LAG, NIT）"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewPlayerForm(false)}
                    className="flex-1 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCreatePlayer}
                    disabled={!newPlayerName.trim()}
                    className="flex-1 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50"
                  >
                    作成
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewPlayerForm(true)}
                className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300"
              >
                + 新規プレイヤーを作成
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// タグに応じたスタイルクラス
function getTagClass(tag: string): string {
  const upperTag = tag.toUpperCase();
  switch (upperTag) {
    case 'REG':
      return 'bg-blue-900 text-blue-200';
    case 'LAG':
      return 'bg-red-900 text-red-200';
    case 'TAG':
      return 'bg-green-900 text-green-200';
    case 'NIT':
      return 'bg-yellow-900 text-yellow-200';
    case 'CALLING':
    case 'FISH':
      return 'bg-purple-900 text-purple-200';
    default:
      return 'bg-gray-600 text-gray-200';
  }
}
