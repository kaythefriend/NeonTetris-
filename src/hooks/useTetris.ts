'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearLines,
  createInitialState,
  generateBag,
  hardDropDistance,
  isValidPosition,
  levelForLines,
  mergePiece,
  movePiece,
  rotatePiece,
  scoreForClear,
  spawnPiece,
} from '@/lib/tetris/engine';
import { GameState, HARD_DROP_SCORE, SOFT_DROP_SCORE } from '@/lib/tetris/types';
import { speedForLevel } from '@/lib/tetris/constants';

export interface UseTetrisOptions {
  onGameOver?: (result: { score: number; lines: number; level: number }) => void;
}

export function useTetris({ onGameOver }: UseTetrisOptions = {}) {
  const [state, setState] = useState<GameState>(createInitialState);
  const dropTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearTimer = () => {
    if (dropTimer.current) {
      clearInterval(dropTimer.current);
      dropTimer.current = null;
    }
  };

  const spawnNext = useCallback((prev: GameState): GameState => {
    let next = [...prev.next];
    if (next.length < 7) next = [...next, ...generateBag()];
    const [type, ...rest] = next;
    const piece = spawnPiece(type);

    if (!isValidPosition(prev.board, piece)) {
      return { ...prev, active: piece, next: rest, status: 'gameover' };
    }
    return { ...prev, active: piece, next: rest, canHold: true };
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      const fresh = createInitialState();
      return spawnNext({ ...fresh, status: 'playing' });
    });
  }, [spawnNext]);

  const lockPiece = useCallback(
    (prev: GameState): GameState => {
      if (!prev.active) return prev;
      const merged = mergePiece(prev.board, prev.active);
      const { board: clearedBoard, cleared } = clearLines(merged);

      const lines = prev.lines + cleared;
      const level = levelForLines(lines);
      const combo = cleared > 0 ? prev.combo + 1 : 0;
      const gained = cleared > 0 ? scoreForClear(cleared, prev.level, combo) : 0;

      const withScore: GameState = {
        ...prev,
        board: clearedBoard,
        score: prev.score + gained,
        lines,
        level,
        combo,
        lastClearWasTetris: cleared === 4,
        active: null,
      };

      if (withScore.status === 'gameover') return withScore;
      return spawnNext(withScore);
    },
    [spawnNext]
  );

  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      const moved = movePiece(prev.board, prev.active, 0, 1);
      if (moved) return { ...prev, active: moved };
      return lockPiece(prev);
    });
  }, [lockPiece]);

  useEffect(() => {
    clearTimer();
    if (state.status === 'playing') {
      dropTimer.current = setInterval(tick, speedForLevel(state.level));
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.level]);

  useEffect(() => {
    if (state.status === 'gameover') {
      onGameOver?.({ score: state.score, lines: state.lines, level: state.level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const moveLeft = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      const moved = movePiece(prev.board, prev.active, -1, 0);
      return moved ? { ...prev, active: moved } : prev;
    });
  }, []);

  const moveRight = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      const moved = movePiece(prev.board, prev.active, 1, 0);
      return moved ? { ...prev, active: moved } : prev;
    });
  }, []);

  const softDrop = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      const moved = movePiece(prev.board, prev.active, 0, 1);
      if (!moved) return lockPiece(prev);
      return { ...prev, active: moved, score: prev.score + SOFT_DROP_SCORE };
    });
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      const distance = hardDropDistance(prev.board, prev.active);
      const dropped = movePiece(prev.board, prev.active, 0, distance) ?? prev.active;
      const scored = { ...prev, active: dropped, score: prev.score + distance * HARD_DROP_SCORE };
      return lockPiece(scored);
    });
  }, [lockPiece]);

  const rotate = useCallback((dir: 1 | -1 = 1) => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active) return prev;
      return { ...prev, active: rotatePiece(prev.board, prev.active, dir) };
    });
  }, []);

  const hold = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || !prev.active || !prev.canHold) return prev;
      const currentType = prev.active.type;
      if (prev.hold) {
        const swapped = spawnPiece(prev.hold);
        return { ...prev, active: swapped, hold: currentType, canHold: false };
      }
      const withoutActive = { ...prev, hold: currentType, active: null, canHold: false };
      return spawnNext(withoutActive);
    });
  }, [spawnNext]);

  const pause = useCallback(() => {
    setState((prev) => (prev.status === 'playing' ? { ...prev, status: 'paused' } : prev));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => (prev.status === 'paused' ? { ...prev, status: 'playing' } : prev));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (stateRef.current.status !== 'playing') return;
      switch (e.key) {
        case 'ArrowLeft':
          moveLeft();
          break;
        case 'ArrowRight':
          moveRight();
          break;
        case 'ArrowDown':
          softDrop();
          break;
        case 'ArrowUp':
        case 'x':
          rotate(1);
          break;
        case 'z':
          rotate(-1);
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'Shift':
          hold();
          break;
        case 'p':
          pause();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveLeft, moveRight, softDrop, rotate, hardDrop, hold, pause]);

  return {
    state,
    start,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotate,
    hold,
    pause,
    resume,
  };
}
