'use client';

import { type ReactNode, useMemo, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  SolongWalletAdapter,
  AvanaWalletAdapter,
  BitpieWalletAdapter,
  CoinhubWalletAdapter,
  HuobiWalletAdapter,
  FractalWalletAdapter,
  HyperPayWalletAdapter,
  AlphaWalletAdapter,
  KeystoneWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  KrystalWalletAdapter,
  NekoWalletAdapter,
  NufiWalletAdapter,
  OntoWalletAdapter,
  SaifuWalletAdapter,
  SalmonWalletAdapter,
  SkyWalletAdapter,
  SpotWalletAdapter,
  TokenaryWalletAdapter,
  TokenPocketWalletAdapter,
  TrezorWalletAdapter,
  ParticleAdapter,
  CloverWalletAdapter,
  SafePalWalletAdapter,
  NightlyWalletAdapter,
  XDEFIWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { setSignInProgress } from '@/lib/auth';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export default function WalletContextProvider({
  children,
}: WalletContextProviderProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading
  const wallets = useMemo(
    () => [
      // Popular wallets
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new AlphaWalletAdapter(),
      new SolongWalletAdapter(),
      new TorusWalletAdapter(),
      new Coin98WalletAdapter(),
      new CloverWalletAdapter(),
      new SafePalWalletAdapter(),
      new NightlyWalletAdapter(),
      new TrustWalletAdapter(),
      new AvanaWalletAdapter(),
      new XDEFIWalletAdapter(),
      new BitpieWalletAdapter(),
      new CoinhubWalletAdapter(),
      new HuobiWalletAdapter(),
      new FractalWalletAdapter(),
      new HyperPayWalletAdapter(),
      new KeystoneWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter(),
      new KrystalWalletAdapter(),
      new NekoWalletAdapter(),
      new NufiWalletAdapter(),
      new OntoWalletAdapter(),
      new SaifuWalletAdapter(),
      new SalmonWalletAdapter(),
      new SkyWalletAdapter(),
      new SpotWalletAdapter(),
      new TokenaryWalletAdapter(),
      new TokenPocketWalletAdapter(),
      new TrezorWalletAdapter(),
      new ParticleAdapter(),
    ],
    [network]
  );
  // Reset sign-in progress flag when component unmounts
  useEffect(() => {
    return () => {
      setSignInProgress(false);
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
