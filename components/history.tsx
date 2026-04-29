'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, ExternalLink, Clock, AlertCircle } from 'lucide-react';

const RPC_ENDPOINTS = [
  'https://solana-rpc.publicnode.com',
  'https://solana-rpc.publicnode.com',
  'https://solana-rpc.publicnode.com',
];

let connectionIndex = 0;
const getConnection = () => {
  const endpoint = RPC_ENDPOINTS[connectionIndex % RPC_ENDPOINTS.length];
  return new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000, // Increased timeout
  });
};

const TOKEN_MINT = new PublicKey('JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc'); // JOCC Mint

interface TransactionHistory {
  sig: string;
  time: string;
  action: string;
  amount: number;
  source: 'user';
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async <T,>(
  fn: (connection: Connection) => Promise<T>,
  maxRetries = 3,
  baseDelay = 3000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const connection = getConnection();
      console.log(
        `Attempting request with endpoint: ${RPC_ENDPOINTS[connectionIndex % RPC_ENDPOINTS.length]}`
      );
      return await fn(connection);
    } catch (error: any) {
      console.log(`Request failed:`, error?.message || error);

      // If it's a 403 error or API key issue, immediately try next endpoint
      if (
        error?.message?.includes('403') ||
        error?.message?.includes('API key')
      ) {
        console.log(
          `API key/403 error detected, switching endpoint immediately`
        );
        connectionIndex++;
        if (i < maxRetries - 1) continue;
      }

      if (i < maxRetries - 1) {
        // Try next RPC endpoint
        connectionIndex++;
        const delayTime = baseDelay * Math.pow(2, i);
        console.log(
          `Switching to next RPC endpoint and retrying after ${delayTime}ms...`
        );
        await delay(delayTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};

export default function TokenTransferHistory() {
  const { publicKey, connected, connecting } = useWallet();
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletRejected, setWalletRejected] = useState(false);

  useEffect(() => {
    if (connecting) {
      setWalletRejected(false);
    }

    if (!connected || !publicKey) {
      setLoading(false);
      setHistory([]);
      setError(null);

      if (!connecting && !connected && !publicKey) {
        setTimeout(() => {
          if (!connected && !connecting) {
            setWalletRejected(true);
          }
        }, 1000);
      }
      return;
    }

    setWalletRejected(false);

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Starting to fetch user transaction history...`);

        const allTransactions: TransactionHistory[] = [];

        try {
          await delay(2000);
          console.log(
            `Fetching user transactions for wallet: ${publicKey.toString()}`
          );

          const userSignatures = await fetchWithRetry((connection) =>
            connection.getSignaturesForAddress(publicKey, { limit: 20 })
          );

          console.log(`Found ${userSignatures.length} user signatures`);

          for (let i = 0; i < Math.min(userSignatures.length, 10); i++) {
            const signature = userSignatures[i];

            if (i > 0) {
              await delay(1500);
            }

            try {
              const userTx = await fetchWithRetry((connection) =>
                connection.getParsedTransaction(signature.signature, {
                  maxSupportedTransactionVersion: 0,
                })
              );

              if (userTx && userTx.meta) {
                const sig = userTx.transaction.signatures[0];
                const time = userTx.blockTime
                  ? new Date(userTx.blockTime * 1000).toLocaleString()
                  : 'N/A';

                const preTokenBalance = userTx.meta.preTokenBalances?.find(
                  (b) =>
                    b.mint === TOKEN_MINT.toBase58() &&
                    b.owner === publicKey.toString()
                );
                const postTokenBalance = userTx.meta.postTokenBalances?.find(
                  (b) =>
                    b.mint === TOKEN_MINT.toBase58() &&
                    b.owner === publicKey.toString()
                );

                if (preTokenBalance && postTokenBalance) {
                  const preAmount = Number.parseFloat(
                    preTokenBalance.uiTokenAmount.uiAmountString || '0'
                  );
                  const postAmount = Number.parseFloat(
                    postTokenBalance.uiTokenAmount.uiAmountString || '0'
                  );
                  const receivedAmount = postAmount - preAmount;

                  if (receivedAmount > 0) {
                    allTransactions.push({
                      sig,
                      time,
                      action: 'Received JOCC Tokens',
                      amount: receivedAmount,
                      source: 'user',
                    });
                  }
                } else if (postTokenBalance && !preTokenBalance) {
                  const receivedAmount = Number.parseFloat(
                    postTokenBalance.uiTokenAmount.uiAmountString || '0'
                  );
                  if (receivedAmount > 0) {
                    allTransactions.push({
                      sig,
                      time,
                      action: 'Received JOCC Tokens',
                      amount: receivedAmount,
                      source: 'user',
                    });
                  }
                }
              }
            } catch (txError) {
              console.log(
                `Failed to fetch user transaction ${signature.signature}:`,
                txError
              );
            }
          }

          allTransactions.sort((a, b) => {
            const timeA = new Date(a.time).getTime() || 0;
            const timeB = new Date(b.time).getTime() || 0;
            return timeB - timeA;
          });

          console.log(
            `Successfully fetched ${allTransactions.length} transactions`
          );
          setHistory(allTransactions);
        } catch (userError) {
          console.error(`Error fetching user transactions:`, userError);
          setError(
            'Unable to fetch your transaction history. Please try again later.'
          );
        }
      } catch (e) {
        console.error(`Error fetching history:`, e);
        setError(
          'Failed to fetch transaction history. Please try refreshing the page.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [connected, publicKey, connecting]);

  return (
    <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-grow relative z-10 backdrop-blur rounded-3xl">
        <div className="max-w-4xl mx-auto">
          {(!connected || connecting) && (
            <div className="bg-black/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-500/30 max-w-md mx-auto text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cyan-600/30 flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-300" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">
                {connecting
                  ? 'Connecting...'
                  : walletRejected
                    ? 'Connection Required'
                    : 'Connect Your Wallet'}
              </h3>
              <p className="text-sm sm:text-base text-gray-300 mb-4 px-2">
                {connecting
                  ? 'Please approve the connection in your wallet'
                  : walletRejected
                    ? 'Wallet connection was declined. Please connect your wallet to view your JOCC token history.'
                    : 'Connect your wallet to view your JOCC token transfer history'}
              </p>
              {!connecting && (
                <WalletMultiButton className="!bg-gradient-to-r !from-cyan-500 !to-blue-600 !rounded-lg !py-2 sm:!py-3 !px-4 sm:!px-8 !text-sm sm:!text-lg !font-bold hover:!from-cyan-600 hover:!to-blue-700 !transition-all !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/40 !w-full sm:!w-auto" />
              )}
            </div>
          )}

          {connected && !connecting && (
            <div className="bg-black/50 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden mx-2 sm:mx-0">
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12 px-4">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-cyan-400"></div>
                  <span className="ml-3 text-sm sm:text-base text-gray-300">
                    Loading your transaction history...
                  </span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-red-400 px-4">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
                  <span className="text-center text-sm sm:text-base">
                    {error}
                  </span>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-sm">
                    Retry
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center py-8 sm:py-12 text-gray-400 px-4">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  <span className="text-sm sm:text-base text-center">
                    No JOCC token receipts found in your wallet.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {history.map((tx, i) => (
                    <div
                      key={i}
                      className="p-4 sm:p-6 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 flex-shrink-0">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-semibold text-green-400 text-sm sm:text-base">
                                {tx.action}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 self-start">
                                Your Wallet
                              </span>
                            </div>
                            <p className="text-base sm:text-lg font-bold text-white">
                              +{tx.amount.toLocaleString()} JOCC
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">
                              {tx.time}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`https://solscan.io/tx/${tx.sig}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-xs sm:text-sm flex-shrink-0">
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Explorer</span>
                        </a>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-700/30">
                        <p className="text-xs text-gray-500 font-mono break-all">
                          {tx.sig}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
