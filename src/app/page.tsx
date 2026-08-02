'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTetris } from '@/hooks/useTetris';
import { useMiniApp } from '@/hooks/useMiniApp';
import { useDuel } from '@/hooks/useDuel';
import { getSkin, SKINS } from '@/lib/skins';
import { GameBoard } from '@/components/GameBoard';
import { HUD } from '@/components/HUD';
import { HoldPanel, NextQueue } from '@/components/NextQueue';
import { TouchControls } from '@/components/TouchControls';
import { WalletStatus } from '@/components/WalletStatus';
import { PayToPlayModal } from '@/components/PayToPlayModal';
import { SkinPicker } from '@/components/SkinPicker';
import { Leaderboard, LeaderboardEntry } from '@/components/Leaderboard';
import { TipModal } from '@/components/TipModal';
import { DuelModal } from '@/components/DuelModal';
import { DuelsPanel } from '@/components/DuelsPanel';
import { shareApp, shareScore } from '@/lib/farcaster/sdk';

type Panel = 'game' | 'leaderboard' | 'duels';

export default function HomePage() {
  const { user, isReady } = useMiniApp();
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState('classic-neon');
  const [panel, setPanel] = useState<Panel>('game');
  const [tipTarget, setTipTarget] = useState<LeaderboardEntry | null>(null);
  const [duelTarget, setDuelTarget] = useState<LeaderboardEntry | null>(null);
  const [duelModalOpen, setDuelModalOpen] = useState(false);
  const [player, setPlayer] = useState<{ unlockedSkins: string[]; selectedSkin: string } | null>(null);
  const [stats, setStats] = useState({ bestScore: 0, totalLines: 0, duelWins: 0 });
  const { submitScore } = useDuel();
  const [pendingDuelId, setPendingDuelId] = useState<string | null>(null);
  // The stake tx (challengerTxHash or opponentTxHash) this player submitted
  // for pendingDuelId — required by the hardened /api/duel/score endpoint
  // as proof this submission comes from an actual participant.
  const [pendingDuelTxHash, setPendingDuelTxHash] = useState<string | null>(null);

  const skin = getSkin(selectedSkinId);

  const handleGameOver = useCallback(
    async (result: { score: number; lines: number; level: number }) => {
      if (!user || !activeTxHash) return;

      await fetch('/api/game/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: user.fid, ...result, txHash: activeTxHash }),
      });

      setStats((prev) => ({
        bestScore: Math.max(prev.bestScore, result.score),
        totalLines: prev.totalLines + result.lines,
        duelWins: prev.duelWins,
      }));

      if (pendingDuelId && pendingDuelTxHash) {
        await submitScore(pendingDuelId, user.fid, result.score, pendingDuelTxHash);
        setPendingDuelId(null);
        setPendingDuelTxHash(null);
      }

      setActiveTxHash(null);
    },
    [user, activeTxHash, pendingDuelId, pendingDuelTxHash, submitScore]
  );

  const { state, start, moveLeft, moveRight, softDrop, hardDrop, rotate, hold } = useTetris({
    onGameOver: handleGameOver,
  });

  useEffect(() => {
    if (!user?.fid) return;
    fetch(`/api/player/${user.fid}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.player) {
          setPlayer({ unlockedSkins: d.player.unlockedSkins, selectedSkin: d.player.selectedSkin });
          setSelectedSkinId(d.player.selectedSkin);
        }
      })
      .catch(() => {});
  }, [user?.fid]);

  // Someone tapped a shared duel-challenge cast (see shareDuelChallenge in
  // lib/farcaster/sdk.ts, which embeds `${appUrl}?duel=${duelId}`). Jump
  // straight to the Duels tab so they land on the Accept button.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const duelParam = new URLSearchParams(window.location.search).get('duel');
    if (duelParam) setPanel('duels');
  }, []);

  useEffect(() => {
    if (state.status === 'idle') return;
  }, [state.status]);

  const handlePlayClick = () => {
    if (pendingDuelId) {
      // Duel games are already paid for via the wager stake — skip the fee modal.
      start();
      return;
    }
    setPayModalOpen(true);
  };

  const handleUnlocked = (txHash: string) => {
    setActiveTxHash(txHash);
    setPayModalOpen(false);
    start();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-neon-cyan animate-flicker">NEON⚡TETRIS</h1>
          <p className="text-[11px] text-white/40">
            {isReady ? (user ? `@${user.username ?? user.fid}` : 'Guest mode') : 'Connecting…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shareApp()}
            title="Share NeonTetris as a cast"
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:border-neon-cyan/50 hover:text-neon-cyan"
          >
            Share App
          </button>
          <WalletStatus />
        </div>
      </header>

      <nav className="flex gap-2">
        {(['game', 'leaderboard', 'duels'] as Panel[]).map((p) => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`flex-1 rounded-md border py-2 text-xs font-display uppercase tracking-wide ${
              panel === p ? 'border-neon-cyan text-neon-cyan shadow-neon-sm' : 'border-white/10 text-white/50'
            }`}
          >
            {p}
          </button>
        ))}
      </nav>

      {panel === 'game' && (
        <section className="flex flex-col gap-3">
          <HUD state={state} skin={skin} />

          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <HoldPanel type={state.hold} skin={skin} />
            </div>
            <div className="flex-1">
              <GameBoard state={state} skin={skin} />
            </div>
            <div className="flex flex-col gap-2">
              <NextQueue queue={state.next} skin={skin} />
            </div>
          </div>

          <TouchControls
            onLeft={moveLeft}
            onRight={moveRight}
            onRotate={() => rotate(1)}
            onSoftDrop={softDrop}
            onHardDrop={hardDrop}
            onHold={hold}
          />

          <div className="flex gap-2">
            <button
              onClick={handlePlayClick}
              disabled={state.status === 'playing'}
              className="flex-1 rounded-md border border-neon-magenta bg-neon-magenta/10 py-3 font-display text-sm text-neon-magenta shadow-neon-sm disabled:opacity-40"
            >
              {state.status === 'playing' ? 'Playing…' : pendingDuelId ? 'Start Duel' : 'Play — 0.1 USDC'}
            </button>
            <button
              onClick={() => setSkinPickerOpen(true)}
              className="rounded-md border border-neon-purple/50 px-4 py-3 font-display text-sm text-neon-purple"
            >
              Skins
            </button>
            {state.status === 'gameover' && (
              <button
                onClick={() => shareScore(state.score, state.lines)}
                className="rounded-md border border-neon-cyan/50 px-4 py-3 font-display text-sm text-neon-cyan"
              >
                Share
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-white/30">
            Arrow keys to move/soft-drop · ↑/X rotate CW · Z rotate CCW · Space hard-drop · Shift/C hold · P pause
          </p>
        </section>
      )}

      {panel === 'leaderboard' && (
        <Leaderboard
          currentFid={user?.fid}
          onTip={(entry) => setTipTarget(entry)}
          onDuel={(entry) => {
            setDuelTarget(entry);
            setDuelModalOpen(true);
          }}
        />
      )}

      {panel === 'duels' && (
        <section className="flex flex-col gap-3">
          <button
            onClick={() => {
              setDuelTarget(null);
              setDuelModalOpen(true);
            }}
            className="rounded-md border border-neon-magenta bg-neon-magenta/10 py-2 text-sm font-display text-neon-magenta shadow-neon-sm"
          >
            + New Challenge
          </button>
          <DuelsPanel
            fid={user?.fid}
            onAccepted={(duel) => {
              setPendingDuelId(duel.id);
              setPendingDuelTxHash(duel.opponentTxHash ?? null);
              setPanel('game');
            }}
          />
        </section>
      )}

      <PayToPlayModal
        open={payModalOpen}
        user={user}
        onClose={() => setPayModalOpen(false)}
        onUnlocked={handleUnlocked}
      />

      <SkinPicker
        open={skinPickerOpen}
        onClose={() => setSkinPickerOpen(false)}
        fid={user?.fid}
        selectedSkinId={selectedSkinId}
        unlockedSkins={player?.unlockedSkins ?? ['classic-neon']}
        onSelected={(id) => {
          setSelectedSkinId(id);
          setPlayer((p) => ({
            selectedSkin: id,
            unlockedSkins: p?.unlockedSkins?.includes(id) ? p.unlockedSkins : [...(p?.unlockedSkins ?? ['classic-neon']), id],
          }));
        }}
      />

      <TipModal target={tipTarget} fromFid={user?.fid} onClose={() => setTipTarget(null)} />

      <DuelModal
        open={duelModalOpen}
        target={duelTarget}
        fromFid={user?.fid}
        onClose={() => {
          setDuelModalOpen(false);
          setDuelTarget(null);
        }}
        onCreated={(duel) => {
          setPendingDuelId(duel.id);
          setPendingDuelTxHash(duel.challengerTxHash ?? null);
          setDuelTarget(null);
          setDuelModalOpen(false);
          setPanel('game');
        }}
      />
    </main>
  );
}
