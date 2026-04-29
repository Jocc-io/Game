import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { checkWalletHasCollectionNFT } from "@/lib/solana/checkCollection"

export async function POST(request: Request) {
  try {
    // First, check the antibot verdict cookie
    const c = await cookies()
    const verdict = c.get("abg_verdict")?.value ?? "unknown"

    if (verdict !== "human-likely") {
      return NextResponse.json({ error: "Blocked by AntiBot" }, { status: 403 })
    }

    // Parse request body to get wallet address
    const { wallet } = await request.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Check if required collection mint is configured
    const requiredCollectionMint = process.env.REQUIRED_COLLECTION_MINT || "J7XdT55SHbcejfrLkDhz14sPcv9iZg81venAoDqYepoc"
    if (!requiredCollectionMint) {
      console.error("REQUIRED_COLLECTION_MINT environment variable not set")
      return NextResponse.json({ error: "Server configuration error: Collection mint not configured" }, { status: 500 })
    }

    console.log(`[Game Start] Checking NFT requirement for wallet: ${wallet}`)

    // Check if wallet owns the required NFT
    const hasRequiredNFT = await checkWalletHasCollectionNFT(wallet, requiredCollectionMint)

    if (!hasRequiredNFT) {
      console.log(`[Game Start] NFT requirement not met for wallet: ${wallet}`)
      return NextResponse.json({ error: "NFT required" }, { status: 403 })
    }

    console.log(`[Game Start] All checks passed for wallet: ${wallet}`)

    // All checks passed - start the game
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Game Start] Error:", error)
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 })
  }
}
