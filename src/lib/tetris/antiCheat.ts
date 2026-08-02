import { LINES_PER_LEVEL } from './constants';
import { LINE_SCORES } from './types';

/**
 * Nothing in this repo validates gameplay server-side — scores are
 * self-reported by the client. This module is NOT real anti-cheat; it's a
 * cheap tripwire that catches the lazy/common version of the exploit
 * (instantly submitting a huge fabricated score) without needing a full
 * server-authoritative game engine. A patient attacker who fabricates a
 * "plausible" score and waits the right amount of time before submitting
 * will not be caught by this. Treat this as a deterrent, not a guarantee —
 * see the README's "still open" section.
 *
 * Approach: simulate the theoretical BEST case a player could achieve in
 * `elapsedMs` — a perfect Tetris (4-line clear) every MIN_MS_PER_TETRIS,
 * leveling up every LINES_PER_LEVEL lines, with an escalating combo bonus
 * on every clear (using the exact formula in engine.ts's scoreForClear) —
 * and use that as the ceiling. MIN_MS_PER_TETRIS is deliberately far faster
 * than any known human or legitimate-bot sustained play, so this only ever
 * rejects scores that are impossible even in a maximally generous
 * best case, minimizing false positives against real players.
 */
const MIN_MS_PER_TETRIS = 1200;

/** No legitimate game can produce a non-zero score before a piece could plausibly be placed. */
export const MIN_MS_BEFORE_ANY_SCORE = 3000;

export function maxPlausibleScore(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const tetrises = Math.floor(elapsedMs / MIN_MS_PER_TETRIS);
  let totalLines = 0;
  let score = 0;
  for (let i = 1; i <= tetrises; i++) {
    totalLines += 4;
    const level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;
    const base = LINE_SCORES[4] * level;
    const comboBonus = 50 * i * level; // generous: treat every clear as an unbroken combo
    score += base + comboBonus;
  }
  return score;
}

export function isScorePlausible(score: number, elapsedMs: number): { ok: boolean; reason?: string } {
  if (elapsedMs < MIN_MS_BEFORE_ANY_SCORE && score > 0) {
    return { ok: false, reason: 'Score submitted implausibly soon after the game started' };
  }
  const ceiling = maxPlausibleScore(elapsedMs);
  if (score > ceiling) {
    return { ok: false, reason: 'Score exceeds the maximum plausible for the elapsed play time' };
  }
  return { ok: true };
}
