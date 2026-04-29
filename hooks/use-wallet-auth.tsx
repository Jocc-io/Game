"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  generateNonce,
  createSignInMessage,
  verifySignature,
  storeAuthState,
  isAuthenticated,
  clearAuthState,
  setSignInProgress,
  isSignInInProgress,
} from "@/lib/auth"

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authAddress, setAuthAddress] = useState<string | null>(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const { authenticated, walletAddress } = isAuthenticated()
    if (authenticated && walletAddress) {
      setIsAuthed(true)
      setAuthAddress(walletAddress)
    }
  }, [])

  // Handle wallet connection/disconnection
  useEffect(() => {
    if (!connected) {
      // Reset state when wallet disconnects
      clearAuthState()
      setIsAuthed(false)
      setAuthAddress(null)
      setSignInProgress(false)
    } else if (connected && publicKey && !isAuthed && !isAuthenticating) {
      // Check if we're already authenticated or in the process of authenticating
      const { authenticated } = isAuthenticated()

      if (authenticated) {
        setIsAuthed(true)
        setAuthAddress(publicKey.toString())
      } else if (!isSignInInProgress()) {
        // Only trigger sign-in if not already in progress
        handleSignIn()
      }
    }
  }, [connected, publicKey, isAuthed, isAuthenticating])

  // Handle sign-in process with debounce
  const handleSignIn = useCallback(async () => {
    // Prevent multiple sign-in attempts
    if (isSignInInProgress() || !publicKey || !signMessage) return

    // Set global sign-in in progress flag
    setSignInProgress(true)
    setIsAuthenticating(true)
    setAuthError(null)

    try {
      // Generate a nonce for this authentication attempt
      const nonce = generateNonce()

      // Create the message to be signed
      const message = createSignInMessage(nonce, publicKey.toString())

      // Request signature from the wallet
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await signMessage(encodedMessage)

      // Verify the signature
      const isValid = await verifySignature(signature, message, publicKey)

      if (isValid) {
        // Store authentication state
        storeAuthState(publicKey.toString(), Date.now())
        setIsAuthed(true)
        setAuthAddress(publicKey.toString())
        return true
      } else {
        setAuthError("Signature verification failed")
        return false
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setAuthError(error instanceof Error ? error.message : "Failed to authenticate")
      return false
    } finally {
      setIsAuthenticating(false)
      // Reset sign-in in progress flag after a delay to prevent immediate re-attempts
      setTimeout(() => {
        setSignInProgress(false)
      }, 1000)
    }
  }, [publicKey, signMessage])

  const signOut = useCallback(() => {
    clearAuthState()
    setIsAuthed(false)
    setAuthAddress(null)
    setSignInProgress(false)
    disconnect()
  }, [disconnect])

  return {
    isAuthenticating,
    isAuthenticated: isAuthed,
    authError,
    authAddress,
    signOut,
  }
}
