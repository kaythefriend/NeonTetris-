'use client';

import { GameState } from '@/lib/tetris/types';
import { Skin } from '@/lib/skins';

export function HUD({ state, skin }: { state: GameState; skin: Skin }) {
  const stat = (label: string, value: string | number) => (
    <div className="flex flex-col rounded-md border border-white/10 bg-panel/60 px-3 py-2">
      <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <span className="font-display text-lg" style={{ color: skin.boardGlow }}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stat('Score', state.score.toLocaleString())}
      {stat('Lines', state.lines)}
      {stat('Level', state.level)}
      {stat('Combo', state.combo)}
    </div>
  );
}
