import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://neontetris.example.com';

const miniAppEmbed = {
  version: '1',
  imageUrl: `${appUrl}/embed-image.png`,
  button: {
    title: '🕹️ Play NeonTetris',
    action: {
      type: 'launch_frame',
      name: 'NeonTetris',
      url: appUrl,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: '#05020a',
    },
  },
};

export const metadata: Metadata = {
  title: 'NeonTetris — Pay-to-Play Tetris on Farcaster',
  description:
    'A neon-soaked, pay-to-play Tetris Mini App on Farcaster. 0.1 USDC per game, skins, tipping, duels, and a live leaderboard.',
  other: {
    'fc:frame': JSON.stringify(miniAppEmbed),
    'fc:miniapp': JSON.stringify(miniAppEmbed),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
