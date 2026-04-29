import { Connection, type PublicKey } from '@solana/web3.js';
import { SolanaTokenProgram, GAME_TOKEN_MINT } from './solana-program';

export interface WithdrawalResult {
  success: boolean;
  signature?: string;
  error?: string;
  newTokenBalance?: number;
}

export class TokenWithdrawalService {
  private solanaProgram: SolanaTokenProgram;
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.solanaProgram = new SolanaTokenProgram(connection);
  }

  /**
   * Process a token withdrawal request - now uses secure API with proper transaction signing
   */
  async processWithdrawal(
    userWallet: PublicKey,
    gameTokens: number,
    withdrawalAmount: number,
    sendTransaction: any // Now required for signing the transaction
  ): Promise<WithdrawalResult> {
    try {
      if (!sendTransaction) {
        return {
          success: false,
          error: 'Wallet sendTransaction function is required',
        };
      }

      // Validate withdrawal amount
      if (withdrawalAmount < 1) {
        return {
          success: false,
          error: 'Minimum withdrawal is 1 token',
        };
      }

      if (withdrawalAmount > gameTokens) {
        return {
          success: false,
          error: `Insufficient game tokens. You have ${gameTokens}, requested ${withdrawalAmount}`,
        };
      }

      // Verify withdrawal eligibility
      const eligibility = await this.solanaProgram.verifyWithdrawalEligibility(
        userWallet,
        withdrawalAmount,
        gameTokens,
        GAME_TOKEN_MINT
      );

      if (!eligibility.eligible) {
        return {
          success: false,
          error: eligibility.reason || 'Withdrawal not eligible',
        };
      }

      const result = await this.solanaProgram.processWithdrawal(
        userWallet,
        withdrawalAmount,
        gameTokens,
        sendTransaction
      );

      if (result.success) {
        return {
          success: true,
          signature: result.signature,
          newTokenBalance: result.newGameTokenBalance,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Withdrawal failed',
        };
      }
    } catch (error) {
      console.error('Token withdrawal error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user's on-chain token balance
   */
  async getUserTokenBalance(userWallet: PublicKey): Promise<number> {
    return this.solanaProgram.getUserTokenBalance(userWallet, GAME_TOKEN_MINT);
  }

  /**
   * Estimate withdrawal fees
   */
  async estimateWithdrawalFees(): Promise<number> {
    try {
      // Get recent blockhash to estimate fees
      const { feeCalculator } = await this.connection.getRecentBlockhash();

      // Estimate transaction size (typical withdrawal transaction)
      const estimatedSize = 300; // bytes

      return feeCalculator.lamportsPerSignature * 2; // Account for potential account creation
    } catch (error) {
      console.error('Error estimating fees:', error);
      return 5000; // Default estimate in lamports
    }
  }
}

// Helper function to create withdrawal service
export function createWithdrawalService(
  network: 'devnet' | 'testnet' | 'mainnet-beta' = 'mainnet-beta'
): TokenWithdrawalService {
  const endpoint =
    network === 'mainnet-beta'
      ? 'https://solana-rpc.publicnode.com'
      : network === 'testnet'
        ? 'https://api.testnet.solana.com'
        : 'https://solana-rpc.publicnode.com';

  const connection = new Connection(endpoint, 'processed');
  return new TokenWithdrawalService(connection);
}
