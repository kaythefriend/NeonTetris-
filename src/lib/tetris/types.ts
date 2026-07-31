export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Cell = PieceType | null;

export type Board = Cell[][];

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  shape: number[][];
  position: Position;
  rotationIndex: number;
}

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  board: Board;
  active: Piece | null;
  next: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  combo: number;
  lastClearWasTetris: boolean;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Scoring follows the modern Tetris Guideline (single/double/triple/tetris),
// scaled by level. Matches the values NeonTetris displays in its HUD.
export const LINE_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export const SOFT_DROP_SCORE = 1;
export const HARD_DROP_SCORE = 2;
