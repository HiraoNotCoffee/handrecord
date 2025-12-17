# NLH Hand Recorder

ライブポーカー（NLH）のハンドを素早く記録するためのWebアプリです。
スマホ片手操作に最適化されており、ハンド終了後に復元・学習できる程度の記録を目指しています。

---

## 技術スタック

- **フレームワーク**: Vite + React 18 + TypeScript
- **スタイリング**: Tailwind CSS
- **ルーティング**: React Router v6 (HashRouter使用 - GitHub Pages対応)
- **データ永続化**: localStorage (バックエンド不要)
- **デプロイ**: GitHub Pages + GitHub Actions

---

## ディレクトリ構造

```
src/
├── components/
│   ├── ActionInput.tsx    # アクション入力コンポーネント
│   ├── BoardInput.tsx     # ボード（コミュニティカード）入力
│   ├── CardInput.tsx      # カード入力パッド（ランク→スート 2タップ）
│   └── PlayerSelector.tsx # ポジションへのプレイヤー割り当て
├── hooks/
│   └── useUndoRedo.ts     # Undo/Redo カスタムフック
├── pages/
│   ├── Home.tsx           # ハンド一覧画面
│   ├── HandEditor.tsx     # ハンド編集画面（メイン）
│   ├── Players.tsx        # プレイヤー管理画面
│   └── Settings.tsx       # 設定画面
├── types/
│   └── index.ts           # TypeScript型定義
├── utils/
│   ├── storage.ts         # localStorage操作
│   └── clipboard.ts       # 共有テキスト生成
├── App.tsx                # ルーティング設定
├── main.tsx               # エントリーポイント
└── index.css              # Tailwind + カスタムCSS
```

---

## 型定義（src/types/index.ts）

### カード表現

```typescript
// カードは 2文字の文字列（例: "As", "Th", "7d", "2c"）
// 1文字目: Rank (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2)
// 2文字目: Suit (s=spade, h=heart, d=diamond, c=club)
type Card = string;
type Suit = 's' | 'h' | 'd' | 'c';
type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
```

### ポジション

```typescript
// テーブル人数に応じて使用するポジションが変わる
type Position = 'UTG' | 'UTG+1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

// 人数別ポジション（アクション順）
const POSITIONS_BY_TABLE_SIZE: Record<number, Position[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['UTG', 'BTN', 'SB', 'BB'],
  5: ['UTG', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

// プリフロップアクション順: UTG→...→BTN→SB→BB
// ポストフロップアクション順: SB→BB→UTG→...→BTN
```

### ストリート・アクション

```typescript
type Street = 'preflop' | 'flop' | 'turn' | 'river';
type ActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALLIN';
type BlindLevel = '0.5/1' | '1/1' | '1/2';

interface Action {
  id: string;
  order: number;        // 時系列順
  street: Street;
  position: Position;
  type: ActionType;
  sizeBb?: number;      // BET/RAISE/ALLIN時のサイズ（BB単位）, -1 = all-in
}
```

### ハンド・プレイヤー

```typescript
interface Hand {
  id: string;
  status: 'draft' | 'done';
  createdAt: number;    // Unix timestamp
  updatedAt: number;

  // ゲーム設定
  tableSize: number;    // 2-9
  blind: BlindLevel;

  // Hero情報
  heroPosition: Position;
  heroCards: [Card | undefined, Card | undefined];

  // テーブル割り当て（ポジション → プレイヤー）
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

interface Board {
  flop: [Card | undefined, Card | undefined, Card | undefined];
  turn?: Card;
  river?: Card;
}

interface HandResult {
  winnersPositions: Position[];  // 勝者ポジション（split対応で複数可）
  showdown: boolean;
}

interface Player {
  id: string;
  name: string;
  tags: string[];       // 例: ["REG", "LAG", "NIT", "TAG", "FISH"]
  note: string;         // 恒久メモ
  lastSeenAt: number;
}

interface TableAssignment {
  playerId?: string;    // 未割当の場合は undefined
  isHero?: boolean;
}

interface AppSettings {
  lastBlind: BlindLevel;
  lastTableSize: number;
}
```

