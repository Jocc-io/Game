'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Loader2, Gem } from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import WalletContextProvider from '@/components/wallet-context-provider';
import TokenTransferHistory from '@/components/history';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import HpmeBackground from '@/Backgrounds/HpmeBackground';

interface TokenHolder {
  address: string;
  balance: number;
  rank: number;
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'leaderboard'>(
    'history'
  );

  return (
    <WalletContextProvider>
      <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
        <HpmeBackground />

        <Navbar />

        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full">
              <div className="flex justify-center ">
                <div className="flex bg-black/50 backdrop-blur-sm rounded-xl gap-4 mt-4">
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'history'
                        ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-white border border-purple-500/50 rounded-xl text-sm'
                        : 'text-gray-400 hover:text-white  bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl text-sm'
                    }`}>
                    Leaderboard
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-12 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'leaderboard'
                        ? 'bg-gradient-to-r from-purple-500/30 to-cyan-500/30 text-white border border-purple-500/50 rounded-xl text-sm'
                        : 'text-gray-400 hover:text-white bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl text-sm'
                    }`}>
                    History
                  </button>
                </div>
              </div>

              {activeTab === 'history' ? (
                <div className="w-full max-w-5xl mx-auto">
                  <LeaderboardContent />
                </div>
              ) : (
                <TokenTransferHistory />
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </WalletContextProvider>
  );
}

function LeaderboardContent() {
  const [tokenHolders, setTokenHolders] = useState<TokenHolder[]>([]);
  const [gameWallet, setGameWallet] = useState<TokenHolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const TOKEN_ADDRESS = 'JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc';
  const GAME_WALLET_ADDRESS = 'JoccJFtfPEDcga4sRM1c352GXpQ3gcV7RtPoYuLxbMr';

  const fetchTokenHolders = async () => {
    setLoading(true);
    setError(null);

    try {
      const connection = new Connection(
        'https://solana-rpc.publicnode.com',
        'confirmed'
      );
      const tokenMint = new PublicKey(TOKEN_ADDRESS);

      const largestAccounts =
        await connection.getTokenLargestAccounts(tokenMint);

      console.log(
        'Raw API response:',
        largestAccounts.value?.length,
        'accounts found'
      );
      console.log(
        'Account details:',
        largestAccounts.value?.map((acc) => ({
          address: acc.address.toString(),
          balance: acc.uiAmount,
        }))
      );

      if (!largestAccounts.value || largestAccounts.value.length === 0) {
        throw new Error('No token holders found');
      }

      const nonZeroAccounts = largestAccounts.value.filter(
        (account) => (account.uiAmount || 0) > 0
      );
      console.log('Non-zero accounts:', nonZeroAccounts.length);

      const holdersWithOwners = await Promise.all(
        nonZeroAccounts
          .slice(0, 15) // Take top 15 to account for filtering out game wallet
          .map(async (account, index) => {
            try {
              const accountInfo = await connection.getParsedAccountInfo(
                account.address
              );
              const parsedInfo = accountInfo.value?.data as any;
              const ownerAddress =
                parsedInfo?.parsed?.info?.owner || account.address.toString();

              return {
                address: ownerAddress,
                balance: account.uiAmount || 0,
                rank: index + 1,
              };
            } catch (err) {
              console.error(
                `Error fetching owner for ${account.address}:`,
                err
              );
              // Fallback to token account address if owner fetch fails
              return {
                address: account.address.toString(),
                balance: account.uiAmount || 0,
                rank: index + 1,
              };
            }
          })
      );

      const gameWalletHolder = holdersWithOwners.find(
        (holder) => holder.address === GAME_WALLET_ADDRESS
      );
      const regularHolders = holdersWithOwners
        .filter((holder) => holder.address !== GAME_WALLET_ADDRESS)
        .slice(0, 10) // Take top 10 after filtering out game wallet
        .map((holder, index) => ({ ...holder, rank: index + 1 })); // Re-rank after filtering

      console.log(' Game wallet found:', gameWalletHolder);
      console.log(' Regular holders:', regularHolders.length);

      setTokenHolders(regularHolders);
      setGameWallet(gameWalletHolder || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching token holders:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch token holders'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenHolders();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Trophy className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-cyan-500/10 to-yellow-300/50 border-yellow-500/20';
      case 2:
        return 'from-cyan-400/20 to-gray-300/50 border-gray-400/20';
      case 3:
        return 'from-cyan-600/20 to-orange-300/50 border-orange-600/20';
      default:
        return 'from-cyan-500/10 to-purple-500/10 border-cyan-500/20';
    }
  };

  const formatBalance = (balance: number) => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M`;
    } else if (balance >= 1000) {
      return `${(balance / 1000).toFixed(2)}K`;
    }
    return balance.toFixed(2);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex flex-col items-center justify-between h-full">
      <div className="w-full max-w-4xl">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-400 text-center">
              <p className="text-lg font-semibold ">Error loading data</p>
              <p className="text-sm text-gray-300">{error}</p>
              <button
                onClick={fetchTokenHolders}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors">
                Try Again
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 " />
            <p className="text-gray-300">Loading leaderboard data...</p>
          </div>
        ) : tokenHolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-300">No token holders found</p>
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {gameWallet && (
              <div className="mt-4 mb-4">
                <div className="bg-gradient-to-r from-cyan-900/50 to-purple-800/10 backdrop-blur-sm rounded-xl p-4 border border-gray-200/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Gem className="w-5 h-5 text-orange-400" />
                        <span className="text-sm font-bold text-orange-400">
                          Treasury
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-gray-300">
                          {truncateAddress(gameWallet.address)}
                        </p>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(gameWallet.address)
                          }
                          className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                          Click to copy
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex flex-row">
                      <p className="text-sm font-bold text-white">
                        {formatBalance(gameWallet.balance)}
                      </p>
                      <p className="text-sm font-bold text-cyan-400 ml-2">
                        JOCC
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tokenHolders.map((holder) => (
              <div
                key={holder.address}
                className={`bg-gradient-to-r ${getRankColor(holder.rank)} backdrop-blur-sm rounded-xl p-4 border transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/10`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(holder.rank)}
                      <span className="text-lg font-bold text-white">
                        #{holder.rank}
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-sm text-gray-300">
                        {truncateAddress(holder.address)}
                      </p>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(holder.address)
                        }
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                        Click to copy
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex flex-row">
                    <p className="text-sm font-bold text-white">
                      {formatBalance(holder.balance)}
                    </p>
                    <p className="text-sm font-bold text-cyan-400 ml-2 ">
                      JOCC
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
