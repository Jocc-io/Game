import { Connection, PublicKey } from '@solana/web3.js';
import { deserializeMetadata } from '@metaplex-foundation/mpl-token-metadata';

const cache = new Map<string, { result: boolean; timestamp: number }>();

const POSITIVE_CACHE_DURATION = 5 * 60 * 1000;
const NEGATIVE_CACHE_DURATION = 30 * 1000;

const TARGET_COLLECTION = new PublicKey(
  '4RHERyDGjRL59EWu4MhZy2g6E89GtC2ofS19TY8hhodR'
);

/**
 * Check if a wallet owns at least one NFT from the target collection
 */
export async function checkWalletHasCollectionNFT(
  walletPubkey: string,
  collection: any
): Promise<boolean> {
  const cacheKey = `${walletPubkey}-${TARGET_COLLECTION.toString()}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    const now = Date.now();
    const maxAge = cached.result
      ? POSITIVE_CACHE_DURATION
      : NEGATIVE_CACHE_DURATION;
    if (now - cached.timestamp < maxAge) {
      console.log(
        `[NFT Check] Cache hit for ${walletPubkey}: ${cached.result}`
      );
      return cached.result;
    }
    cache.delete(cacheKey);
  }

  try {
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com',
      'confirmed'
    );
    const walletPublicKey = new PublicKey(walletPubkey);

    console.log(
      `[NFT Check] Checking wallet ${walletPubkey} for collection ${TARGET_COLLECTION.toString()}`
    );

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      }
    );

    for (const tokenAccount of tokenAccounts.value) {
      const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

      if (tokenAmount.amount !== '1' || tokenAmount.decimals !== 0) continue;

      const mintAddress = tokenAccount.account.data.parsed.info.mint;
      const mintPublicKey = new PublicKey(mintAddress);

      try {
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            new PublicKey(
              'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
            ).toBuffer(),
            mintPublicKey.toBuffer(),
          ],
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
        );

        const metadataAccount = await connection.getAccountInfo(metadataPDA);
        if (!metadataAccount) continue;

        const metadata: any = deserializeMetadata({
          ...metadataAccount,
          // @ts-ignore
          publicKey: metadataPDA,
        });

        console.log(
          `[NFT Check] NFT ${mintAddress} collection field:`,
          metadata.collection
        );

        if (
          metadata.collection &&
          metadata.collection.__option === 'Some' &&
          metadata.collection.value.key.toString() ===
            TARGET_COLLECTION.toString()
        ) {
          console.log(
            `[NFT Check] ✅ Valid NFT from target collection found: ${mintAddress}`
          );
          cache.set(cacheKey, { result: true, timestamp: Date.now() });
          return true;
        }
      } catch (err) {
        console.warn(`[NFT Check] Error checking mint ${mintAddress}:`, err);
        continue;
      }
    }

    console.log(
      `[NFT Check] ❌ No valid NFT from target collection in wallet ${walletPubkey}`
    );
    cache.set(cacheKey, { result: false, timestamp: Date.now() });
    return false;
  } catch (error) {
    console.error(`[NFT Check] Error checking wallet ${walletPubkey}:`, error);
    return false;
  }
}
