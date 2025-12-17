// ============================================
// localStorage ユーティリティ
// ============================================

import {
  Player,
  Hand,
  AppSettings,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
} from '../types';

// ============================================
// 汎用 localStorage 操作
// ============================================

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Failed to get item from localStorage: ${key}`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set item in localStorage: ${key}`, error);
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove item from localStorage: ${key}`, error);
  }
}

// ============================================
// Players
// ============================================

export function getPlayers(): Player[] {
  return getItem<Player[]>(STORAGE_KEYS.PLAYERS, []);
}

export function savePlayers(players: Player[]): void {
  setItem(STORAGE_KEYS.PLAYERS, players);
}

export function getPlayerById(id: string): Player | undefined {
  const players = getPlayers();
  return players.find((p) => p.id === id);
}

export function savePlayer(player: Player): void {
  const players = getPlayers();
  const index = players.findIndex((p) => p.id === player.id);
  if (index >= 0) {
    players[index] = player;
  } else {
    players.push(player);
  }
  savePlayers(players);
}

export function deletePlayer(id: string): void {
  const players = getPlayers();
  const filtered = players.filter((p) => p.id !== id);
  savePlayers(filtered);
}

export function getRecentPlayers(limit: number = 10): Player[] {
  const players = getPlayers();
  return [...players]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, limit);
}

export function searchPlayers(query: string): Player[] {
  const players = getPlayers();
  const lowerQuery = query.toLowerCase();
  return players.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function updatePlayerLastSeen(id: string): void {
  const player = getPlayerById(id);
  if (player) {
    player.lastSeenAt = Date.now();
    savePlayer(player);
  }
}

// ============================================
// Hands
// ============================================

export function getHands(): Hand[] {
  return getItem<Hand[]>(STORAGE_KEYS.HANDS, []);
}

export function saveHands(hands: Hand[]): void {
  setItem(STORAGE_KEYS.HANDS, hands);
}

export function getHandById(id: string): Hand | undefined {
  const hands = getHands();
  return hands.find((h) => h.id === id);
}

export function saveHand(hand: Hand): void {
  const hands = getHands();
  const index = hands.findIndex((h) => h.id === hand.id);
  hand.updatedAt = Date.now();
  if (index >= 0) {
    hands[index] = hand;
  } else {
    hands.push(hand);
  }
  saveHands(hands);
}

export function deleteHand(id: string): void {
  const hands = getHands();
  const filtered = hands.filter((h) => h.id !== id);
  saveHands(filtered);
}

export function getHandsByStatus(status: 'draft' | 'done'): Hand[] {
  const hands = getHands();
  return hands.filter((h) => h.status === status);
}

export function getHandsSorted(): Hand[] {
  const hands = getHands();
  return [...hands].sort((a, b) => b.updatedAt - a.updatedAt);
}

// ============================================
// Settings
// ============================================

export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// ============================================
// データ管理
// ============================================

export function clearAllData(): void {
  removeItem(STORAGE_KEYS.PLAYERS);
  removeItem(STORAGE_KEYS.HANDS);
  removeItem(STORAGE_KEYS.SETTINGS);
}

export function exportAllData(): string {
  const data = {
    players: getPlayers(),
    hands: getHands(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.players && Array.isArray(data.players)) {
      savePlayers(data.players);
    }
    if (data.hands && Array.isArray(data.hands)) {
      saveHands(data.hands);
    }
    if (data.settings) {
      saveSettings(data.settings);
    }
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}
