import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AntiBotGuard from './AntiBotGuard';
import JupiterFloatingButton from '@/components/jupiter-floating-button';
import WalletContextProvider from '@/components/wallet-context-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'jocc',
  description: 'P2E classic arcade games on Solana',
  generator: 'solnm',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-black text-white`}>
        <WalletContextProvider>
          <AntiBotGuard
            sessionMaxMinutes={60}
            cooldownSeconds={30}
            suspicionThreshold={70}
            challengeInterval={2}
            maxDailyRounds={50}
            strictMode={true}>
            {children}
          </AntiBotGuard>
          <JupiterFloatingButton />
        </WalletContextProvider>
      </body>
    </html>
  );
}
