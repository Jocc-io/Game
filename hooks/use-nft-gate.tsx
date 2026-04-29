"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"

interface UseNFTGateOptions {
  collectionMint: string
  autoCheck?: boolean
}

export function useNFTGate({ collectionMint, autoCheck = true }: UseNFTGateOptions) {
  const { publicKey, connected } = useWallet()
  const [hasNFT, setHasNFT] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkNFTAccess = useCallback(async () => {
    if (!publicKey || !connected) {
      setHasNFT(null)
      return false
    }

    setIsChecking(true)
    setError(null)

    try {
      console.log("Making NFT check API call:", { wallet: publicKey.toString(), collection: collectionMint })

      const response = await fetch("/api/auth/check-nft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          collection: collectionMint,
        }),
      })

      const data = await response.json()

      console.log("NFT check API response:", { status: response.status, data })

      if (response.ok) {
        setHasNFT(data.allowed)
        return data.allowed
      } else {
        setError(data.error || "Failed to check NFT ownership")
        return false
      }
    } catch (err) {
      console.error("Error checking NFT ownership:", err)
      setError("Network error - please try again")
      return false
    } finally {
      setIsChecking(false)
    }
  }, [publicKey, connected, collectionMint])

  const startGame = useCallback(async () => {
    if (!publicKey || !connected) {
      throw new Error("Wallet not connected")
    }

    // First check NFT access
    const hasAccess = await checkNFTAccess()
    if (!hasAccess) {
      throw new Error("NFT required to play")
    }

    // Then call the game start API
    const response = await fetch("/api/game/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wallet: publicKey.toString(),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to start game")
    }

    return data
  }, [publicKey, connected, checkNFTAccess])

  // Auto-check on wallet connection if enabled
  useEffect(() => {
    if (autoCheck && connected && publicKey) {
      checkNFTAccess()
    } else if (!connected) {
      setHasNFT(null)
      setError(null)
    }
  }, [connected, publicKey, autoCheck, checkNFTAccess])

  return {
    hasNFT,
    isChecking,
    error,
    checkNFTAccess,
    startGame,
    canPlay: connected && hasNFT === true,
  }
}
