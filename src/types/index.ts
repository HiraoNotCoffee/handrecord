// ============================================
// NLH Hand Recorder - TypeScript Types
// localStorage スキーマ定義
// ============================================

// カード表現 (例: "As", "Th", "7d", "2c")
// s=spade, h=heart, d=diamond, c=club
export type Card = string;

export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

// ブラインド設定
export type BlindLevel = '0.5/1' | '1/1' | '1/2';

// ストリート
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

// アクション種別
export type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALLIN';

// ポジション（人数に応じて使用するものが変わる）
export type Position =
  | 'UTG' | 'UTG+1'
  | 'LJ' | 'HJ' | 'CO'
  | 'BTN' | 'SB' | 'BB';

// プレイヤー（恒久データ）
export interface Player {
  id: string;
  name: string;
  tags: string[];       // 例: ["REG", "LAG", "NIT"]
  note: string;         // 恒久メモ
  lastSeenAt: number;   // Unix timestamp
}

// アクション
export interface Action {
  id: string;
  order: number;        // 時系列順
  street: Street;
  position: Position;   // 誰が
  type: ActionType;
  sizeBb?: number;      // BET/RAISE/ALLIN時のサイズ（BB基準）
}

// テーブル割り当て（ポジション → プレイヤー）
export interface TableAssignment {
  playerId?: string;    // 未割当の場合は undefined
  isHero?: boolean;     // Heroの場合 true
}

// ボード
export interface Board {
  flop: [Card | undefined, Card | undefined, Card | undefined];
  turn?: Card;
  river?: Card;
}

// 結果
export interface HandResult {
  winnersPositions: Position[];  // 勝者ポジション（split対応で複数可）
  showdown: boolean;
}

// ハンド（1ハンド分の記録）
export interface Hand {
  id: string;
  status: 'draft' | 'done';
  createdAt: number;
  updatedAt: number;

  // ゲーム設定
  tableSize: number;        // 2-9
  blind: BlindLevel;

  // Hero情報
  heroPosition: Position;
  heroCards: [Card | undefined, Card | undefined];

  // テーブル割り当て（ポジション → {playerId, isHero}）
  tableAssignments: Record<string, TableAssignment>;

  // ボード
  board: Board;

  // アクション（重要アクションのみ）
  actions: Action[];

  // 結果
  result: HandResult;

  // 相手のショーダウンハンド（ポジション → カード2枚）
  opponentHands: Record<string, [Card | undefined, Card | undefined]>;

  // スポットメモ
  spotMemo: string;
}

// アプリ設定
export interface AppSettings {
  lastBlind: BlindLevel;
  lastTableSize: number;
}

// ============================================
// localStorage キー
// ============================================
export const STORAGE_KEYS = {
  PLAYERS: 'poker_players_v1',
  HANDS: 'poker_hands_v1',
  SETTINGS: 'poker_settings_v1',
} as const;

// ============================================
// ポジション設定（人数別）
// UTGからBBの順（アクション順）
// ============================================
export const POSITIONS_BY_TABLE_SIZE: Record<number, Position[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['UTG', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

// プリフロップのアクション順（UTG→SB→BB）
export const PREFLOP_ACTION_ORDER: Record<number, Position[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['UTG', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

// ポストフロップのアクション順（SB→BB→UTG...→BTN）
export const POSTFLOP_ACTION_ORDER: Record<number, Position[]> = {
  2: ['BB', 'BTN'],
  3: ['SB', 'BB', 'BTN'],
  4: ['SB', 'BB', 'UTG', 'BTN'],
  5: ['SB', 'BB', 'UTG', 'CO', 'BTN'],
  6: ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'],
  7: ['SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO', 'BTN'],
  8: ['SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN'],
  9: ['SB', 'BB', 'UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN'],
};

// ============================================
// 定数
// ============================================
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};
export const SUIT_COLORS: Record<Suit, string> = {
  s: 'text-gray-900',
  h: 'text-red-500',
  d: 'text-blue-500',
  c: 'text-green-700',
};

// プリフロ用ベットプリセット（BB単位）
export const PREFLOP_SIZE_PRESETS = [
  { label: '2bb', value: 2 },
  { label: '2.5bb', value: 2.5 },
  { label: '3bb', value: 3 },
  { label: '3.5bb', value: 3.5 },
  { label: '4bb', value: 4 },
  { label: 'All-in', value: -1 }, // -1 は all-in を表す
];

// ポストフロップ用ベットプリセット（ポット比）
export const POSTFLOP_SIZE_PRESETS = [
  { label: '1/4 pot', value: 0.25 },
  { label: '1/3 pot', value: 0.33 },
  { label: '1/2 pot', value: 0.5 },
  { label: '2/3 pot', value: 0.67 },
  { label: 'Pot', value: 1 },
];

// デフォルト設定
export const DEFAULT_SETTINGS: AppSettings = {
  lastBlind: '1/2',
  lastTableSize: 6,
};
