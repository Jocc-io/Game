import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';

export const GAME_TOKEN_MINT = new PublicKey(
  'JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc'
);

export const GAME_TREASURY = new PublicKey(
  'JoccJFtfPEDcga4sRM1c352GXpQ3gcV7RtPoYuLxbMr'
);

export class SolanaTokenProgram {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Process withdrawal with proper transaction signing flow
   */
  async processWithdrawal(
    userWallet: PublicKey,
    tokenAmount: number,
    gameTokens: number,
    sendTransaction: any // Added sendTransaction parameter for wallet signing
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    newGameTokenBalance?: number;
  }> {
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: userWallet.toString(),
          gameTokens,
          withdrawalAmount: tokenAmount,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'API request failed',
        };
      }

      const serializedTransaction = bs58.decode(result.transaction);
      const transaction = Transaction.from(serializedTransaction);

      console.log('Sending transaction to wallet for signing...');

      const signature = await sendTransaction(transaction, this.connection);

      console.log('Transaction signed and submitted:', signature);

      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log('Transaction confirmed:', signature);

      return {
        success: true,
        signature,
        newGameTokenBalance: result.newGameTokenBalance,
      };
    } catch (error) {
      console.error('Withdrawal error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getUserTokenBalance(
    userWallet: PublicKey,
    tokenMint: PublicKey = GAME_TOKEN_MINT
  ): Promise<number> {
    try {
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        userWallet
      );
      const accountInfo = await getAccount(this.connection, userTokenAccount);
      return Number(accountInfo.amount) / Math.pow(10, 9);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  async verifyWithdrawalEligibility(
    userWallet: PublicKey,
    requestedAmount: number,
    gameTokens: number,
    tokenMint: PublicKey = GAME_TOKEN_MINT
  ): Promise<{ eligible: boolean; reason?: string }> {
    if (gameTokens < requestedAmount) {
      return {
        eligible: false,
        reason: `Insufficient game tokens. You have ${gameTokens}, need ${requestedAmount}`,
      };
    }
    if (requestedAmount < 1) {
      return { eligible: false, reason: 'Minimum withdrawal is 1 token' };
    }
    return { eligible: true };
  }
}

// Helper
export function createSolanaTokenProgram(
  network: 'devnet' | 'testnet' | 'mainnet-beta' = 'mainnet-beta'
): SolanaTokenProgram {
  const endpoint =
    network === 'mainnet-beta'
      ? 'https://solana-rpc.publicnode.com'
      : network === 'testnet'
        ? 'https://api.testnet.solana.com'
        : 'https://solana-rpc.publicnode.com';

  const connection = new Connection(endpoint, 'processed');
  return new SolanaTokenProgram(connection);
}
