"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Shield, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NFTGateProps {
  children: React.ReactNode
  collectionMint: string
  collectionName?: string
  mintUrl?: string
}

export function NFTGate({ children, collectionMint, collectionName = "Required Collection", mintUrl }: NFTGateProps) {
  const { publicKey, connected } = useWallet()
  const [hasNFT, setHasNFT] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check NFT ownership when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      checkNFTOwnership()
    } else {
      setHasNFT(null)
      setError(null)
    }
  }, [connected, publicKey, collectionMint])

  const checkNFTOwnership = async () => {
    if (!publicKey) return

    setIsChecking(true)
    setError(null)

    try {
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

      if (response.ok) {
        setHasNFT(data.allowed)
      } else {
        setError(data.error || "Failed to check NFT ownership")
      }
    } catch (err) {
      console.error("Error checking NFT ownership:", err)
      setError("Network error - please try again")
    } finally {
      setIsChecking(false)
    }
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-black/50 backdrop-blur-sm rounded-xl border border-cyan-500/30 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-4" />
        <h3 className="text-xl font-bold mb-2">Checking NFT Access...</h3>
        <p className="text-gray-300 text-center">Verifying your {collectionName} ownership</p>
      </div>
    )
  }

  // Show NFT requirement if user doesn't have access
  if (connected && hasNFT === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-black/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-8">
        <div className="w-16 h-16 rounded-full bg-red-600/30 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-red-400">NFT Required</h3>
        <p className="text-gray-300 text-center mb-6 max-w-md">
          You need to own an NFT from the <strong>{collectionName}</strong> collection to access this game.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={checkNFTOwnership}
            variant="outline"
            className="border-cyan-500/50 hover:bg-cyan-500/10 bg-transparent"
          >
            Recheck Access
          </Button>

          {mintUrl && (
            <Button
              onClick={() => window.open(mintUrl, "_blank")}
              className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get NFT
            </Button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>
    )
  }

  // Show connection requirement if wallet not connected
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-black/50 backdrop-blur-sm rounded-xl border border-yellow-500/30 p-8">
        <div className="w-16 h-16 rounded-full bg-yellow-600/30 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-yellow-400">Wallet Required</h3>
        <p className="text-gray-300 text-center mb-6 max-w-md">
          Please connect your Solana wallet to verify your {collectionName} NFT ownership.
        </p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-black/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-8">
        <div className="w-16 h-16 rounded-full bg-red-600/30 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-red-400">Verification Error</h3>
        <p className="text-gray-300 text-center mb-6 max-w-md">{error}</p>
        <Button
          onClick={checkNFTOwnership}
          variant="outline"
          className="border-cyan-500/50 hover:bg-cyan-500/10 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  // If user has NFT access, render the protected content
  return <>{children}</>
}
