"use client"

import { useState, useEffect } from "react"
import { Zap, Clock, Bomb, Shuffle } from "lucide-react"

export type PowerUpType = "line_bomb" | "slow_time" | "shape_shifter"

interface PowerUpProps {
  type: PowerUpType
  onUse: () => void
  onExpire?: () => void
  duration?: number // in seconds, for time-based power-ups
}

export default function PowerUp({ type, onUse, onExpire, duration = 10 }: PowerUpProps) {
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(duration)

  // Handle power-up activation
  const activatePowerUp = () => {
    if (isActive) return

    setIsActive(true)
    onUse()

    // For time-based power-ups, start the countdown
    if (duration > 0) {
      setTimeRemaining(duration)
    }
  }

  // Handle countdown for time-based power-ups
  useEffect(() => {
    if (!isActive || duration <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsActive(false)
          if (onExpire) onExpire()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, duration, onExpire])

  // Get power-up details based on type
  const getPowerUpDetails = () => {
    switch (type) {
      case "line_bomb":
        return {
          name: "Line Bomb",
          description: "Clear multiple lines at once",
          icon: <Bomb className="w-6 h-6" />,
          color: "from-red-500 to-orange-500",
          textColor: "text-red-400",
        }
      case "slow_time":
        return {
          name: "Time Warp",
          description: "Slow down tetromino falling speed",
          icon: <Clock className="w-6 h-6" />,
          color: "from-blue-500 to-cyan-500",
          textColor: "text-blue-400",
        }
      case "shape_shifter":
        return {
          name: "Shape Shifter",
          description: "Transform current tetromino into any shape",
          icon: <Shuffle className="w-6 h-6" />,
          color: "from-purple-500 to-pink-500",
          textColor: "text-purple-400",
        }
      default:
        return {
          name: "Power-Up",
          description: "Special ability",
          icon: <Zap className="w-6 h-6" />,
          color: "from-yellow-500 to-amber-500",
          textColor: "text-yellow-400",
        }
    }
  }

  const details = getPowerUpDetails()

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={activatePowerUp}
        disabled={isActive}
        className={`w-16 h-16 rounded-full bg-gradient-to-br ${
          details.color
        } flex items-center justify-center shadow-lg ${
          isActive ? "opacity-50 cursor-not-allowed" : "hover:scale-105 transition-transform"
        }`}
      >
        {details.icon}
      </button>
      <div className="mt-2 text-center">
        <div className={`font-bold text-sm ${details.textColor}`}>{details.name}</div>
        {isActive && duration > 0 && <div className="text-xs font-mono mt-1">{timeRemaining}s</div>}
      </div>
    </div>
  )
}
