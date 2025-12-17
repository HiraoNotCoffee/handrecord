import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Action,
  ActionType,
  Street,
  Position,
  BlindLevel,
  TableAssignment,
  PREFLOP_SIZE_PRESETS,
  POSTFLOP_SIZE_PRESETS,
  PREFLOP_ACTION_ORDER,
  POSTFLOP_ACTION_ORDER,
} from '../types';

interface ActionInputProps {
  tableSize: number;
  blind: BlindLevel;
  actions: Action[];
  onAddAction: (action: Action) => void;
  onRemoveAction: (id: string) => void;
  currentStreet: Street;
  onNextStreet?: () => void;
  tableAssignments: Record<string, TableAssignment>;
}

// ブラインドからBB額を取得
function getBBSize(blind: BlindLevel): number {
  switch (blind) {
    case '0.5/1':
      return 1;
    case '1/1':
      return 1;
    case '1/2':
      return 2;
    default:
      return 2;
  }
}

// ブラインドからSB額を取得
function getSBSize(blind: BlindLevel): number {
  switch (blind) {
    case '0.5/1':
      return 0.5;
    case '1/1':
      return 1;
    case '1/2':
      return 1;
    default:
      return 1;
  }
}

export default function ActionInput({
  tableSize,
  blind,
  actions,
  onAddAction,
  onRemoveAction,
  currentStreet,
  onNextStreet,
  tableAssignments,
}: ActionInputProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedType, setSelectedType] = useState<ActionType | null>(null);
  const [showNumpad, setShowNumpad] = useState(false);
  const [customSize, setCustomSize] = useState('');

  const isPreflop = currentStreet === 'preflop';
  const bbSize = getBBSize(blind);
  const sbSize = getSBSize(blind);

  // アクション順
  const preflopOrder = useMemo(() => {
    return PREFLOP_ACTION_ORDER[tableSize] || [];
  }, [tableSize]);

  const postflopOrder = useMemo(() => {
    return POSTFLOP_ACTION_ORDER[tableSize] || [];
  }, [tableSize]);

  // プリフロップのアクション
  const preflopActions = useMemo(() => {
    return actions.filter((a) => a.street === 'preflop');
  }, [actions]);

  // プリフロップで「ハンドに残った」プレイヤー（オリジナルレイザー + コーラー）
  const playersInHand = useMemo(() => {
    // 最後のレイズを探す
    const raises = preflopActions.filter((a) => a.type === 'RAISE');
    if (raises.length === 0) {
      // レイズがない場合は全員（リンプポット）
      return postflopOrder;
    }

    const lastRaise = raises.reduce((latest, current) =>
      current.order > latest.order ? current : latest
    );
    const lastRaiseOrder = lastRaise.order;

    // 最後のレイズ以降にCALLまたはALLINしたプレイヤー + レイザー
    const inHand: Position[] = [lastRaise.position];

    preflopActions.forEach((a) => {
      if (a.order > lastRaiseOrder && (a.type === 'CALL' || (a.type === 'RAISE' && a.sizeBb === -1))) {
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

    // ポストフロップのアクション順でソート
    return postflopOrder.filter((pos) => inHand.includes(pos));
  }, [preflopActions, postflopOrder]);

  // 明示的にFOLDアクションを記録したポジション
  const explicitlyFoldedPositions = useMemo(() => {
    return actions
      .filter((a) => a.type === 'FOLD')
      .map((a) => a.position);
  }, [actions]);

  // プリフロップで「スキップされた」ポジション（暗黙的fold）
  const implicitlyFoldedPositions = useMemo(() => {
    if (!isPreflop) return [];

    const preflopRaises = preflopActions.filter((a) => a.type === 'RAISE');
    if (preflopRaises.length === 0) return [];

    const firstRaiseAction = preflopRaises.reduce((earliest, current) =>
      current.order < earliest.order ? current : earliest
    );
    const firstRaisePos = firstRaiseAction.position;
    const firstRaisePosIndex = preflopOrder.indexOf(firstRaisePos);

    const implicitFolds: Position[] = [];
    for (let i = 0; i < firstRaisePosIndex; i++) {
      const pos = preflopOrder[i];
      const hasExplicitAction = preflopActions.some((a) => a.position === pos);
      if (!hasExplicitAction) {
        implicitFolds.push(pos);
      }
    }

    return implicitFolds;
  }, [preflopActions, preflopOrder, isPreflop]);

  // 全てのfold済みポジション
  const allFoldedPositions = useMemo(() => {
    return [...new Set([...explicitlyFoldedPositions, ...implicitlyFoldedPositions])];
  }, [explicitlyFoldedPositions, implicitlyFoldedPositions]);

  // 現在のストリートでアクション可能なポジション
  const availablePositions = useMemo(() => {
    if (isPreflop) {
      return preflopOrder.filter((pos) => !allFoldedPositions.includes(pos));
    } else {
      // フロップ以降: ハンドに残ったプレイヤーのみ
      return playersInHand.filter((pos) => !explicitlyFoldedPositions.includes(pos));
    }
  }, [isPreflop, preflopOrder, postflopOrder, allFoldedPositions, playersInHand, explicitlyFoldedPositions]);

  // ポットサイズ計算
  const potSize = useMemo(() => {
    let pot = 0;

    // ブラインド
    const hasSB = tableSize >= 3;
    if (hasSB) {
      pot += sbSize / bbSize; // SB in BB
    }
    pot += 1; // BB

    // 各ストリートまでのアクションを集計
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const currentStreetIndex = streets.indexOf(currentStreet);

    // 各ポジションの現在のベット額を追跡
    const bets: Record<string, number> = {};

    // プリフロップの初期ベット
    if (hasSB) {
      bets['SB'] = sbSize / bbSize;
    }
    bets['BB'] = 1;

    for (let i = 0; i <= currentStreetIndex; i++) {
      const street = streets[i];
      const streetActions = actions.filter((a) => a.street === street);

      if (i < currentStreetIndex) {
        // 前のストリート: 全アクションを計算
        streetActions.forEach((a) => {
          if (a.type === 'RAISE' && a.sizeBb !== undefined) {
            const size = a.sizeBb === -1 ? 100 : a.sizeBb; // all-inは仮に100BBとして計算
            bets[a.position] = size;
          } else if (a.type === 'CALL') {
            // コール額は最大ベット額
            const maxBet = Math.max(...Object.values(bets), 0);
            bets[a.position] = maxBet;
          }
        });

        // ストリート終了時にポットに加算してベットをリセット
        pot += Object.values(bets).reduce((sum, b) => sum + b, 0);
        Object.keys(bets).forEach((k) => (bets[k] = 0));
      }
    }

    return pot;
  }, [actions, currentStreet, tableSize, bbSize, sbSize]);

  // 各ポジションの残りスタック（現在のストリートまで消費した分を引く）
  const getRemainingStack = useMemo(() => {
    return (pos: Position): number | undefined => {
      const assignment = tableAssignments[pos];
      if (!assignment?.stackBb) return undefined;

      let spent = 0;
      const hasSB = tableSize >= 3;

      // ブラインド消費
      if (pos === 'SB' && hasSB) {
        spent += sbSize / bbSize;
      } else if (pos === 'BB') {
        spent += 1;
      }

      // 全アクションの消費を計算
      actions.forEach((a) => {
        if (a.position === pos && a.sizeBb && a.sizeBb > 0) {
          spent = a.sizeBb; // レイズはトータル額なので上書き
        } else if (a.position === pos && a.type === 'CALL') {
          // コール額は最後のレイズ額
          const priorActions = actions.filter((pa) => pa.order < a.order && pa.street === a.street);
          const lastRaise = priorActions.filter((pa) => pa.type === 'RAISE').pop();
          if (lastRaise?.sizeBb && lastRaise.sizeBb > 0) {
            spent = lastRaise.sizeBb;
          }
        }
      });

      return Math.max(0, assignment.stackBb - spent);
    };
  }, [tableAssignments, actions, tableSize, sbSize, bbSize]);

  // 選択中ポジションのオールインサイズ
  const allInSize = useMemo(() => {
    if (!selectedPosition) return undefined;
    return getRemainingStack(selectedPosition);
  }, [selectedPosition, getRemainingStack]);

  // 現在のストリートでのRAISE回数
  const currentStreetRaiseCount = useMemo(() => {
    return actions.filter(
      (a) => a.street === currentStreet && a.type === 'RAISE'
    ).length;
  }, [actions, currentStreet]);

  // 現在のストリートのアクション
  const currentStreetActions = useMemo(() => {
    return actions.filter((a) => a.street === currentStreet);
  }, [actions, currentStreet]);

  // ストリートが完了したかどうかを判定
  const isStreetComplete = useMemo(() => {
    if (currentStreetActions.length === 0) return false;

    // 現在のストリートでのレイズ/ベット
    const streetRaises = currentStreetActions.filter((a) => a.type === 'RAISE');

    // 最後のアクションを取得
    const lastAction = currentStreetActions.reduce((latest, current) =>
      current.order > latest.order ? current : latest
    );

    // 最後のアクションがレイズなら未完了
    if (lastAction.type === 'RAISE' && lastAction.sizeBb !== -1) {
      return false;
    }

    if (isPreflop) {
      if (streetRaises.length > 0) {
        // 最後のアクションがCALLの場合
        if (lastAction.type === 'CALL') {
          if (streetRaises.length === 1) {
            // オープンのみ: BBがコールしたら完了
            if (lastAction.position === 'BB') {
              return true;
            }
          } else {
            // 3bet以上: 前のレイザーがコールしたら完了
            // 例: UTG open → CO 3bet → UTG call → 完了
            // 例: UTG open → CO 3bet → UTG 4bet → CO call → 完了
            const sortedRaises = [...streetRaises].sort((a, b) => a.order - b.order);
            const lastRaiserPos = sortedRaises[sortedRaises.length - 1].position;
            const secondLastRaiserPos = sortedRaises[sortedRaises.length - 2].position;

            // 前のレイザー（re-raiseされた人）がコールしたら完了
            if (lastAction.position === secondLastRaiserPos) {
              return true;
            }
          }
        }

        // FOLDで1人だけ残ったら完了
        const foldedInStreet = currentStreetActions
          .filter((a) => a.type === 'FOLD')
          .map((a) => a.position);
        const activePlayers = preflopOrder.filter(
          (p) => !allFoldedPositions.includes(p) && !foldedInStreet.includes(p)
        );
        if (activePlayers.length === 1) {
          return true;
        }
      }
    } else {
      // ポストフロップ
      if (streetRaises.length > 0) {
        // ベット/レイズがある場合
        const lastRaise = streetRaises.reduce((latest, current) =>
          current.order > latest.order ? current : latest
        );
        const lastRaiserPos = lastRaise.position;
        const lastRaiseOrder = lastRaise.order;

        // 最後のレイザー以外のアクティブプレイヤー
        const otherActivePlayers = availablePositions.filter((p) => p !== lastRaiserPos);

        // 最後のレイズ以降に全員がアクションしたか確認
        const actionsAfterLastRaise = currentStreetActions.filter((a) => a.order > lastRaiseOrder);
        const playersActedAfterRaise = actionsAfterLastRaise.map((a) => a.position);

        const allOthersActed = otherActivePlayers.every((p) =>
          playersActedAfterRaise.includes(p) || explicitlyFoldedPositions.includes(p)
        );

        const lastAction = currentStreetActions.reduce((latest, current) =>
          current.order > latest.order ? current : latest
        );
        const lastActionIsNotRaise = lastAction.type !== 'RAISE' || lastAction.sizeBb === -1;

        return allOthersActed && lastActionIsNotRaise;
      } else {
        // チェック回りの場合: 全員がチェックしたら完了
        const checkCount = currentStreetActions.filter((a) => a.type === 'CHECK').length;
        return checkCount >= availablePositions.length;
      }
    }

    return false;
  }, [currentStreetActions, availablePositions, explicitlyFoldedPositions, isPreflop, preflopOrder, allFoldedPositions, implicitlyFoldedPositions]);

  // 次のストリート名
  const nextStreetName = useMemo(() => {
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const currentIndex = streets.indexOf(currentStreet);
    if (currentIndex < streets.length - 1) {
      const next = streets[currentIndex + 1];
      return next === 'flop' ? 'Flop' : next === 'turn' ? 'Turn' : 'River';
    }
    return null;
  }, [currentStreet]);

  // RAISE回数からラベルを決定
  const getRaiseLabel = (raiseCount: number): string => {
    if (isPreflop) {
      switch (raiseCount) {
        case 0:
          return 'Open';
        case 1:
          return '3bet';
        case 2:
          return '4bet';
        default:
          return `${raiseCount + 2}bet`;
      }
    }
    return raiseCount === 0 ? 'Bet' : 'Raise';
  };

  // 3bet以上かどうか
  const isThreeBetOrMore = isPreflop && currentStreetRaiseCount >= 1;

  // プリセット
  const sizePresets = isPreflop
    ? isThreeBetOrMore
      ? []
      : PREFLOP_SIZE_PRESETS
    : POSTFLOP_SIZE_PRESETS;

  const handlePositionSelect = (pos: Position) => {
    setSelectedPosition(pos);
    setSelectedType(null);
    setShowNumpad(false);
    setCustomSize('');
  };

  const handleTypeSelect = (type: ActionType) => {
    if (!selectedPosition) return;

    if (type === 'FOLD' || type === 'CHECK' || type === 'CALL') {
      const action: Action = {
        id: uuidv4(),
        order: actions.length,
        street: currentStreet,
        position: selectedPosition,
        type,
      };
      onAddAction(action);
      resetSelection();
      return;
    }

    if (type === 'ALLIN') {
      const action: Action = {
        id: uuidv4(),
        order: actions.length,
        street: currentStreet,
        position: selectedPosition,
        type: 'RAISE',
        sizeBb: allInSize !== undefined ? allInSize : -1,
      };
      onAddAction(action);
      resetSelection();
      return;
    }

    if (isThreeBetOrMore && type === 'RAISE') {
      setSelectedType(type);
      setShowNumpad(true);
      setCustomSize('');
      return;
    }

    setSelectedType(type);
    setShowNumpad(false);
  };

  // ポストフロップのポット比プリセットからBB数を計算
  const handlePotRatioSelect = (ratio: number) => {
    if (!selectedPosition || !selectedType) return;

    // ポット比からBB数を計算（1単位で四捨五入）
    const calculatedBb = Math.round(potSize * ratio);

    const action: Action = {
      id: uuidv4(),
      order: actions.length,
      street: currentStreet,
      position: selectedPosition,
      type: 'RAISE',
      sizeBb: calculatedBb,
    };
    onAddAction(action);
    resetSelection();
  };

  // プリフロップの固定BB数を設定
  const handleSizeSelect = (sizeBb: number) => {
    if (!selectedPosition || !selectedType) return;

    const action: Action = {
      id: uuidv4(),
      order: actions.length,
      street: currentStreet,
      position: selectedPosition,
      type: 'RAISE',
      sizeBb,
    };
    onAddAction(action);
    resetSelection();
  };

  const handleNumpadInput = (digit: string) => {
    if (digit === '.') {
      if (customSize.includes('.')) return;
    }
    setCustomSize((prev) => prev + digit);
  };

  const handleNumpadDelete = () => {
    setCustomSize((prev) => prev.slice(0, -1));
  };

  const handleNumpadConfirm = () => {
    const size = parseFloat(customSize);
    if (!isNaN(size) && size > 0) {
      handleSizeSelect(size);
    }
  };

  const resetSelection = () => {
    setSelectedPosition(null);
    setSelectedType(null);
    setShowNumpad(false);
    setCustomSize('');
  };

  useEffect(() => {
    resetSelection();
  }, [currentStreet]);

  // ストリート完了時に自動で次のストリートへ
  useEffect(() => {
    if (isStreetComplete && nextStreetName && onNextStreet) {
      // 少し遅延を入れて視覚的にアクション完了が分かるようにする
      const timer = setTimeout(() => {
        onNextStreet();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isStreetComplete, nextStreetName, onNextStreet]);

  const streetActions = actions.filter((a) => a.street === currentStreet);

  const getActionDisplayLabel = (action: Action): string => {
    if (action.type === 'RAISE') {
      const priorRaises = actions.filter(
        (a) => a.street === action.street && a.type === 'RAISE' && a.order < action.order
      ).length;

      if (action.street === 'preflop') {
        switch (priorRaises) {
          case 0:
            return 'open';
          case 1:
            return '3bet';
          case 2:
            return '4bet';
          default:
            return `${priorRaises + 2}bet`;
        }
      }
      return priorRaises === 0 ? 'bet' : 'raise';
    }
    return action.type.toLowerCase();
  };

  const formatSize = (sizeBb: number | undefined): string => {
    if (sizeBb === undefined) return '';
    if (sizeBb === -1) return 'all-in';
    return `${sizeBb}bb`;
  };

  // 全ストリートのアクションをグループ化
  const actionsByStreet = useMemo(() => {
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const result: Record<Street, Action[]> = {
      preflop: [],
      flop: [],
      turn: [],
      river: [],
    };
    actions.forEach((a) => {
      result[a.street].push(a);
    });
    // 各ストリートをソート
    streets.forEach((s) => {
      result[s].sort((a, b) => a.order - b.order);
    });
    return result;
  }, [actions]);

  const streetLabels: Record<Street, string> = {
    preflop: 'PF',
    flop: 'F',
    turn: 'T',
    river: 'R',
  };

  return (
    <div className="space-y-4">
      {/* ポットサイズ表示（フロップ以降） */}
      {!isPreflop && (
        <div className="bg-blue-900/50 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-blue-300">Pot at {currentStreet}</span>
          <span className="text-lg font-bold text-blue-200">{potSize.toFixed(1)} BB</span>
        </div>
      )}

      {/* 全ストリートのアクションログ */}
      {actions.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
          <div className="text-xs text-gray-400">Actions</div>
          {(['preflop', 'flop', 'turn', 'river'] as Street[]).map((street, streetIndex) => {
            const streetActs = actionsByStreet[street];
            const isCurrentStreet = street === currentStreet;
            const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];

            // このストリートより後にアクションがあるか確認
            const hasLaterActions = streets.slice(streetIndex + 1).some(
              (laterStreet) => actionsByStreet[laterStreet].length > 0
            );

            // アクションがなく、後のストリートにアクションがある場合は「全員check」を表示
            const showImpliedChecks = streetActs.length === 0 && hasLaterActions && street !== 'preflop';

            if (streetActs.length === 0 && !showImpliedChecks) return null;

            return (
              <div key={street} className={`${isCurrentStreet ? '' : 'opacity-70'}`}>
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-bold w-6 ${isCurrentStreet ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {streetLabels[street]}:
                  </span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {showImpliedChecks ? (
                      // 暗黙的check表示
                      <span className="text-gray-500 text-xs italic">
                        ({playersInHand.join(', ')} check)
                      </span>
                    ) : (
                      streetActs.map((action) => {
                        const label = getActionDisplayLabel(action);
                        const size = formatSize(action.sizeBb);

                        return (
                          <div
                            key={action.id}
                            className="flex items-center gap-1 bg-gray-600 px-2 py-0.5 rounded text-xs"
                          >
                            <span className="text-yellow-400">{action.position}</span>
                            <span className="text-gray-300">{label}</span>
                            {size && <span className="text-blue-400">{size}</span>}
                            {/* 現在のストリートのみ削除ボタン表示 */}
                            {isCurrentStreet && (
                              <button
                                onClick={() => onRemoveAction(action.id)}
                                className="text-gray-400 hover:text-red-400 ml-0.5"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 暗黙的fold表示（プリフロのみ） */}
      {implicitlyFoldedPositions.length > 0 && isPreflop && (
        <div className="text-xs text-gray-500">
          自動Fold: {implicitlyFoldedPositions.join(', ')}
        </div>
      )}

      {/* ハンドに残ったプレイヤー表示（フロップ以降） */}
      {!isPreflop && playersInHand.length > 0 && streetActions.length === 0 && (
        <div className="text-xs text-gray-500">
          参加者: {playersInHand.join(', ')}
          <span className="ml-2 text-gray-600">(アクションなしで次へ進むとチェック扱い)</span>
        </div>
      )}

      {/* ストリート完了表示（自動で次へ進む） */}
      {isStreetComplete && nextStreetName && (
        <div className="bg-green-900/50 rounded-lg p-3 text-center animate-fade-in">
          <div className="text-green-300 text-sm">{nextStreetName} へ移動中...</div>
        </div>
      )}

      {/* ポジション選択 */}
      {!selectedPosition && availablePositions.length > 0 && !isStreetComplete && (
        <div>
          <div className="text-sm text-gray-400 mb-2">ポジションを選択</div>
          <div className="flex flex-wrap gap-2">
            {availablePositions.map((pos) => (
              <button
                key={pos}
                onClick={() => handlePositionSelect(pos)}
                className="position-chip"
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* アクション種別選択 */}
      {selectedPosition && !selectedType && (
        <div className="animate-fade-in">
          <div className="text-sm text-gray-400 mb-2">
            <span className="text-yellow-400 font-bold">{selectedPosition}</span> のアクション
            <button
              onClick={resetSelection}
              className="ml-2 text-gray-500 hover:text-white text-xs"
            >
              (戻る)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTypeSelect('FOLD')}
              className="action-btn action-btn-danger"
            >
              Fold
            </button>
            <button
              onClick={() => handleTypeSelect('CHECK')}
              className="action-btn"
            >
              Check
            </button>
            <button
              onClick={() => handleTypeSelect('CALL')}
              className="action-btn"
            >
              Call
            </button>
            <button
              onClick={() => handleTypeSelect('RAISE')}
              className="action-btn action-btn-primary"
            >
              {getRaiseLabel(currentStreetRaiseCount)}
            </button>
            <button
              onClick={() => handleTypeSelect('ALLIN')}
              className="action-btn action-btn-success"
            >
              All-in{allInSize !== undefined ? ` (${allInSize}bb)` : ''}
            </button>
          </div>
        </div>
      )}

      {/* サイズ選択（プリセット） */}
      {selectedType && !showNumpad && sizePresets.length > 0 && (
        <div className="animate-fade-in">
          <div className="text-sm text-gray-400 mb-2">
            <span className="text-yellow-400">{selectedPosition}</span>{' '}
            <span className="text-blue-400">{getRaiseLabel(currentStreetRaiseCount)}</span> サイズ
            <button
              onClick={() => setSelectedType(null)}
              className="ml-2 text-gray-500 hover:text-white text-xs"
            >
              (戻る)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  isPreflop
                    ? handleSizeSelect(preset.value)
                    : handlePotRatioSelect(preset.value)
                }
                className="action-btn"
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => {
                setShowNumpad(true);
                setCustomSize('');
              }}
              className="action-btn"
            >
              数値入力
            </button>
          </div>
        </div>
      )}

      {/* 数値入力モーダル */}
      {showNumpad && (
        <>
          {/* モーダル背景（クリックで閉じる） */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              if (sizePresets.length > 0) {
                setShowNumpad(false);
              } else {
                setSelectedType(null);
                setShowNumpad(false);
              }
            }}
          />
          {/* モーダル本体 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-2xl p-4 animate-fade-in">
            <div className="text-sm text-gray-400 mb-2">
              <span className="text-yellow-400">{selectedPosition}</span>{' '}
              <span className="text-blue-400">{getRaiseLabel(currentStreetRaiseCount)}</span>{' '}
              BB数を入力
              <button
                onClick={() => {
                  if (sizePresets.length > 0) {
                    setShowNumpad(false);
                  } else {
                    setSelectedType(null);
                    setShowNumpad(false);
                  }
                }}
                className="ml-2 text-gray-500 hover:text-white text-xs"
              >
                (戻る)
              </button>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="bg-gray-900 rounded px-4 py-3 mb-3 text-right text-2xl font-mono">
                {customSize || '0'} <span className="text-gray-500 text-lg">BB</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '←'].map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() =>
                        key === '←' ? handleNumpadDelete() : handleNumpadInput(key)
                      }
                      className="py-3 text-xl font-bold bg-gray-600 rounded-lg hover:bg-gray-500 btn-tap"
                    >
                      {key}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={handleNumpadConfirm}
                disabled={!customSize || parseFloat(customSize) <= 0}
                className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed btn-tap"
              >
                確定
              </button>
            </div>
          </div>
        </>
      )}

      {/* 全員fold/ヘッズアップ終了の場合 */}
      {availablePositions.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          アクション可能なプレイヤーがいません
        </div>
      )}
    </div>
  );
}
