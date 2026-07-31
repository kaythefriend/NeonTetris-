export interface PlayerRecord {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  walletAddress?: string;
  bestScore: number;
  totalLines: number;
  gamesPlayed: number;
  duelWins: number;
  duelLosses: number;
  totalTipsReceivedUsdc: number;
  totalTipsSentUsdc: number;
  unlockedSkins: string[];
  selectedSkin: string;
  updatedAt: string;
}

export interface GameRecord {
  id: string;
  fid: number;
  score: number;
  lines: number;
  level: number;
  txHash: string; // the 0.1 USDC payment tx that unlocked this game
  playedAt: string;
}

export interface TipRecord {
  id: string;
  fromFid: number;
  toFid: number;
  amountUsdc: number;
  txHash: string;
  message?: string;
  createdAt: string;
}

export type DuelStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface DuelRecord {
  id: string;
  challengerFid: number;
  opponentFid: number;
  wagerUsdc: number;
  challengerTxHash?: string;
  opponentTxHash?: string;
  challengerScore?: number;
  opponentScore?: number;
  status: DuelStatus;
  winnerFid?: number;
  payoutTxHash?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * A "receipt" for a paid game. Created by /api/game/start once a 0.1 USDC
 * payment tx has been verified on-chain, and consumed exactly once by
 * /api/game/complete. This is what stops a single payment from being used
 * to submit unlimited game results.
 */
export interface GameSession {
  txHash: string;
  fid: number;
  consumed: boolean;
  createdAt: string;
}

export interface DbSchema {
  players: PlayerRecord[];
  games: GameRecord[];
  tips: TipRecord[];
  duels: DuelRecord[];
  sessions: GameSession[];
}

export const DEFAULT_DB: DbSchema = {
  players: [],
  games: [],
  tips: [],
  duels: [],
  sessions: [],
};
