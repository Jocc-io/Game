"use client"

import { useCallback } from "react"
import { useAntiBot } from "@/app/AntiBotGuard"
import { useWallet } from "@solana/wallet-adapter-react"

/**
 * Hook to integrate AntiBotGuard with game sessions
 * This should be used in game components to enforce bot protection
 */
export function useAntiBotIntegration() {
  const { connected } = useWallet()
  const antiBot = useAntiBot()

  // Check eligibility before allowing game actions
  const checkEligibility = useCallback(
    async (action: "start_game" | "claim_tokens" | "withdraw"): Promise<boolean> => {
      if (!connected) {
        console.warn("Wallet not connected - blocking action:", action)
        return false
      }

      // 👇 إضافة: لو الحالة unknown نطلب challenge الأول
      if (antiBot.verdict === "unknown") {
        console.warn("Verdict unknown - requiring challenge:", action)
        const challengePassed = await antiBot.requireChallenge()
        if (!challengePassed) {
          console.warn("Challenge failed - blocking action:", action)
          return false
        }
      }

      // High-risk actions require additional verification
      if (action === "claim_tokens" || action === "withdraw") {
        if (antiBot.verdict === "bot-likely" || antiBot.verdict === "blocked") {
          console.warn("Bot-like behavior detected - blocking action:", action)
          return false
        }

        if (antiBot.riskScore > 60) {
          console.warn("High risk score - requiring challenge for action:", action)
          const challengePassed = await antiBot.requireChallenge()
          if (!challengePassed) {
            console.warn("Challenge failed - blocking action:", action)
            return false
          }
        }
      }

      // Check basic eligibility
      if (!antiBot.eligible) {
        console.warn("Not eligible - blocking action:", action)
        return false
      }

      if (antiBot.cooldownRemaining > 0) {
        console.warn("Cooldown active - blocking action:", action)
        return false
      }

      if (antiBot.dailyRoundsRemaining <= 0) {
        console.warn("Daily limit reached - blocking action:", action)
        return false
      }

      return true
    },
    [connected, antiBot]
  )

  // Mark game round completion (should be called after each game)
  const completeGameRound = useCallback(
    (score: number) => {
      if (score > 0) {
        const analysis = antiBot.getBehaviorAnalysis()

        // Detect suspicious scoring patterns
        if (score % 100 === 0 && score > 1000) {
          console.warn("Suspicious perfect score detected:", score)
        }

        // Log behavioral patterns for analysis
        if (analysis.patterns.length > 0) {
          console.warn("Suspicious behavioral patterns detected:", analysis.patterns)
        }
      }

      antiBot.markRoundEnd()
    },
    [antiBot]
  )

  // Get current protection status
  const getProtectionStatus = useCallback(() => {
    return {
      eligible: antiBot.eligible,
      verdict: antiBot.verdict,
      riskScore: antiBot.riskScore,
      cooldownRemaining: antiBot.cooldownRemaining,
      dailyRoundsRemaining: antiBot.dailyRoundsRemaining,
      canPlay:
        antiBot.eligible &&
        antiBot.cooldownRemaining === 0 &&
        antiBot.dailyRoundsRemaining > 0,
      canWithdraw:
        antiBot.eligible &&
        antiBot.verdict !== "bot-likely" &&
        antiBot.riskScore < 50,
    }
  }, [antiBot])

  return {
    checkEligibility,
    completeGameRound,
    getProtectionStatus,
    requireChallenge: antiBot.requireChallenge,
    resetProtection: antiBot.resetState,
  }
}