---

## 機能仕様

### 1. ホーム画面 (Home.tsx)

- ハンド一覧を更新日時順で表示
- フィルター: 「すべて」「下書き」「完了」
- 各ハンドの表示項目:
  - ステータス（完了/下書き）
  - ブラインド（0.5/1, 1/1, 1/2）
  - テーブル人数
  - Heroポジション
  - Heroカード（スート別の色分け）
  - ボード（入力済みの場合）
  - 更新日時
  - 削除ボタン
- 右下の「+」ボタンで新規ハンド作成
- ヘッダーにプレイヤー管理・設定へのリンク

### 2. ハンド編集画面 (HandEditor.tsx)

#### ゲーム設定
- ブラインド選択: 0.5/1, 1/1, 1/2
- テーブル人数選択: 2-9人

#### テーブル割り当て
- 各ポジションにプレイヤーを割り当て可能
- 「Hero」ボタンでHeroポジション設定
- プレイヤー未登録でも使用可能

#### Heroハンド入力
- 2枚のカードスロットをタップで選択
- 下部からカード入力パッドが表示

#### ボード入力
- 5枚すべて横一列に表示（Flop 3枚 + Turn + River）
- 各スロットのラベル表示
- タップで選択、下部からカード入力パッドが表示

#### アクション入力（ActionInput.tsx）
- ストリート切り替えタブ: PF / F / T / R
- **プリフロップ**:
  - オープンレイズはプリセット: 2bb, 2.5bb, 3bb, 3.5bb, 4bb, All-in
  - 3bet以降は直接数値入力
  - 暗黙的フォールド: オープナー前のポジションは自動的にfold扱い
- **ポストフロップ**:
  - Heroを含む残りプレイヤーのみ表示（フォールドしたプレイヤーは非表示）
  - ポット基準のプリセット: 1/4 pot, 1/3 pot, 1/2 pot, 2/3 pot, Pot
  - サイズはポット比率からBB単位に変換（1単位で四捨五入）
  - ストリート開始時のポットサイズを表示
- **アクション表示**:
  - 全ストリートのアクションを常時表示
  - 現在ストリート: 通常表示、削除ボタンあり
  - 過去ストリート: opacity-70、削除ボタンなし
  - スキップされたストリート（例: ターンでアクションなし → リバーへ）は全員CHECKとして表示

#### 残りプレイヤー計算ロジック

```typescript
// playersInHand: ポストフロップで行動できるプレイヤー
// 算出ロジック:
// 1. プリフロップでレイズがない場合 → 全員
// 2. レイズがある場合:
//    - 最後のレイザー
//    - 最後のレイズ以降にCALLしたプレイヤー
//    - All-inしたプレイヤー
// 3. 明示的にFOLDしたプレイヤーを除外
```

#### ポットサイズ計算ロジック

```typescript
// 各ストリート開始時のポットサイズを計算
// 1. 初期値: SB(0.5) + BB(1) = 1.5bb
// 2. プリフロップのアクションを順番に処理:
//    - CALL: +額（コールサイズ = 最後のレイズ額）
//    - BET/RAISE/ALLIN: +額
// 3. ポストフロップも同様に加算
```

#### 結果入力
- **勝者選択**: 残りプレイヤーのみボタン表示、複数選択可（split pot対応）
- **ショーダウン**: Yes/No トグル
- **相手ハンド入力**: ショーダウン=Yesの場合、Hero以外の残りプレイヤーのカード入力欄を表示

#### スポットメモ
- フリーテキスト入力

#### その他機能
- Undo/Redo: カード入力時に使用可能
- 共有コピー: ハンド情報をテキスト形式でクリップボードにコピー
- 自動保存: 状態変更時に自動でlocalStorageに保存

### 3. プレイヤー管理画面 (Players.tsx)

