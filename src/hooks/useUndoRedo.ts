// ============================================
// Undo/Redo カスタムフック
// ============================================

import { useState, useCallback } from 'react';

interface UseUndoRedoOptions {
  maxHistory?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistory = 50 } = options;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prevHistory) => {
        const current = prevHistory[currentIndex];
        const nextState =
          typeof newState === 'function'
            ? (newState as (prev: T) => T)(current)
            : newState;

        // 現在位置より後の履歴を削除
        const newHistory = prevHistory.slice(0, currentIndex + 1);

        // 新しい状態を追加
        newHistory.push(nextState);

        // 最大履歴数を超えた場合、古いものを削除
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          return newHistory;
        }

        return newHistory;
      });

      setCurrentIndex((prev) => {
        const newIndex = prev + 1;
        return newIndex >= maxHistory ? maxHistory - 1 : newIndex;
      });
    },
    [currentIndex, maxHistory]
  );

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const clearHistory = useCallback(() => {
    setHistory([state]);
    setCurrentIndex(0);
  }, [state]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
