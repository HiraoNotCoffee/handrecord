// ============================================
// クリップボード & ハンド共有コピー
// ============================================

import {
  Hand,
  Card,
  Position,
  Action,
  SUIT_SYMBOLS,
  Suit,
} from '../types';
import { getPlayerById } from './storage';

// カードを表示用に変換 (例: "As" → "A♠")
function formatCard(card: Card | undefined): string {
  if (!card) return '??';
  const rank = card[0];
  const suit = card[1] as Suit;
  return `${rank}${SUIT_SYMBOLS[suit] || suit}`;
}

// アクションラベル（open/3bet/4bet等）を導出
function getRaiseLabel(action: Action, allActions: Action[]): string {
  if (action.type !== 'RAISE') {
    return action.type.toLowerCase();
  }

  // 同じストリート内でのRAISE回数をカウント
  const streetActions = allActions.filter(
    (a) => a.street === action.street && a.order <= action.order
  );
  const raiseCount = streetActions.filter((a) => a.type === 'RAISE').length;

  if (action.street === 'preflop') {
    switch (raiseCount) {
      case 1:
        return 'open';
      case 2:
        return '3bet';
      case 3:
        return '4bet';
      case 4:
        return '5bet';
      default:
        return `${raiseCount + 1}bet`;
    }
  }

  return raiseCount === 1 ? 'bet' : 'raise';
}

// サイズを表示用に変換
function formatSize(sizeBb: number | undefined): string {
  if (sizeBb === undefined) return '';
  if (sizeBb === -1) return 'all-in';
  return `${sizeBb}bb`;
}

// アクションを表示用文字列に変換
function formatAction(action: Action, allActions: Action[]): string {
  const label = getRaiseLabel(action, allActions);
  const size = formatSize(action.sizeBb);
  return size ? `${action.position} ${label} ${size}` : `${action.position} ${label}`;
}

// ストリートごとのアクションをフォーマット
function formatStreetActions(
  street: string,
  actions: Action[],
  allActions: Action[]
): string {
  const streetActions = actions.filter((a) => a.street === street);
  if (streetActions.length === 0) return '';

  const prefix =
    street === 'preflop'
      ? 'PF'
      : street === 'flop'
        ? 'F'
        : street === 'turn'
          ? 'T'
          : 'R';

  const formatted = streetActions
    .sort((a, b) => a.order - b.order)
    .map((a) => formatAction(a, allActions))
    .join(' / ');

  return `${prefix}:  ${formatted}`;
}

// 共有用テキストを生成
export function generateShareText(hand: Hand): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push(`[NLH] ${hand.blind} ${hand.tableSize}-max`);

  // Hero
  const heroCard1 = formatCard(hand.heroCards[0]);
  const heroCard2 = formatCard(hand.heroCards[1]);
  lines.push(`Hero: ${hand.heroPosition} ${heroCard1}${heroCard2}`);
  lines.push('');

  // プレイヤー一覧
  lines.push('Players:');
  const positions = Object.keys(hand.tableAssignments) as Position[];
  for (const pos of positions) {
    const assignment = hand.tableAssignments[pos];
    if (assignment?.isHero) {
      lines.push(`${pos}: (Hero)`);
    } else if (assignment?.playerId) {
      const player = getPlayerById(assignment.playerId);
      if (player) {
        const tags = player.tags.length > 0 ? ` (${player.tags.join(', ')})` : '';
        const note = player.note ? ` note: ${player.note.slice(0, 50)}` : '';
        lines.push(`${pos}: ${player.name}${tags}${note}`);
      } else {
        lines.push(`${pos}: (unknown)`);
      }
    } else {
      lines.push(`${pos}: -`);
    }
  }
  lines.push('');

  // ボード
  const flop = hand.board.flop.map(formatCard).join(' ');
  const turn = hand.board.turn ? formatCard(hand.board.turn) : '-';
  const river = hand.board.river ? formatCard(hand.board.river) : '-';
  lines.push(`Flop: ${flop}`);
  lines.push(`Turn: ${turn}`);
  lines.push(`River: ${river}`);
  lines.push('');

  // アクション
  lines.push('Actions (important only):');
  const streets = ['preflop', 'flop', 'turn', 'river'] as const;
  for (const street of streets) {
    const formatted = formatStreetActions(street, hand.actions, hand.actions);
    if (formatted) {
      lines.push(formatted);
    }
  }
  lines.push('');

  // 結果
  const winners = hand.result.winnersPositions.join(', ') || '(not recorded)';
  const showdown = hand.result.showdown ? 'yes' : 'no';
  lines.push(`Result: ${winners} win (showdown: ${showdown})`);

  // スポットメモ
  if (hand.spotMemo) {
    lines.push(`Spot memo: ${hand.spotMemo}`);
  }

  return lines.join('\n');
}

// クリップボードにコピー
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // フォールバック
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      return false;
    }
  }
}
