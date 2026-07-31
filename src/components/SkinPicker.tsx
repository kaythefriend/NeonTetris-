'use client';

import { isSkinUnlocked, SKINS } from '@/lib/skins';

interface SkinPickerProps {
  open: boolean;
  onClose: () => void;
  selectedSkinId: string;
  onSelect: (skinId: string) => void;
  stats: { bestScore: number; totalLines: number; duelWins: number };
}

function unlockLabel(skin: (typeof SKINS)[number]) {
  if (skin.unlock === 'default') return 'Unlocked from the start';
  if ('score' in skin.unlock) return `Unlock at ${skin.unlock.score.toLocaleString()} best score`;
  if ('lines' in skin.unlock) return `Unlock after ${skin.unlock.lines} total lines cleared`;
  if ('wins' in skin.unlock) return `Unlock after ${skin.unlock.wins} duel wins`;
  return '';
}

export function SkinPicker({ open, onClose, selectedSkinId, onSelect, stats }: SkinPickerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl border border-neon-purple/40 bg-panel p-6 shadow-neon-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-neon-purple animate-flicker">Skins</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {SKINS.map((skin) => {
            const unlocked = isSkinUnlocked(skin, stats);
            const selected = skin.id === selectedSkinId;
            return (
              <button
                key={skin.id}
                disabled={!unlocked}
                onClick={() => onSelect(skin.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  selected ? 'border-white shadow-neon-sm' : 'border-white/10'
                } ${unlocked ? 'hover:bg-white/5' : 'opacity-40 cursor-not-allowed'}`}
              >
                <div className="flex gap-1">
                  {Object.values(skin.pieceColors).slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="h-5 w-5 rounded-sm"
                      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="font-display text-sm" style={{ color: skin.boardGlow }}>
                    {skin.name}
                  </div>
                  <div className="text-xs text-white/50">{skin.description}</div>
                  {!unlocked && (
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-neon-yellow">
                      {unlockLabel(skin)}
                    </div>
                  )}
                </div>
                {selected && <span className="text-xs text-neon-green">Active</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
