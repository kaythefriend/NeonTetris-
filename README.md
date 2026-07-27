# NeonTetris — Pay-to-Play Tetris Farcaster Mini App

A neon-themed Tetris game built as a **Farcaster Mini App**. Every game costs
**0.1 USDC**, charged directly from the player's Farcaster (Base) wallet.
Includes unlockable skins, player-to-player tipping, wagered 1v1 duels, and a
live leaderboard.

> ### ⚠️ Important note on accuracy
> This repo was built from your written feature spec (pay-per-play in USDC,
> skins, tipping, duels, leaderboard) plus the official Farcaster Mini App /
> Base USDC integration patterns — **not** from a byte-for-byte inspection of
> the live `neontetris` app at `farcaster.xyz/miniapps/r8cVGUy0kUXQ/neontetris`.
> That app is a client-rendered SPA behind Farcaster's own frontend, so I
> could not open, screenshot, or read its compiled JS/CSS to pull exact hex
> codes, skin names, copy, or contract addresses. Everything visual below
> (palette, skin names, copy) is a faithful, original neon-Tetris design —
> treat it as a strong starting point to reskin/adjust once you can compare
> side-by-side with the real app, not a guaranteed pixel match.

---

## Features

- **Classic Tetris engine** — 7-bag randomizer, SRS-style rotation with wall
  kicks, hold piece, next-3 preview, soft/hard drop, line-clear scoring with
  combo bonus and level-based gravity speed-up.
- **Pay-to-play** — tapping **Play** prompts a 0.1 USDC transfer (native USDC
  on Base) from the user's Farcaster wallet to the app's treasury address.
  The server independently re-verifies the on-chain transfer before
  unlocking the session (see [`verifyTx.ts`](src/lib/wallet/verifyTx.ts)) —
  the client can't just claim it paid.
- **Skins** — 5 neon palettes (Classic Neon, Synthwave Sunset, Matrix Green,
  Vaporwave, Cyberpunk Red), unlocked by lifetime lines cleared, best score,
  or duel wins. Defined in [`src/lib/skins.ts`](src/lib/skins.ts).
- **Tipping** — send USDC directly to any player from the leaderboard, with
  an optional message.
- **Duels** — challenge another player, both sides stake a matching USDC
  wager into escrow (the treasury wallet), each plays one game, and the
  higher score wins the pot.
- **Leaderboard** — global high-score board with best score, lines cleared,
  duel record, and total tips received per player.
- **Farcaster-native** — uses `@farcaster/miniapp-sdk` for `ready()`,
  reading the signed-in user's context, and native cast composing to share
  scores; ships a `/.well-known/farcaster.json` manifest and Mini App embed
  meta tags for discovery.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **wagmi** + **viem**, using the official `@farcaster/miniapp-wagmi-connector`
  so the wallet is already connected inside a Farcaster client
- **Base mainnet**, native USDC (`0x8335…0913`)
- **lowdb** — a single JSON file (`data/db.json`) as the datastore, so the
  repo runs with zero external services out of the box

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_TREASURY_ADDRESS at minimum
npm run dev
```

Open `http://localhost:3000`. Outside a real Farcaster client the mini app
SDK calls (`sdk.context`, `sdk.actions.ready`) no-op gracefully so you can
still develop the UI in a normal browser tab — just note `useAccount()` won't
auto-connect a wallet outside Farcaster; use the "Connect Wallet" fallback
button, or test inside the Farcaster developer preview tool.

### Testing inside Farcaster

1. Deploy somewhere public (Vercel is easiest) and set `NEXT_PUBLIC_APP_URL`.
2. Sign your domain in the Farcaster developer portal to get
   `FARCASTER_HEADER` / `FARCASTER_PAYLOAD` / `FARCASTER_SIGNATURE`, and add
   them to your env — these populate `/.well-known/farcaster.json`.
3. Add the required images described in `public/README-ASSETS.md`.
4. Use the [Mini App embed tool](https://miniapps.farcaster.xyz/) to preview
   and validate your manifest before sharing the link.

## Environment variables

See [`.env.example`](.env.example) for the full list. The important ones:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_TREASURY_ADDRESS` | Wallet that receives pay-to-play fees and duel wager escrow |
| `NEXT_PUBLIC_GAME_FEE_USDC` | Cost per game (defaults to `0.1`) |
| `NEXT_PUBLIC_BASE_RPC_URL` | Base RPC endpoint used both client- and server-side to verify transfers |

## Architecture notes / extension points

- **Payment verification** (`src/lib/wallet/verifyTx.ts`) — every paid
  action (play, tip, duel stake) sends a transaction client-side, then hits
  a server API route that independently reads the transaction receipt from
  Base and confirms a matching `Transfer(from, to, value)` USDC event
  on-chain. Never trust a client-reported "I paid" without this check.
- **Storage** (`src/lib/db/db.ts`) — a single lowdb JSON file, chosen so the
  repo is runnable with zero setup. Every read/write in the app goes through
  this one module, so swapping in Postgres/Supabase/Redis for production is
  a matter of rewriting these functions, not hunting through the codebase.
  This will **not** work correctly on serverless platforms with multiple
  concurrent instances (e.g. Vercel) since each instance gets its own
  filesystem — swap to a real DB before a production deploy with real money.
- **Duel payouts** — this repo records duel results (winner, scores) but
  does **not** auto-execute an on-chain payout transaction from the
  treasury back to the winner, since that requires a server-held private
  key and real key-management decisions that are yours to make (a hot
  wallet, a smart contract escrow, or a manual/queued payout job). The
  `payoutTxHash` field in `DuelRecord` is left ready for whichever you pick.
- **Recipient wallet addresses for tips** — the tip flow assumes the
  recipient's `walletAddress` is available on their player record (it's
  populated from whoever pays to play first). If you want to tip someone
  who hasn't played yet, resolve their **verified Farcaster address**
  server-side via the Farcaster/Neynar API instead.
- **Anti-cheat** — client reports its own score to `/api/game/complete`
  and `/api/duel/score`. For a real-money app, add server-side game replay
  validation or at least sanity bounds (e.g. max realistic score/line rate)
  before trusting scores that move money.

## Project structure

```
src/
  app/
    page.tsx                # main UI: game, leaderboard, duels tabs
    layout.tsx               # Mini App embed meta tags
    api/
      game/start, complete   # pay-to-play verification + score recording
      tip                    # tip verification + ledger
      duel/create,accept,score,list
      leaderboard
      webhook                 # Farcaster notification webhook stub
    .well-known/farcaster.json
  components/                # GameBoard, HUD, modals, leaderboard, etc.
  hooks/                      # useTetris, usePayToPlay, useTip, useDuel, useMiniApp
  lib/
    tetris/                  # pure game engine (framework-agnostic)
    wallet/                  # wagmi config, USDC constants, on-chain verification
    db/                       # lowdb schema + accessors
    farcaster/                # miniapp-sdk wrapper
    skins.ts
data/db.json                 # local JSON datastore
```

## License

MIT — see [LICENSE](LICENSE).
