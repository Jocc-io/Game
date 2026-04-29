"use client"

import { Shield, AlertTriangle, CheckCircle, Clock, Ban } from "lucide-react"
import { useAntiBot } from "@/app/AntiBotGuard"
const __DEV__ = process.env.NODE_ENV !== "production"

interface ProtectionStatusProps {
  showDetails?: boolean
  className?: string
}

export default function ProtectionStatus({ showDetails = false, className = "" }: ProtectionStatusProps) {
  const antiBot = useAntiBot()

  const getStatusIcon = () => {
    switch (antiBot.verdict) {
      case "human-likely":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "bot-likely":
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case "blocked":
        return <Ban className="w-5 h-5 text-red-500" />
      default:
        return <Shield className="w-5 h-5 text-yellow-400" />
    }
  }

  const getStatusColor = () => {
    switch (antiBot.verdict) {
      case "human-likely":
        return "border-green-500/30 bg-green-500/10"
      case "bot-likely":
        return "border-red-500/30 bg-red-500/10"
      case "blocked":
        return "border-red-600/50 bg-red-600/20"
      default:
        return "border-yellow-500/30 bg-yellow-500/10"
    }
  }

  const getRiskColor = () => {
    if (antiBot.riskScore < 30) return "text-green-400"
    if (antiBot.riskScore < 70) return "text-yellow-400"
    return "text-red-400"
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getStatusColor()} ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium capitalize">
          {antiBot.verdict.replace('-', ' ')}
        </span>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl border ${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div>
          <h3 className="font-semibold capitalize">
            Protection Status: {antiBot.verdict.replace('-', ' ')}
          </h3>
          <p className="text-sm text-gray-400">
            {antiBot.eligible ? "Eligible to play" : "Not eligible - verification required"}
          </p>
        </div>
      </div>


     {showDetails && __DEV__ && (
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Risk Score:</span>
          <span className={`ml-2 font-bold ${getRiskColor()}`}>
            {antiBot.riskScore}/100
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Daily Rounds:</span>
          <span className="ml-2 font-bold text-blue-400">
            {antiBot.dailyRoundsRemaining}
          </span>
        </div>

        {antiBot.cooldownRemaining > 0 && (
          <div className="col-span-2 flex items-center gap-2 text-orange-400">
            <Clock className="w-4 h-4" />
            <span>Cooldown: {antiBot.cooldownRemaining}s</span>
          </div>
        )}
      </div>
     )}

      {!antiBot.eligible && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <button
            onClick={() => antiBot.requireChallenge()}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-colors"
          >
            Complete Verification
          </button>
        </div>
      )}
    </div>
  )
}
