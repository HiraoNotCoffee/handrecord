import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Player } from '../types';
import {
  getPlayers,
  savePlayer,
  deletePlayer,
  searchPlayers,
} from '../utils/storage';

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

interface PlayerFormProps {
  player?: Player;
  onSave: (player: Player) => void;
  onCancel: () => void;
}

function PlayerForm({ player, onSave, onCancel }: PlayerFormProps) {
  const [name, setName] = useState(player?.name || '');
  const [tagsInput, setTagsInput] = useState(player?.tags.join(', ') || '');
  const [note, setNote] = useState(player?.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newPlayer: Player = {
      id: player?.id || uuidv4(),
      name: name.trim(),
      tags,
      note: note.trim(),
      lastSeenAt: player?.lastSeenAt || Date.now(),
    };

    onSave(newPlayer);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content p-4" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">
              {player ? 'プレイヤー編集' : '新規プレイヤー'}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プレイヤー名"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="REG, LAG, NIT, TAG, FISH"
              className="input-field"
            />
            <div className="text-xs text-gray-500 mt-1">
              例: REG, LAG, NIT, TAG, FISH, CALLING
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              メモ（恒久）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="このプレイヤーの特徴..."
              className="input-field h-24 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 btn-tap"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed btn-tap"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = () => {
    const all = getPlayers();
    // lastSeenAtで降順ソート
    all.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    setPlayers(all);
  };

  const displayedPlayers = searchQuery.trim()
    ? searchPlayers(searchQuery)
    : players;

  const handleSave = (player: Player) => {
    savePlayer(player);
    loadPlayers();
    setEditingPlayer(null);
    setShowNewForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('このプレイヤーを削除しますか？')) {
      deletePlayer(id);
      loadPlayers();
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 -ml-2 text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold">プレイヤー管理</h1>
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 btn-tap"
            >
              + 新規
            </button>
          </div>

          {/* 検索 */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前 or タグで検索..."
            className="input-field mt-3"
          />
        </div>
      </header>

      {/* リスト */}
      <main className="flex-1 px-4 py-4">
        {displayedPlayers.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p>{searchQuery ? '該当するプレイヤーがいません' : 'プレイヤーがいません'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-gray-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-lg">{player.name}</span>
                      {player.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`chip ${getTagClass(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {player.note && (
                      <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">
                        {player.note}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      最終使用: {new Date(player.lastSeenAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="p-2 text-gray-400 hover:text-white btn-tap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="p-2 text-gray-400 hover:text-red-400 btn-tap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 編集モーダル */}
      {editingPlayer && (
        <PlayerForm
          player={editingPlayer}
          onSave={handleSave}
          onCancel={() => setEditingPlayer(null)}
        />
      )}

      {/* 新規作成モーダル */}
      {showNewForm && (
        <PlayerForm
          onSave={handleSave}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  );
}
