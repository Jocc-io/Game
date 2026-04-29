'use client';
import { useState, useEffect, useRef } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Sparkles, Wallet, AlertCircle, ExternalLink } from 'lucide-react';
import WalletContextProvider from '@/components/wallet-context-provider';
import TokenDisplay from '@/components/token-display';
import Footer from '@/components/footer';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import Navbar from '@/components/navbar';
import { useAntiBotIntegration } from '@/hooks/use-antibot-integration';
import ProtectionStatus from '@/components/protection-status';
import AsteroidsGame from '@/components/asteroids-game';
import AsteroidsBackground from '@/Backgrounds/AsteroidsBackground';
import { useNFTGate } from '@/hooks/use-nft-gate';

export default function AsteroidsPage() {
  return (
    <WalletContextProvider>
      <div className="min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
        <AsteroidsBackground />
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full">
              <GameContent />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </WalletContextProvider>
  );
}

function GameContent() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { checkEligibility, completeGameRound, getProtectionStatus } =
    useAntiBotIntegration();
  const {
    hasNFT,
    isChecking: isCheckingNFT,
    error: nftError,
    checkNFTAccess,
  } = useNFTGate({
    collectionMint: '4RHERyDGjRL59EWu4MhZy2g6E89GtC2ofS19TY8hhodR',
  });

  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [wasConnected, setWasConnected] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [showTokenAnimation, setShowTokenAnimation] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [selectedSoundPack, setSelectedSoundPack] = useState('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [protectionError, setProtectionError] = useState('');
  // Initialize sound effects
  const { playSound, toggleMute, isMuted, setMuted } = useSoundEffects(
    'default',
    true
  );
  // Load tokens from localStorage if available
  useEffect(() => {
    if (connected && typeof window !== 'undefined') {
      const savedTokens = localStorage.getItem('solanaArcadeTokens');
      if (savedTokens) {
        setTokens(Number.parseInt(savedTokens, 10));
      }
    }
  }, [connected]);
  // Save tokens to localStorage when they change
  useEffect(() => {
    if (connected && typeof window !== 'undefined') {
      localStorage.setItem('solanaArcadeTokens', tokens.toString());
    }
  }, [tokens, connected]);
  // Track wallet connection status
  useEffect(() => {
    if (connected) {
      setWasConnected(true);
    } else if (wasConnected) {
      // Wallet was connected but now disconnected
      if (gameActive) {
        setGameActive(false);
        setConnectionError(
          'Wallet disconnected. Please reconnect to continue playing.'
        );
        setTimeout(() => setConnectionError(''), 5000);
      }
    }
  }, [connected, wasConnected, gameActive]);
  // Add a ref to track if this effect has already run for the current game over state
  const hasRun = useRef(false);

  // Convert score to tokens when game ends
  useEffect(() => {
    if (gameOver && score > 0 && connected) {
      // Prevent re-execution if already run for this game over state
      if (!hasRun.current) {
        hasRun.current = true;
        // Convert score to tokens (1000 points = 1 token)
        const newTokens = Math.floor(score / 500);
        setEarnedTokens(newTokens);
        if (newTokens > 0) {
          // Play sound effect
          playSound('levelup');
          // Show token animation
          setShowTokenAnimation(true);
          // Add tokens after animation completes
          setTimeout(() => {
            setTokens((prevTokens) => prevTokens + newTokens);
          }, 500);
        }
      }
    } else {
      // Reset the flag when game is not over
      hasRun.current = false;
    }
  }, [gameOver, score, connected, playSound]);
  const startGame = async () => {
    if (!connected) {
      setConnectionError('Please connect your wallet to play');
      setTimeout(() => setConnectionError(''), 3000);
      return;
    }

    if (hasNFT === null || isCheckingNFT) {
      setProtectionError('Checking NFT access...');
      setTimeout(() => setProtectionError(''), 3000);
      return;
    }

    if (hasNFT === false) {
      setProtectionError(
        'You need to own an NFT from the required collection to play'
      );
      setTimeout(() => setProtectionError(''), 5000);
      return;
    }

    // Check bot protection before starting game
    const canStart = await checkEligibility('start_game');
    if (!canStart) {
      const status = getProtectionStatus();
      if (status.cooldownRemaining > 0) {
        setProtectionError(
          `Please wait ${status.cooldownRemaining} seconds before playing again`
        );
      } else if (status.dailyRoundsRemaining <= 0) {
        setProtectionError('Daily play limit reached. Try again tomorrow.');
      } else if (!status.eligible) {
        setProtectionError('Please complete verification to continue playing');
      } else {
        setProtectionError('Unable to start game. Please try again.');
      }
      setTimeout(() => setProtectionError(''), 5000);
      return;
    }

    try {
      // Call server to verify everything
      const r = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey?.toString() }),
      });
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(errorText);
      }

      // Start game if server approves
      setConnectionError('');
      setProtectionError('');
      setGameActive(true);
      setGameOver(false);
      playSound('move');
    } catch (err) {
      setProtectionError('Access denied - NFT required or verification needed');
      setTimeout(() => setProtectionError(''), 5000);
    }
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setGameOver(true);
    setGameActive(false);
    // Mark round completion for bot protection
    completeGameRound(finalScore);
    playSound('gameover');
  };
  const withdrawTokens = async () => {
    if (!publicKey) {
      setWithdrawStatus('Please connect your wallet to withdraw tokens');
      setTimeout(() => setWithdrawStatus(''), 3000);
      return;
    }
    // Check bot protection before withdrawal
    const canWithdraw = await checkEligibility('withdraw');
    if (!canWithdraw) {
      setWithdrawStatus('Verification required for withdrawal');
      setTimeout(() => setWithdrawStatus(''), 3000);
      return;
    }
    if (tokens < 1) {
      setWithdrawStatus('insufficient');
      return;
    }
    try {
      setWithdrawStatus('Processing');

      const { createWithdrawalService } =
        await import('@/lib/token-withdrawal');
      const withdrawalService = createWithdrawalService('mainnet-beta');

      const result = await withdrawalService.processWithdrawal(
        publicKey,
        tokens,
        tokens,
        sendTransaction
      );
      if (result.success) {
        setTokens(result.newTokenBalance || 0);
        const explorerUrl = `https://solscan.io/tx/${result.signature}`;
        setWithdrawStatus(
          JSON.stringify({
            status: 'success',
            url: explorerUrl,
          })
        );
        // ⏳ reload page after 1 second (1000ms)
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setWithdrawStatus('failed');
      }
      setTimeout(() => setWithdrawStatus(''), 6000);
    } catch (error) {
      console.error('Error withdrawing tokens:', error);
      setWithdrawStatus('failed');
      setTimeout(() => setWithdrawStatus(''), 6000);
    }
  };
  // Render wallet disconnection overlay if game is active but wallet disconnected
  const renderWalletDisconnectedOverlay = () => {
    if (gameActive && !connected) {
      return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
          <div className="w-20 h-20 rounded-full bg-red-600/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-300" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">
            Wallet Disconnected
          </h2>
          <p className="text-center text-gray-300 max-w-xs mb-6">
            Your wallet has been disconnected. Please reconnect to continue
            playing.
          </p>
          <WalletMultiButton />
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    console.log('NFT Gate State:', {
      hasNFT,
      isCheckingNFT,
      nftError,
      connected,
    });
  }, [hasNFT, isCheckingNFT, nftError, connected]);

  return (
    <div className="flex flex-col items-center">
      {connected && (
        <div className=" flex items-center justify-center gap-4 backdrop-blur-sm px-6 py-3 rounded-xl w-full max-w-md">
          <TokenDisplay tokens={tokens} />
          <div className="flex gap-2">
            {!gameActive && !gameOver && (
              <button
                onClick={withdrawTokens}
                className={`px-6 py-2 rounded-xl ml-8 text-sm transition-all ${
                  tokens >= 1
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    : 'bg-gray-700 cursor-not-allowed'
                }`}>
                Withdraw
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className={`bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-green-500/30 shadow-lg shadow-green-500/10 w-full ${gameActive ? 'max-w-5xl' : 'max-w-md'} relative`}>
        {renderWalletDisconnectedOverlay()}
        {!gameActive && !gameOver && (
          <div className="flex flex-col items-center gap-6">
            {!connected ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 rounded-full bg-green-600/30 flex items-center justify-center mb-2">
                  <Wallet className="w-10 h-10 text-green-300" />
                </div>
                <h2 className="text-2xl font-bold text-center">
                  Connect Your Wallet
                </h2>
                <p className="text-center text-gray-300 max-w-xs">
                  Connect your Solana wallet to play Snake and earn tokens that
                  can be exchanged for rewards.
                </p>
                <WalletMultiButton />
                {connectionError && (
                  <div className="flex items-center gap-2 text-red-400 mt-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20 w-full justify-center">
                    <AlertCircle className="w-4 h-4" />
                    <span>{connectionError}</span>
                  </div>
                )}
                {protectionError && (
                  <div className="flex items-center gap-2 text-orange-400 mt-2 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 w-full justify-center">
                    <AlertCircle className="w-4 h-4" />
                    <span>{protectionError}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center mb-2">
                  <img
                    src="/images/asteroids.jpg"
                    alt=""
                    className="w-20 h-20 rounded-full"
                  />
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-400">
                  Asteroids
                </h2>
                <p className="text-center text-green-300 text-xs">
                  {' '}
                  Points Rate: 500 points = 1 JOCC token
                </p>

                {isCheckingNFT && (
                  <div className="flex items-center gap-2 text-yellow-400 p-3 rounded-xl text-xs w-full justify-center">
                    <AlertCircle className="w-4 h-4" />
                    <span>Checking NFT access...</span>
                  </div>
                )}

                {hasNFT === false && (
                  <div
                    className="flex flex-col items-center gap-3 text-red-400 bg-red-500/20 p-4 text-sm font-medium rounded-xl 
                  border border-red-500/20 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs">You don't have JOCC Key</span>
                    </div>
                    <a
                      href="https://jocc.io/c/4RHERyDGjRL59EWu4MhZy2g6E89GtC2ofS19TY8hhodR"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-8 text-gray-300 text-xs py-1 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl border border-cyan-500/30 transition-colors">
                      Get Key
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                    <button
                      onClick={checkNFTAccess}
                      className="px-11 py-1 bg-green-500/20 text-gray-300 hover:bg-green-500/30 rounded-xl text-xs border border-green-500/30 transition-colors">
                      Recheck
                    </button>
                  </div>
                )}

                {hasNFT === true && (
                  <div className="flex items-center gap-2 text-xs text-green-400 p-3 rounded-xl w-full justify-center">
                    <AlertCircle className="w-4 h-4" />
                    <span>NFT Access Verified</span>
                  </div>
                )}

                <ProtectionStatus className="mb-4" />
                <button
                  onClick={startGame}
                  disabled={hasNFT !== true || isCheckingNFT}
                  className={`px-8 py-3 rounded-xl text-xl font-bold transition-all shadow-lg w-full ${
                    hasNFT === true && !isCheckingNFT
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/20 hover:shadow-green-500/40'
                      : 'bg-gray-700 cursor-not-allowed opacity-50'
                  }`}>
                  {isCheckingNFT
                    ? 'Checking...'
                    : hasNFT === false
                      ? 'NFT Required'
                      : 'Start Game'}
                </button>
              </>
            )}
          </div>
        )}
        {gameActive && connected && (
          <AsteroidsGame
            onGameOver={handleGameOver}
            soundEffects={(type: string) => playSound(type as any)}
          />
        )}
        {gameOver && (
          <div className="flex flex-col items-center gap-4 py-6">
            {!connected ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 rounded-full bg-green-600/30 flex items-center justify-center mb-2">
                  <Wallet className="w-10 h-10 text-green-300" />
                </div>
                <h2 className="text-2xl font-bold text-center">
                  Connect Your Wallet
                </h2>
                <p className="text-center text-gray-300 max-w-xs">
                  Connect your Solana wallet to save your score and earn tokens
                  that can be exchanged for rewards.
                </p>
                <WalletMultiButton />
              </div>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-2">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-center mb-2">
                  Game Over!
                </h2>
                <p className="text-xl text-center">
                  You earned{' '}
                  <span className="text-green-400 font-bold">
                    {Math.floor(score / 500)}
                  </span>{' '}
                  JOCC
                </p>
                <div className="flex gap-4 mt-4 w-full">
                  <button
                    onClick={startGame}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all">
                    Play Again
                  </button>
                  <button
                    onClick={withdrawTokens}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      tokens >= 1
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                        : 'bg-gray-700 cursor-not-allowed'
                    }`}>
                    Withdraw
                  </button>
                </div>
                {withdrawStatus && (
                  <div
                    className={`mt-4 p-3 rounded-xl w-full flex items-center justify-center gap-3 text-center ${
                      withdrawStatus.includes('success')
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : withdrawStatus.includes('Processing')
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(withdrawStatus);
                        if (parsed.status === 'success') {
                          return (
                            <>
                              <span className="flex items-center gap-2">
                                ✅ Transaction Successful
                              </span>
                              <a
                                href={parsed.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 underline hover:text-green-400">
                                View <ExternalLink className="w-4 h-4" />
                              </a>
                            </>
                          );
                        }
                      } catch {
                        if (withdrawStatus.includes('Processing')) {
                          return 'Processing withdrawal...';
                        } else if (withdrawStatus.includes('insufficient')) {
                          return 'Minimum withdrawal is 1 JOCC';
                        } else if (withdrawStatus.includes('rejected')) {
                          return '❌ User rejected the transaction.';
                        } else {
                          return 'User rejected the transaction.';
                        }
                      }
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
