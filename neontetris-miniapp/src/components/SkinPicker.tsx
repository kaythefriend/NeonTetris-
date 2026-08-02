'use client';

import { isSkinUnlocked, SKINS } from '@/lib/skins';
import { useSkinPurchase } from '@/hooks/useSkinPurchase';

interface SkinPickerProps {
  open: boolean;
  onClose: () => void;
  fid?: number;
  selectedSkinId: string;
  unlockedSkins: string[];
  onSelected: (skinId: string) => void;
}

export function SkinPicker({ open, onClose, fid, selectedSkinId, unlockedSkins, onSelected }: SkinPickerProps) {
  const { purchaseSkin, status, error, priceUsdc } = useSkinPurchase();

  if (!open) return null;

  const handlePick = async (skinId: string, unlocked: boolean) => {
    if (!fid) return;
    if (unlocked) {
      // Already owned — just equip it, no payment needed.
      const res = await fetch('/api/skins/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, skinId }),
      });
      if (res.ok) onSelected(skinId);
      return;
    }
    const bought = await purchaseSkin(fid, skinId);
    if (bought) onSelected(skinId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl border border-neon-purple/40 bg-panel p-6 shadow-neon-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl text-neon-purple animate-flicker">Skins</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>
        <p className="mb-4 text-xs text-white/50">
          Classic Neon is free. Everything else is a one-time ${priceUsdc} USDC purchase, paid
          directly from your Farcaster wallet.
        </p>

        {status !== 'idle' && (
          <div className="mb-3 rounded-md border border-white/10 bg-black/40 p-2 text-xs text-white/60">
            {status === 'awaiting-signature' && `Confirm the $${priceUsdc} USDC payment in your wallet…`}
            {status === 'verifying' && 'Verifying payment…'}
            {status === 'unlocked' && 'Skin unlocked!'}
            {status === 'error' && <span className="text-neon-red">{error}</span>}
          </div>
        )}

        <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {SKINS.map((skin) => {
            const unlocked = isSkinUnlocked(skin, unlockedSkins);
            const selected = skin.id === selectedSkinId;
            return (
              <button
                key={skin.id}
                onClick={() => handlePick(skin.id, unlocked)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-white/5 ${
                  selected ? 'border-white shadow-neon-sm' : 'border-white/10'
                }`}
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
                      ${priceUsdc} USDC — tap to buy
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
