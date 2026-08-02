import {
  Board,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GameState,
  HARD_DROP_SCORE,
  LINE_SCORES,
  Piece,
  PieceType,
  SOFT_DROP_SCORE,
} from './types';
import { LINES_PER_LEVEL, PIECE_ORDER, PIECE_SHAPES } from './constants';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array<Board[number][number]>(BOARD_WIDTH).fill(null)
  );
}

/** 7-bag randomizer: each bag contains one of every piece, shuffled. */
export function generateBag(): PieceType[] {
  const bag = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function spawnPiece(type: PieceType): Piece {
  const shape = PIECE_SHAPES[type][0];
  const width = shape[0].length;
  return {
    type,
    shape,
    rotationIndex: 0,
    position: { x: Math.floor((BOARD_WIDTH - width) / 2), y: -2 },
  };
}

export function getShapeCells(piece: Piece): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  piece.shape.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val) {
        cells.push({ x: piece.position.x + x, y: piece.position.y + y });
      }
    });
  });
  return cells;
}

export function isValidPosition(board: Board, piece: Piece): boolean {
  return getShapeCells(piece).every(({ x, y }) => {
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false;
    if (y < 0) return true; // above the visible board is fine
    return board[y][x] === null;
  });
}

export function movePiece(
  board: Board,
  piece: Piece,
  dx: number,
  dy: number
): Piece | null {
  const moved: Piece = {
    ...piece,
    position: { x: piece.position.x + dx, y: piece.position.y + dy },
  };
  return isValidPosition(board, moved) ? moved : null;
}

export function rotatePiece(board: Board, piece: Piece, dir: 1 | -1): Piece {
  const rotationIndex = (piece.rotationIndex + dir + 4) % 4;
  const shape = PIECE_SHAPES[piece.type][rotationIndex];
  const base: Piece = { ...piece, shape, rotationIndex };

  // Basic SRS-style wall kicks: try a small set of offsets before giving up.
  const kicks = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
  ];

  for (const kick of kicks) {
    const candidate: Piece = {
      ...base,
      position: { x: base.position.x + kick.x, y: base.position.y + kick.y },
    };
    if (isValidPosition(board, candidate)) return candidate;
  }
  return piece; // no valid rotation found; stay put
}

export function hardDropDistance(board: Board, piece: Piece): number {
  let distance = 0;
  let current = piece;
  while (true) {
    const next = movePiece(board, current, 0, 1);
    if (!next) break;
    current = next;
    distance += 1;
  }
  return distance;
}

export function mergePiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  getShapeCells(piece).forEach(({ x, y }) => {
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      next[y][x] = piece.type;
    }
  });
  return next;
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_HEIGHT - remaining.length;
  const newRows = Array.from({ length: cleared }, () =>
    Array<Board[number][number]>(BOARD_WIDTH).fill(null)
  );
  return { board: [...newRows, ...remaining], cleared };
}

export function scoreForClear(lines: number, level: number, combo: number): number {
  const base = LINE_SCORES[lines] ?? 0;
  const comboBonus = combo > 0 ? 50 * combo * level : 0;
  return base * level + comboBonus;
}

export function createInitialState(): GameState {
  const bag = generateBag();
  const nextBag = generateBag();
  return {
    board: createEmptyBoard(),
    active: null,
    next: [...bag, ...nextBag],
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    status: 'idle',
    combo: 0,
    lastClearWasTetris: false,
  };
}

export function levelForLines(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}

export { SOFT_DROP_SCORE, HARD_DROP_SCORE };