- プレイヤー一覧表示
- 新規プレイヤー追加
- プレイヤー編集（名前、タグ、メモ）
- プレイヤー削除

### 4. 設定画面 (Settings.tsx)

- デフォルトブラインド設定
- デフォルトテーブル人数設定
- データエクスポート/インポート
- 全データ削除

---

## カード入力UI (CardInput.tsx)

### 2タップ入力方式
1. **ランク選択**: A K Q J T 9 8 7 6 5 4 3 2
2. **スート選択**: ♠ ♥ ♦ ♣

### スート別色分け
- ♠ (spade): グレー (text-gray-300)
- ♥ (heart): 赤 (text-red-400)
- ♦ (diamond): 青 (text-blue-400)
- ♣ (club): 緑 (text-green-400)

### 使用済みカード
- 既に選択されたカードはグレーアウト・選択不可

---

## ベットサイズプリセット

### プリフロップ（BB単位）
```typescript
const PREFLOP_SIZE_PRESETS = [
  { label: '2bb', value: 2 },
  { label: '2.5bb', value: 2.5 },
  { label: '3bb', value: 3 },
  { label: '3.5bb', value: 3.5 },
  { label: '4bb', value: 4 },
  { label: 'All-in', value: -1 },  // -1 = all-in
];
```

### ポストフロップ（ポット比率）
```typescript
const POSTFLOP_SIZE_PRESETS = [
  { label: '1/4 pot', value: 0.25 },
  { label: '1/3 pot', value: 0.33 },
  { label: '1/2 pot', value: 0.5 },
  { label: '2/3 pot', value: 0.67 },
  { label: 'Pot', value: 1 },
];
// 実際のBB数 = Math.round(potSize * ratio)
```

---

## localStorage キー

```typescript
const STORAGE_KEYS = {
  PLAYERS: 'poker_players_v1',
  HANDS: 'poker_hands_v1',
  SETTINGS: 'poker_settings_v1',
};
```

---

## 共有テキスト出力形式

```
[NLH] 1/2 6-max
Hero: BTN K♠Q♠

Players:
UTG: Yamada (REG) note: 3bet多め
HJ: -
CO: -
BTN: (Hero)
SB: Sato (CALLING) note: フロップでコール多い
BB: Tanaka (NIT)

Board: A♦7♣2♠ - -

Actions:
PF: BTN raise 2.5bb / SB call / BB call
F: BTN bet 2bb / SB raise 6bb / BTN call

Result: SB win (showdown: no)
Spot memo: A72rでCB→raise時の対応を検討
```

---

## デプロイ

### GitHub Pages 自動デプロイ

1. リポジトリをGitHubにpush
2. Settings → Pages → Source: "GitHub Actions"
3. `.github/workflows/deploy.yml` で自動ビルド&デプロイ

### vite.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/handrecord/',  // リポジトリ名に合わせる
});
```

---

## ローカル開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (http://localhost:5173)
npm run dev

# ビルド
npm run build

# ビルドプレビュー
npm run preview
```

---

## 実装済み機能

- [x] ハンド一覧表示・フィルター
- [x] 新規ハンド作成
- [x] ゲーム設定（ブラインド、テーブル人数）
- [x] テーブル割り当て（ポジション→プレイヤー）
- [x] Heroハンド入力
- [x] ボード入力（5枚横一列表示）
- [x] アクション入力（プリフロップ・ポストフロップ）
- [x] 暗黙的フォールド処理
- [x] ポットサイズ計算
- [x] ポット比率→BB変換
- [x] 残りプレイヤー計算
- [x] 全ストリートアクション表示
- [x] スキップストリートのcheck表示
- [x] 結果入力（勝者、ショーダウン）
- [x] 相手ハンド入力（ショーダウン時）
- [x] スポットメモ
- [x] 共有テキストコピー
- [x] Undo/Redo
- [x] 自動保存
- [x] プレイヤー管理
- [x] 設定画面
- [x] GitHub Pages デプロイ設定

---

## ライセンス

MIT
