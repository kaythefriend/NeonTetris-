'use client';

import { PIECE_SHAPES } from '@/lib/tetris/constants';
import { PieceType } from '@/lib/tetris/types';
import { Skin } from '@/lib/skins';

function MiniPiece({ type, skin }: { type: PieceType; skin: Skin }) {
  const shape = PIECE_SHAPES[type][0];
  const color = skin.pieceColors[type];
  return (
    <div
      className="grid gap-[1px]"
      style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)` }}
    >
      {shape.flatMap((row, y) =>
        row.map((val, x) => (
          <div
            key={`${x}-${y}`}
            className="h-3 w-3"
            style={val ? { background: color, boxShadow: `0 0 4px ${color}` } : undefined}
          />
        ))
      )}
    </div>
  );
}

export function NextQueue({ queue, skin }: { queue: PieceType[]; skin: Skin }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-panel/60 p-2">
      <span className="text-[10px] uppercase tracking-widest text-white/40">Next</span>
      <div className="flex flex-col gap-2">
        {queue.slice(0, 3).map((type, i) => (
          <MiniPiece key={i} type={type} skin={skin} />
        ))}
      </div>
    </div>
  );
}

export function HoldPanel({ type, skin }: { type: PieceType | null; skin: Skin }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-panel/60 p-2">
      <span className="text-[10px] uppercase tracking-widest text-white/40">Hold</span>
      {type ? <MiniPiece type={type} skin={skin} /> : <div className="h-6 w-6 opacity-20" />}
    </div>
  );
}
