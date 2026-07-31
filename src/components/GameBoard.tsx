'use client';

import { getShapeCells } from '@/lib/tetris/engine';
import { BOARD_HEIGHT, BOARD_WIDTH, GameState } from '@/lib/tetris/types';
import { Skin } from '@/lib/skins';

interface GameBoardProps {
  state: GameState;
  skin: Skin;
}

export function GameBoard({ state, skin }: GameBoardProps) {
  const activeCells = state.active ? getShapeCells(state.active) : [];
  const activeSet = new Set(activeCells.map((c) => `${c.x},${c.y}`));

  return (
    <div
      className="relative grid rounded-lg border-2 p-1"
      style={{
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0,1fr))`,
        borderColor: skin.boardGlow,
        boxShadow: `0 0 12px ${skin.boardGlow}55, inset 0 0 24px ${skin.boardGlow}22`,
        background: 'rgba(5,2,10,0.85)',
      }}
    >
      {state.board.map((row, y) =>
        row.map((cell, x) => {
          const isActive = activeSet.has(`${x},${y}`);
          const type = isActive ? state.active?.type : cell;
          const color = type ? skin.pieceColors[type] : undefined;
          return (
            <div
              key={`${x}-${y}`}
              className="aspect-square border border-white/[0.03]"
              style={
                color
                  ? {
                      background: `linear-gradient(160deg, ${color}dd, ${color}55)`,
                      boxShadow: `0 0 6px ${color}aa, inset 0 0 4px #ffffff55`,
                    }
                  : undefined
              }
            />
          );
        })
      )}

      {state.status === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <span className="font-display text-2xl text-neon-cyan animate-flicker">PAUSED</span>
        </div>
      )}

      {state.status === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-sm">
          <span className="font-display text-2xl text-neon-red animate-flicker">GAME OVER</span>
          <span className="font-display text-sm text-white/70">Score {state.score.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

export { BOARD_HEIGHT };
