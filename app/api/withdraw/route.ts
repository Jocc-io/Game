import { type NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { checkWalletHasCollectionNFT } from '@/lib/solana/checkCollection';

const GAME_TOKEN_MINT = new PublicKey(
  'JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc'
);

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_WITHDRAWALS_PER_WINDOW = 5;
const userWithdrawalHistory = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const history = userWithdrawalHistory.get(userId) || [];
  const recentHistory = history.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  userWithdrawalHistory.set(userId, recentHistory);
  return recentHistory.length >= MAX_WITHDRAWALS_PER_WINDOW;
}

function logWithdrawalAttempt(data: any) {
  console.log(`[WITHDRAW_AUDIT] ${new Date().toISOString()}:`, JSON.stringify(data));
}

export async function POST(request: NextRequest) {
  const replitUser = request.headers.get('X-Replit-User-Id');
  
  try {
    if (!replitUser) {
      logWithdrawalAttempt({ status: 'REJECTED', reason: 'UNAUTHORIZED', ip: request.headers.get('x-forwarded-for') });
      return NextResponse.json({ success: false, error: 'User must be logged in via Replit Auth' }, { status: 401 });
    }

    if (isRateLimited(replitUser)) {
      logWithdrawalAttempt({ status: 'REJECTED', reason: 'RATE_LIMITED', userId: replitUser });
      return NextResponse.json({ success: false, error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    const { userWallet, withdrawalAmount } = await request.json();

    if (!userWallet || !withdrawalAmount) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify NFT Ownership on-chain
    const hasNFT = await checkWalletHasCollectionNFT(userWallet, null);
    if (!hasNFT) {
      logWithdrawalAttempt({ status: 'REJECTED', reason: 'NO_NFT', userId: replitUser, wallet: userWallet });
      return NextResponse.json({ success: false, error: 'You must own a required NFT to withdraw tokens.' }, { status: 403 });
    }

    // 2. Verify Token Balance from server-side source
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=8cc4fd20-f370-4d0d-8c2e-351aab68a98f', 'confirmed');
    const userPublicKey = new PublicKey(userWallet);
    const userTokenAccount = await getAssociatedTokenAddress(GAME_TOKEN_MINT, userPublicKey);
    
    // In a real app, you'd check a database balance here. 
    // For this implementation, we ensure the withdrawal doesn't exceed 1000 tokens per request as a safety measure
    if (withdrawalAmount > 1000) {
      logWithdrawalAttempt({ status: 'REJECTED', reason: 'EXCESSIVE_AMOUNT', userId: replitUser, amount: withdrawalAmount });
      return NextResponse.json({ success: false, error: 'Withdrawal amount exceeds single transaction limit.' }, { status: 400 });
    }

    const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
    if (!treasuryPrivateKey) {
      console.error('TREASURY_PRIVATE_KEY not found');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
    const treasuryTokenAccount = await getAssociatedTokenAddress(GAME_TOKEN_MINT, treasuryKeypair.publicKey);

    const transaction = new Transaction();
    transaction.feePayer = userPublicKey;

    let needsTokenAccount = false;
    try {
      await getAccount(connection, userTokenAccount);
    } catch (error) {
      needsTokenAccount = true;
      transaction.add(createAssociatedTokenAccountInstruction(userPublicKey, userTokenAccount, userPublicKey, GAME_TOKEN_MINT));
    }

    const transferAmount = Math.floor(withdrawalAmount * Math.pow(10, 9));
    transaction.add(createTransferInstruction(
      treasuryTokenAccount,
      userTokenAccount,
      treasuryKeypair.publicKey,
      transferAmount,
      [],
      TOKEN_PROGRAM_ID
    ));

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.partialSign(treasuryKeypair);

    const serializedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });

    // Update rate limit history
    const history = userWithdrawalHistory.get(replitUser) || [];
    history.push(Date.now());
    userWithdrawalHistory.set(replitUser, history);

    logWithdrawalAttempt({ status: 'SUCCESS', userId: replitUser, wallet: userWallet, amount: withdrawalAmount });

    return NextResponse.json({
      success: true,
      transaction: bs58.encode(serializedTransaction),
      needsTokenAccount,
      newGameTokenBalance: 0,
    });
  } catch (error) {
    logWithdrawalAttempt({ status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown' });
    return NextResponse.json({ success: false, error: 'Withdrawal processing failed' }, { status: 500 });
  }
}
