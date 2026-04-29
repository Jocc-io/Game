import { NextResponse } from "next/server"
import { checkWalletHasCollectionNFT } from "@/lib/solana/checkCollection"

export async function POST(request: Request) {
  try {
    const { wallet, collection } = await request.json()

    if (!wallet || !collection) {
      return NextResponse.json({ error: "Missing wallet or collection parameter" }, { status: 400 })
    }

    // Validate wallet address format
    try {
      // Basic validation - check if it's a valid base58 string of correct length
      if (wallet.length < 32 || wallet.length > 44) {
        throw new Error("Invalid wallet address length")
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    console.log(`[API] Checking NFT ownership for wallet: ${wallet}, collection: ${collection}`)

    const hasNFT = await checkWalletHasCollectionNFT(wallet, collection)

    return NextResponse.json({ allowed: hasNFT })
  } catch (error) {
    console.error("[API] Error in check-nft endpoint:", error)
    return NextResponse.json({ error: "Failed to check NFT ownership" }, { status: 500 })
  }
}
