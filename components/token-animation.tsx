"use client"

import { useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"

interface TokenAnimationProps {
  tokens: number
  onComplete?: () => void
}

export default function TokenAnimation({ tokens, onComplete }: TokenAnimationProps) {
  const [animationComplete, setAnimationComplete] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (tokens <= 0) {
      if (onComplete) onComplete()
      return
    }

    if (!canvasRef.current) return

    const myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true })
    const duration = 2000
    const end = Date.now() + duration
    const colors = ["#a855f7", "#ec4899", "#06b6d4", "#f0f000"]

    const frame = () => {
      myConfetti({
        particleCount: 5,
        spread: 70,
        origin: { x: 0.5, y: 0.5 }, // 👈 النص بالظبط
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      } else {
        setTimeout(() => {
          setAnimationComplete(true)
          if (onComplete) onComplete()
        }, 500)
      }
    }

    frame()
  }, [tokens, onComplete])

  return !animationComplete ? (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    />
  ) : null
}
