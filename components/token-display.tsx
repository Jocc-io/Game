"use client"

import { useState, useEffect } from "react"

interface TokenDisplayProps {
  tokens: number
}

export default function TokenDisplay({ tokens }: TokenDisplayProps) {
  const [animatedTokens, setAnimatedTokens] = useState(tokens)

  useEffect(() => {
    if (tokens === animatedTokens) return

    // Animate token count change
    const diff = tokens - animatedTokens
    const step = Math.ceil(Math.abs(diff) / 20)
    const interval = setInterval(() => {
      setAnimatedTokens((prev) => {
        if (diff > 0) {
          const next = prev + step
          return next >= tokens ? tokens : next
        } else {
          const next = prev - step
          return next <= tokens ? tokens : next
        }
      })
    }, 50)

    return () => clearInterval(interval)
  }, [tokens, animatedTokens])

  return (
    <div className="flex justify-center gap-2 border border-yellow-500/30 px-4 py-2 rounded-2xl 
      bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30">
      <span className="text-sm text-blue-400 font-bold ">{animatedTokens.toLocaleString()}</span>
      <span className="text-sm font-bold text-blue-300 ">JOCC</span>
      </div>
  )
}
