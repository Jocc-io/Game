"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, CheckCircle2, AlertCircle } from "lucide-react"

export function AuthButton() {
  const { connected } = useWallet()
  const { isAuthenticated, isAuthenticating, authError, signOut, authAddress } = useWalletAuth()
  const [showError, setShowError] = useState(false)

  // Show error message when authentication fails
  useEffect(() => {
    if (authError) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [authError])

  if (!connected) {
    return (
      <WalletMultiButton className="!bg-purple-700 hover:!bg-purple-600 transition-colors !rounded-lg !py-2 !font-medium" />
    )
  }

  if (isAuthenticating) {
    return (
      <Button disabled className="bg-gradient-to-r from-yellow-500 to-amber-600 cursor-wait">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Authenticating...
      </Button>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden md:flex items-center gap-1 text-sm text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          {authAddress ? `${authAddress.slice(0, 4)}...${authAddress.slice(-4)}` : "Authenticated"}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="border-red-500/30 text-white hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-full"
        >
          <LogOut className="w-4 h-4 r" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <WalletMultiButton className="!bg-purple-700 hover:!bg-purple-600 transition-colors !rounded-lg !py-2 !font-medium" />

      {showError && authError && (
        <div className="absolute top-full mt-2 right-0 bg-red-500/20 border border-red-500/30 text-red-300 text-sm p-2 rounded-md w-64 z-50 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        </div>
      )}
    </div>
  )
}