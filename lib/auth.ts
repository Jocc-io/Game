import type { PublicKey } from "@solana/web3.js"
import bs58 from "bs58"
import nacl from "tweetnacl"

// Flag to track if a sign-in is in progress globally
let signInInProgress = false

// Generate a random nonce for the sign-in message
export function generateNonce(): string {
  const nonceArray = new Uint8Array(16)
  crypto.getRandomValues(nonceArray)
  return bs58.encode(nonceArray)
}

// Create a sign-in message with a nonce to prevent replay attacks
export function createSignInMessage(nonce: string, walletAddress: string): string {
  return `Jocc Sign message.

Wallet address: ${walletAddress}
Nonce: ${nonce}
Date: ${new Date().toISOString()}

This request will not trigger a blockchain transaction or cost any fees.`
}

// Verify a signed message
export async function verifySignature(
  signature: Uint8Array | string,
  message: string,
  publicKey: PublicKey | string,
): Promise<boolean> {
  try {
    // Convert signature to Uint8Array if it's a string
    const signatureBytes = typeof signature === "string" ? bs58.decode(signature) : signature

    // Convert message to Uint8Array
    const messageBytes = new TextEncoder().encode(message)

    // Convert publicKey to Uint8Array if it's a string or PublicKey
    const publicKeyBytes = typeof publicKey === "string" ? bs58.decode(publicKey) : new Uint8Array(publicKey.toBytes())

    // Verify the signature using tweetnacl
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch (error) {
    console.error("Error verifying signature:", error)
    return false
  }
}

// Store authentication state
export function storeAuthState(walletAddress: string, authTimestamp: number): void {
  localStorage.setItem("auth_wallet", walletAddress)
  localStorage.setItem("auth_timestamp", authTimestamp.toString())
}

// Check if user is authenticated
export function isAuthenticated(): { authenticated: boolean; walletAddress: string | null } {
  const walletAddress = localStorage.getItem("auth_wallet")
  const authTimestamp = localStorage.getItem("auth_timestamp")

  if (!walletAddress || !authTimestamp) {
    return { authenticated: false, walletAddress: null }
  }

  // Check if authentication is expired (24 hours)
  const now = Date.now()
  const authTime = Number.parseInt(authTimestamp)
  const isExpired = now - authTime > 24 * 60 * 60 * 1000

  return {
    authenticated: !isExpired,
    walletAddress: isExpired ? null : walletAddress,
  }
}

// Clear authentication state
export function clearAuthState(): void {
  localStorage.removeItem("auth_wallet")
  localStorage.removeItem("auth_timestamp")
}

// Set sign-in in progress flag
export function setSignInProgress(inProgress: boolean): void {
  signInInProgress = inProgress
}

// Check if sign-in is in progress
export function isSignInInProgress(): boolean {
  return signInInProgress
}
