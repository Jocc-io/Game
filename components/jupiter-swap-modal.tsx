"use client"

import { useEffect, useRef, useState } from "react"
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

import "@jup-ag/plugin/css"

interface JupiterSwapModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function JupiterSwapModal({ isOpen, onClose }: JupiterSwapModalProps) {
  const wallet = useWallet()
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function initJupiter() {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = ""
        }

        const { init } = await import("@jup-ag/plugin")

        init({
          displayMode: "integrated",
          integratedTargetId: "jupiter-container",
          defaultExplorer: "Solscan",
          enableWalletPassthrough: false, 
           formProps: {
             initialAmount: "1000000000",
             initialInputMint: "JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc",
             initialOutputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
             fixedMint: "JoccLDaiiZv7P9F3LfcWjcVWD7rf6wpMrCimy6Xcbhc",
  },
        })

        if (window.Jupiter?.syncProps) {
          window.Jupiter.syncProps({
            passthroughWalletContextState: wallet as WalletContextState,
          })
        }
      } catch (err) {
        console.error("Jupiter init error:", err)
        setError("Failed to load Jupiter Swap")
      }
    }

    initJupiter()
  }, [isOpen, wallet])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-none rounded-2xl p-8">
        {error ? (
          <div className="text-center">
            <p className="text-red-400 ">{error}</p>
          </div>
        ) : (
          <div
            id="jupiter-container"
            ref={containerRef}
            className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-cyan-900/90 to-black 
            border border-cyan-800/80 rounded-xl"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
