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

## Patch notes (this fix pass)

Fixes applied to get this deploying and to close the worst payment/security gaps:

- **Build fix:** `@farcaster/miniapp-sdk` bumped `^0.1.6` → `^0.2.3` to satisfy
  `@farcaster/miniapp-wagmi-connector@1.1.1`'s peer requirement — this was
  the actual cause of the `ERESOLVE`/`npm install` failure on Vercel. Added
  `.npmrc` with `legacy-peer-deps=true` as a safety net against future
  peer-conflict breaks.
- **Payment replay:** every route that verifies an on-chain tx
  (`/api/game/start`, `/api/tip`, `/api/duel/create`, `/api/duel/accept`)
  now atomically claims the `txHash` (`claimTxHash` in `src/lib/db/kv.ts`)
  so a single payment can't be resubmitted to unlock repeated games, tips,
  or duel entries.
- **Fabricated game results:** `/api/game/complete` now requires the
  one-time session created by `/api/game/start` for that `fid` + `txHash`
  and consumes it, so one payment backs exactly one result submission
  instead of unlimited ones. Note: the *score value itself* is still
  client-submitted and not independently verified — real anti-cheat would
  need a server-authoritative game loop, out of scope here.
- **Duel score spoofing:** `/api/duel/score` now requires the caller to
  supply the stake `txHash` matching that `fid`'s side of the duel, instead
  of trusting a bare `fid` in the request body. This is a partial
  mitigation, not real auth — see the comment in
  `src/app/api/duel/score/route.ts` for what it doesn't cover and why
  Farcaster Quick Auth is the real fix.
- **Storage on Vercel:** added an Upstash Redis-backed adapter
  (`src/lib/db/db.ts` + `src/lib/db/kv.ts`), used automatically when
  `KV_REST_API_URL` / `KV_REST_API_TOKEN` are set (Vercel's KV/Upstash
  integration injects these). Without them the app still falls back to the
  local JSON file, but that **will not persist reliably once deployed** —
  add the integration before handling real payments. See `.env.example`.
- **Opponent duel-play flow:** the opponent's "Accept" button in
  `DuelsPanel` previously never connected into the pending-duel/play state
  at all — there was no way to actually play the duel game after accepting.
  Wired `onAccepted` through to `page.tsx` so accepting now arms the same
  play → submit-score flow the challenger already had.
- **Security:** `next` bumped `14.2.15` → `^14.2.35`, patching the Dec 2025
  React Server Components vulnerabilities (CVE-2025-55182/55183/55184 —
  denial of service + potential source code exposure on App Router
  endpoints, which this app uses). No API changes needed for this app's
  code; Next.js flagged the old version directly in the Vercel build log.
- Added the missing `scripts/seed.ts` referenced by `npm run db:seed`.

**Still open, deliberately not patched here** (bigger scope, flagging so
they don't get lost): duel wager payouts never move on-chain after a duel
resolves (funds sit in the treasury address indefinitely), and there's no
real Farcaster identity verification (Quick Auth / SIWF) anywhere, so `fid`
values throughout the API are ultimately self-reported by the client.

## Patch notes (feature pass: duels, skins, sharing)

New functionality added on top of the fixes above:

- **Duel opponent search:** `/api/users/search` wraps Neynar's user-search
  API (`NEYNAR_API_KEY` required, server-only). `DuelModal` now has a real
  search box (previously the friend-search UI existed in the component but
  had no way to actually open — see below) that lets you find and challenge
  any Farcaster user, not just people already on the leaderboard.
- **Automatic duel payout:** on resolution, the full pot (both stakes, no
  house cut) is sent on-chain to the winner's verified stake wallet
  immediately — `src/lib/wallet/payout.ts` holds a dedicated hot wallet
  (`TREASURY_PRIVATE_KEY`) for this. **This is a real security tradeoff,
  not a minor detail:** that key can move funds with zero human approval.
  Use a wallet that holds *only* duel-payout float, fund it deliberately,
  and monitor its balance — see the comment at the top of `payout.ts`. If
  a payout fails (treasury underfunded, RPC hiccup), the duel still
  resolves with a winner on record and `payoutStatus: 'failed'`; call
  `payoutDuel(duelId)` again once fixed to retry.
- **Paid skins:** `$1 USDC` (`NEXT_PUBLIC_SKIN_PRICE_USDC`) per non-default
  skin via `/api/skins/purchase`, same on-chain verification + replay
  protection as every other payment route in this repo.
- **Sharing as casts:** `sdk.actions.composeCast()` wired up for three
  cases — sharing a score after game over, sharing the app itself (button
  in the header), and sharing a duel challenge (tags the opponent's
  `@username`, embeds a link that deep-links straight to the Duels tab so
  tapping it surfaces the Accept button).
- **Duel notifications:** `/api/webhook` now does **real signature
  verification** via `@farcaster/miniapp-node`'s `parseWebhookEvent` +
  `verifyAppKeyWithNeynar` (uses the same `NEYNAR_API_KEY`) before trusting
  any `miniapp_added` / `notifications_enabled` event — a prior version of
  this file stored notification tokens without verifying who sent them;
  that gap is now closed. When you create a duel, the opponent gets a push
  notification if they've saved the app and enabled notifications.
- **Fixed a real wiring bug found during this pass:** `page.tsx` was
  rendering `<DuelModal>` without its required `open` prop and
  `<SkinPicker>` with prop names (`onSelect`, `stats`) that didn't match
  the component's actual interface (`onSelected`, `fid`, `unlockedSkins`)
  — meaning the duel modal could never open at all and the skin picker
  would have failed to compile. Also added the "+ New Challenge" button
  that's the actual entry point to the friend-search flow (it existed in
  `DuelModal` but nothing on the page could reach it), and wired up the
  previously-unused `shareApp()` share button.

**Still open:** duel score values are still self-reported by the client
(see the earlier patch notes) — a fabricated high score would still
trigger a real automatic payout. Worth a server-authoritative anti-cheat
pass before this handles meaningful wager sizes.

## Patch notes (score-plausibility check)

- Added `src/lib/tetris/antiCheat.ts` — before a duel score (or a regular
  paid game's score) is accepted, it's checked against a generous
  time-based ceiling (derived from the actual scoring formula in
  `engine.ts`: a perfect Tetris clear every 1.2s, leveling up and combo'ing
  the whole way — already faster than any known legitimate play) and
  rejected if it's impossible even in that best case. Duels now record a
  `challengerStartedAt` / `opponentStartedAt` timestamp the moment each
  side's stake is verified, used as the elapsed-time anchor.
- **Be clear-eyed about what this is and isn't:** this is not real
  anti-cheat. It stops the lazy, common version of the exploit — instantly
  submitting a huge fabricated score — but does nothing against a patient
  attacker who fabricates a "plausible" score and waits the right amount of
  time before submitting. A genuine fix needs a server-authoritative game
  loop or a signed replay log, which is real scope beyond this patch.

## License

MIT — see [LICENSE](LICENSE).
