import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Hand,
  Card,
  Board,
  Action,
  Street,
  Position,
  BlindLevel,
  POSITIONS_BY_TABLE_SIZE,
  POSTFLOP_ACTION_ORDER,
  TableAssignment,
} from '../types';
import { getHandById, saveHand, saveSettings, getSettings } from '../utils/storage';
import { generateShareText, copyToClipboard } from '../utils/clipboard';
import { useUndoRedo } from '../hooks/useUndoRedo';
import CardInput, { CardDisplay } from '../components/CardInput';
import BoardInput, { BoardSlot } from '../components/BoardInput';
import ActionInput from '../components/ActionInput';
import PlayerSelector from '../components/PlayerSelector';

type InputMode = 'none' | 'heroCard' | 'board' | 'opponentCard';
type HeroCardSlot = 0 | 1;
type OpponentCardSlot = { position: Position; slot: 0 | 1 };

const BLIND_OPTIONS: BlindLevel[] = ['0.5/1', '1/1', '1/2'];
const TABLE_SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9];

export default function HandEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ハンド状態
  const {
    state: hand,
    setState: setHand,
  } = useUndoRedo<Hand | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [heroCardSlot, setHeroCardSlot] = useState<HeroCardSlot>(0);
  const [boardSlot, setBoardSlot] = useState<BoardSlot | null>(null);
  const [currentStreet, setCurrentStreet] = useState<Street>('preflop');
  const [copySuccess, setCopySuccess] = useState(false);
  const [opponentCardSlot, setOpponentCardSlot] = useState<OpponentCardSlot | null>(null);

  // ハンドに残ったプレイヤー（プリフロのアクションから計算）
  const playersInHand = useMemo(() => {
    if (!hand) return [];

    const postflopOrder = POSTFLOP_ACTION_ORDER[hand.tableSize] || [];
    const preflopActions = hand.actions.filter((a) => a.street === 'preflop');

    // レイズを探す
    const raises = preflopActions.filter((a) => a.type === 'RAISE');
    if (raises.length === 0) {
      // レイズがない場合は全員
      return postflopOrder;
    }

    const lastRaise = raises.reduce((latest, current) =>
      current.order > latest.order ? current : latest
    );
    const lastRaiseOrder = lastRaise.order;

    // 最後のレイズ以降にCALLしたプレイヤー + レイザー
    const inHand: Position[] = [lastRaise.position];

    preflopActions.forEach((a) => {
      if (a.order > lastRaiseOrder && (a.type === 'CALL' || a.sizeBb === -1)) {
        if (!inHand.includes(a.position)) {
          inHand.push(a.position);
        }
      }
    });

    // All-inしたプレイヤーも追加
    preflopActions.forEach((a) => {
      if (a.sizeBb === -1 && !inHand.includes(a.position)) {
        inHand.push(a.position);
      }
    });

    // 明示的にフォールドしたプレイヤーを除外
    const foldedPositions = hand.actions
      .filter((a) => a.type === 'FOLD')
      .map((a) => a.position);

    return postflopOrder.filter(
      (pos) => inHand.includes(pos) && !foldedPositions.includes(pos)
    );
  }, [hand]);

  // 初期ロード
  useEffect(() => {
    if (id) {
      const loadedHand = getHandById(id);
      if (loadedHand) {
        setHand(loadedHand);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate, setHand]);

  // 自動保存
  useEffect(() => {
    if (hand) {
      saveHand(hand);
    }
  }, [hand]);

  // 使用済みカード一覧
  const getUsedCards = useCallback((): Card[] => {
    if (!hand) return [];
    const cards: Card[] = [];
    if (hand.heroCards[0]) cards.push(hand.heroCards[0]);
    if (hand.heroCards[1]) cards.push(hand.heroCards[1]);
    hand.board.flop.forEach((c) => c && cards.push(c));
    if (hand.board.turn) cards.push(hand.board.turn);
    if (hand.board.river) cards.push(hand.board.river);
    // 相手のハンドも追加
    if (hand.opponentHands) {
      Object.values(hand.opponentHands).forEach((oppCards) => {
        if (oppCards[0]) cards.push(oppCards[0]);
        if (oppCards[1]) cards.push(oppCards[1]);
      });
    }
    return cards;
  }, [hand]);

  // カード選択ハンドラ
  const handleCardSelect = (card: Card) => {
    if (!hand) return;

    if (inputMode === 'heroCard') {
      const newHeroCards = [...hand.heroCards] as [Card | undefined, Card | undefined];
      newHeroCards[heroCardSlot] = card;
      setHand({ ...hand, heroCards: newHeroCards });

      // 次のスロットへ or 入力終了
      if (heroCardSlot === 0 && !hand.heroCards[1]) {
        setHeroCardSlot(1);
      } else {
        setInputMode('none');
      }
    } else if (inputMode === 'board' && boardSlot) {
      const newBoard: Board = { ...hand.board };
      if (boardSlot === 'flop0') {
        newBoard.flop = [card, hand.board.flop[1], hand.board.flop[2]];
      } else if (boardSlot === 'flop1') {
        newBoard.flop = [hand.board.flop[0], card, hand.board.flop[2]];
      } else if (boardSlot === 'flop2') {
        newBoard.flop = [hand.board.flop[0], hand.board.flop[1], card];
      } else if (boardSlot === 'turn') {
        newBoard.turn = card;
      } else if (boardSlot === 'river') {
        newBoard.river = card;
      }
      setHand({ ...hand, board: newBoard });
      setBoardSlot(null);
      setInputMode('none');
    } else if (inputMode === 'opponentCard' && opponentCardSlot) {
      const newOpponentHands = { ...hand.opponentHands };
      const pos = opponentCardSlot.position;
      const currentCards = newOpponentHands[pos] || [undefined, undefined];
      const newCards: [Card | undefined, Card | undefined] = [...currentCards] as [Card | undefined, Card | undefined];
      newCards[opponentCardSlot.slot] = card;
      newOpponentHands[pos] = newCards;
      setHand({ ...hand, opponentHands: newOpponentHands });

      // 次のスロットへ or 入力終了
      if (opponentCardSlot.slot === 0 && !currentCards[1]) {
        setOpponentCardSlot({ position: pos, slot: 1 });
      } else {
        setOpponentCardSlot(null);
        setInputMode('none');
      }
    }
  };

  // Heroカードスロットクリック
  const handleHeroCardClick = (slot: HeroCardSlot) => {
    setInputMode('heroCard');
    setHeroCardSlot(slot);
    setBoardSlot(null);
    setOpponentCardSlot(null);
  };

  // 相手カードスロットクリック
  const handleOpponentCardClick = (position: Position, slot: 0 | 1) => {
    setInputMode('opponentCard');
    setOpponentCardSlot({ position, slot });
    setBoardSlot(null);
  };

  // ボードスロットクリック
  const handleBoardSlotSelect = (slot: BoardSlot | null) => {
    if (slot) {
      setInputMode('board');
      setBoardSlot(slot);
    } else {
      setBoardSlot(null);
      setInputMode('none');
    }
  };

  // テーブルサイズ変更
  const handleTableSizeChange = (size: number) => {
    if (!hand) return;
    const positions = POSITIONS_BY_TABLE_SIZE[size] || POSITIONS_BY_TABLE_SIZE[6];
    const newAssignments: Record<string, TableAssignment> = {};

    positions.forEach((pos) => {
      if (hand.tableAssignments[pos]) {
        newAssignments[pos] = hand.tableAssignments[pos];
      } else {
        newAssignments[pos] = {};
      }
    });

    // Hero位置の調整
    let heroPos = hand.heroPosition;
    if (!positions.includes(heroPos as Position)) {
      heroPos = 'BTN';
    }

    // 設定を保存
    saveSettings({ ...getSettings(), lastTableSize: size });

    setHand({
      ...hand,
      tableSize: size,
      heroPosition: heroPos as Position,
      tableAssignments: newAssignments,
    });
  };

  // ブラインド変更
  const handleBlindChange = (blind: BlindLevel) => {
    if (!hand) return;
    saveSettings({ ...getSettings(), lastBlind: blind });
    setHand({ ...hand, blind });
  };

  // Hero位置変更
  const handleSetHero = (pos: Position) => {
    if (!hand) return;
    const newAssignments = { ...hand.tableAssignments };

    // 既存のHeroフラグをクリア
    Object.keys(newAssignments).forEach((p) => {
      if (newAssignments[p]?.isHero) {
        newAssignments[p] = { ...newAssignments[p], isHero: false };
      }
    });

    // 新しいHeroを設定
    newAssignments[pos] = { ...newAssignments[pos], isHero: true };

    setHand({
      ...hand,
      heroPosition: pos,
      tableAssignments: newAssignments,
    });
  };

  // プレイヤー割り当て
  const handlePlayerAssign = (pos: Position, playerId: string | undefined) => {
    if (!hand) return;
    const newAssignments = { ...hand.tableAssignments };
    newAssignments[pos] = { ...newAssignments[pos], playerId };
    setHand({ ...hand, tableAssignments: newAssignments });
  };

  // アクション追加
  const handleAddAction = (action: Action) => {
    if (!hand) return;
    setHand({ ...hand, actions: [...hand.actions, action] });
  };

  // アクション削除
  const handleRemoveAction = (actionId: string) => {
    if (!hand) return;
    setHand({
      ...hand,
      actions: hand.actions.filter((a) => a.id !== actionId),
    });
  };

  // 勝者トグル
  const handleWinnerToggle = (pos: Position) => {
    if (!hand) return;
    const winners = [...hand.result.winnersPositions];
    const idx = winners.indexOf(pos);
    if (idx >= 0) {
      winners.splice(idx, 1);
    } else {
      winners.push(pos);
    }
    setHand({ ...hand, result: { ...hand.result, winnersPositions: winners } });
  };

  // ショーダウントグル
  const handleShowdownToggle = () => {
    if (!hand) return;
    setHand({
      ...hand,
      result: { ...hand.result, showdown: !hand.result.showdown },
    });
  };

  // スポットメモ更新
  const handleSpotMemoChange = (memo: string) => {
    if (!hand) return;
    setHand({ ...hand, spotMemo: memo });
  };

  // 完了
  const handleComplete = () => {
    if (!hand) return;
    setHand({ ...hand, status: 'done' });
    navigate('/');
  };

  // 下書き保存
  const handleSaveDraft = () => {
    if (!hand) return;
    setHand({ ...hand, status: 'draft' });
    navigate('/');
  };

  // コピー
  const handleCopy = async () => {
    if (!hand) return;
    const text = generateShareText(hand);
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!hand) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const positions = POSITIONS_BY_TABLE_SIZE[hand.tableSize] || POSITIONS_BY_TABLE_SIZE[6];

  return (
    <div className="min-h-full flex flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 btn-tap"
            >
              下書き保存
            </button>
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-500 btn-tap"
            >
              完了
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 scroll-area">
        <div className="px-4 py-4 space-y-6">
          {/* ゲーム設定 */}
          <section className="bg-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-gray-400">ゲーム設定</h2>

            {/* ブラインド */}
            <div>
              <div className="text-xs text-gray-500 mb-2">ブラインド</div>
              <div className="flex gap-2">
                {BLIND_OPTIONS.map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBlindChange(b)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      hand.blind === b
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* テーブルサイズ */}
            <div>
              <div className="text-xs text-gray-500 mb-2">テーブル人数</div>
              <div className="flex flex-wrap gap-2">
                {TABLE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleTableSizeChange(size)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      hand.tableSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* テーブル割り当て */}
          <section className="bg-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-400">テーブル割り当て（UTGから順に）</h2>
            {positions.map((pos) => {
              const assignment = hand.tableAssignments[pos] || {};
              const isHero = pos === hand.heroPosition;
              return (
                <PlayerSelector
                  key={pos}
                  position={pos}
                  selectedPlayerId={assignment.playerId}
                  onSelect={(playerId) => handlePlayerAssign(pos, playerId)}
                  isHero={isHero}
                  onSetHero={() => handleSetHero(pos)}
                />
              );
            })}
          </section>

          {/* Heroハンド */}
          <section className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">
              Hero ({hand.heroPosition})
            </h2>
            <div className="flex gap-3 justify-center">
              <CardDisplay
                card={hand.heroCards[0]}
                onClick={() => handleHeroCardClick(0)}
                selected={inputMode === 'heroCard' && heroCardSlot === 0}
                size="lg"
              />
              <CardDisplay
                card={hand.heroCards[1]}
                onClick={() => handleHeroCardClick(1)}
                selected={inputMode === 'heroCard' && heroCardSlot === 1}
                size="lg"
              />
            </div>
          </section>

          {/* ボード */}
          <section className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">ボード</h2>
            <BoardInput
              board={hand.board}
              onBoardChange={(board) => setHand({ ...hand, board })}
              usedCards={getUsedCards()}
              selectedSlot={boardSlot}
              onSlotSelect={handleBoardSlotSelect}
            />
          </section>

          {/* アクション */}
          <section className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400">アクション（重要なもののみ）</h2>
              <div className="flex gap-1">
                {(['preflop', 'flop', 'turn', 'river'] as Street[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCurrentStreet(s)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      currentStreet === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {s === 'preflop' ? 'PF' : s[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <ActionInput
              tableSize={hand.tableSize}
              blind={hand.blind}
              actions={hand.actions}
              onAddAction={handleAddAction}
              onRemoveAction={handleRemoveAction}
              currentStreet={currentStreet}
              onNextStreet={() => {
                const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
                const currentIndex = streets.indexOf(currentStreet);
                if (currentIndex < streets.length - 1) {
                  setCurrentStreet(streets[currentIndex + 1]);
                }
              }}
            />
          </section>

          {/* 結果 */}
          <section className="bg-gray-800 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-gray-400">結果</h2>

            {/* 勝者選択 */}
            <div>
              <div className="text-xs text-gray-500 mb-2">勝者（複数選択可）</div>
              <div className="flex flex-wrap gap-2">
                {playersInHand.map((pos) => {
                  const isWinner = hand.result.winnersPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      onClick={() => handleWinnerToggle(pos)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isWinner
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ショーダウン */}
            <div>
              <button
                onClick={handleShowdownToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hand.result.showdown
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Showdown: {hand.result.showdown ? 'Yes' : 'No'}
              </button>
            </div>

            {/* 相手のハンド入力 */}
            {hand.result.showdown && (
              <div>
                <div className="text-xs text-gray-500 mb-2">相手のハンド</div>
                <div className="space-y-2">
                  {playersInHand
                    .filter((pos) => pos !== hand.heroPosition)
                    .map((pos) => {
                      const oppCards = hand.opponentHands[pos] || [undefined, undefined];
                      return (
                        <div key={pos} className="flex items-center gap-3">
                          <span className="text-yellow-400 font-medium w-12">{pos}</span>
                          <div className="flex gap-2">
                            <CardDisplay
                              card={oppCards[0]}
                              onClick={() => handleOpponentCardClick(pos, 0)}
                              selected={
                                inputMode === 'opponentCard' &&
                                opponentCardSlot?.position === pos &&
                                opponentCardSlot?.slot === 0
                              }
                              size="md"
                            />
                            <CardDisplay
                              card={oppCards[1]}
                              onClick={() => handleOpponentCardClick(pos, 1)}
                              selected={
                                inputMode === 'opponentCard' &&
                                opponentCardSlot?.position === pos &&
                                opponentCardSlot?.slot === 1
                              }
                              size="md"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </section>

          {/* スポットメモ */}
          <section className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">スポットメモ</h2>
            <textarea
              value={hand.spotMemo}
              onChange={(e) => handleSpotMemoChange(e.target.value)}
              placeholder="このハンドについてのメモ..."
              className="input-field h-24 resize-none"
            />
          </section>

          {/* コピーボタン */}
          <button
            onClick={handleCopy}
            className={`w-full py-4 rounded-xl font-medium text-center transition-colors ${
              copySuccess
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } btn-tap`}
          >
            {copySuccess ? 'コピーしました!' : '共有用テキストをコピー'}
          </button>
        </div>
      </main>

      {/* 下部固定カード入力パッド */}
      {(inputMode === 'heroCard' || inputMode === 'board' || inputMode === 'opponentCard') && (
        <div className="bottom-pad p-3 animate-fade-in">
          <CardInput
            usedCards={getUsedCards()}
            onCardSelect={handleCardSelect}
          />
        </div>
      )}
    </div>
  );
}
