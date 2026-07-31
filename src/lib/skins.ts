import { PieceType } from './tetris/types';

export interface Skin {
  id: string;
  name: string;
  description: string;
  /** Unlock requirement shown in the Skins panel */
  unlock: 'default' | { score: number } | { lines: number } | { wins: number };
  boardGlow: string;
  background: string; // tailwind gradient classes
  pieceColors: Record<PieceType, string>;
}

export const SKINS: Skin[] = [
  {
    id: 'classic-neon',
    name: 'Classic Neon',
    description: 'The original NeonTetris palette. Cyan grid, magenta accents.',
    unlock: 'default',
    boardGlow: '#00f6ff',
    background: 'from-[#05020a] via-[#0b0715] to-[#120a24]',
    pieceColors: {
      I: '#00f6ff',
      O: '#f9f871',
      T: '#c04dff',
      S: '#39ff8f',
      Z: '#ff2b4a',
      J: '#2b6bff',
      L: '#ff7a1a',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave Sunset',
    description: 'Hot pink and orange grid lines over a deep purple horizon.',
    unlock: { lines: 50 },
    boardGlow: '#ff2bd6',
    background: 'from-[#170221] via-[#2b0a3d] to-[#4a0e5c]',
    pieceColors: {
      I: '#ff2bd6',
      O: '#ffd23f',
      T: '#b967ff',
      S: '#ff6ec7',
      Z: '#ff3860',
      J: '#5271ff',
      L: '#ff9f1c',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Green',
    description: 'Monochrome phosphor green, digital-rain board glow.',
    unlock: { lines: 150 },
    boardGlow: '#39ff8f',
    background: 'from-[#010a04] via-[#031607] to-[#03210c]',
    pieceColors: {
      I: '#00ff41',
      O: '#7bff9e',
      T: '#39ff8f',
      S: '#00c853',
      Z: '#66ff99',
      J: '#00e676',
      L: '#a3ffb8',
    },
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    description: 'Pastel cyan/pink grid with a soft gradient skyline.',
    unlock: { score: 25000 },
    boardGlow: '#8b2bff',
    background: 'from-[#1a1140] via-[#2d1b5e] to-[#3d2b7a]',
    pieceColors: {
      I: '#7afcff',
      O: '#feff9c',
      T: '#d29aff',
      S: '#ffb3fd',
      Z: '#ff8ba7',
      J: '#8bd8ff',
      L: '#ffcf9c',
    },
  },
  {
    id: 'cyber-red',
    name: 'Cyberpunk Red',
    description: 'High-alert red/amber palette. Unlocked via ranked duel wins.',
    unlock: { wins: 10 },
    boardGlow: '#ff2b4a',
    background: 'from-[#0a0000] via-[#1a0303] to-[#2a0505]',
    pieceColors: {
      I: '#ff2b4a',
      O: '#ffb703',
      T: '#ff5c8a',
      S: '#ff8c42',
      Z: '#d90429',
      J: '#ff477e',
      L: '#ffd60a',
    },
  },
];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isSkinUnlocked(
  skin: Skin,
  stats: { bestScore: number; totalLines: number; duelWins: number }
): boolean {
  if (skin.unlock === 'default') return true;
  if ('score' in skin.unlock) return stats.bestScore >= skin.unlock.score;
  if ('lines' in skin.unlock) return stats.totalLines >= skin.unlock.lines;
  if ('wins' in skin.unlock) return stats.duelWins >= skin.unlock.wins;
  return false;
}
