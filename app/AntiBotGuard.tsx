"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

/**
 * Enhanced AntiBotGuard.tsx
 * Advanced client-side Anti-Bot protection for P2E gaming platform.
 *
 * Features:
 * - Multi-layered bot detection (behavioral, timing, device fingerprinting)
 * - Progressive challenge system with increasing difficulty
 * - Session management with automatic expiration
 * - Persistent tracking across browser sessions
 * - Real-time risk assessment
 * - Advanced behavioral analysis
 */

/* ============================
   Types & Props
   ============================ */

export type GuardVerdict = "unknown" | "human-likely" | "bot-likely" | "blocked"

export interface AntiBotGuardProps {
  children?: React.ReactNode
  onVerdict?(v: GuardVerdict): void
  onEligibleChange?(eligible: boolean): void
  sessionMaxMinutes?: number // default 60
  cooldownSeconds?: number // default 30 between rounds
  suspicionThreshold?: number // 0..100, default 70
  challengeInterval?: number // number of rounds between challenges, default 2
  autoChallengeOnSuspicion?: boolean // default true
  storageKey?: string // default 'abg:v2'
  maxDailyRounds?: number // default 50
  strictMode?: boolean // default true - enables advanced detection
}

/* ============================
   Enhanced Helpers
   ============================ */

const cryptoRandomInt = (max: number) => {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

const now = () => Date.now()

const defaultStorageKey = "abg:v2"

type PersistState = {
  roundsCompleted: number
  dailyRounds: number
  lastRoundEnd?: number
  sessionStart?: number
  softBlockUntil?: number
  clickDeltas?: number[]
  behaviorScore?: number
  lastDailyReset?: number
  challengesPassed: number
  challengesFailed: number
  deviceFingerprint?: string
  suspiciousPatterns: string[]
}

const loadPersist = (key: string): PersistState => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return {
        roundsCompleted: 0,
        dailyRounds: 0,
        challengesPassed: 0,
        challengesFailed: 0,
        suspiciousPatterns: [],
      }
    const parsed = JSON.parse(raw)

    // Reset daily rounds if it's a new day
    const lastReset = parsed.lastDailyReset || 0
    const today = new Date().setHours(0, 0, 0, 0)
    if (lastReset < today) {
      parsed.dailyRounds = 0
      parsed.lastDailyReset = today
    }

    return parsed
  } catch {
    return {
      roundsCompleted: 0,
      dailyRounds: 0,
      challengesPassed: 0,
      challengesFailed: 0,
      suspiciousPatterns: [],
    }
  }
}

const savePersist = (key: string, s: PersistState) => {
  try {
    localStorage.setItem(key, JSON.stringify(s))
  } catch {}
}

// Enhanced device fingerprinting
const generateDeviceFingerprint = (): string => {
  try {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.textBaseline = "top"
      ctx.font = "14px Arial"
      ctx.fillText("Device fingerprint test", 2, 2)
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0,
      canvas.toDataURL(),
      navigator.platform,
      navigator.cookieEnabled,
    ].join("|")

    // Simple hash
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  } catch {
    return "unknown"
  }
}

/* ============================
   Context & Provider
   ============================ */

type AntiBotState = {
  eligible: boolean
  verdict: GuardVerdict
  riskScore: number
  cooldownRemaining: number
  dailyRoundsRemaining: number
  requireChallenge(): Promise<boolean>
  markRoundEnd(): void
  resetState(): void
  getBehaviorAnalysis(): { patterns: string[]; confidence: number }
}

const AntiBotContext = createContext<AntiBotState | null>(null)

export function useAntiBot(): AntiBotState {
  const ctx = useContext(AntiBotContext)
  if (!ctx) {
    throw new Error("useAntiBot must be used inside <AntiBotGuard />")
  }
  return ctx
}

/* ============================
   Enhanced Challenge Components
   ============================ */

type ChallengeResult = "passed" | "failed" | "cancelled"

function focusTrap(node: HTMLElement | null) {
  if (!node) return () => {}
  const focusable = node.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  function onKey(e: KeyboardEvent) {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          ;(last || first).focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          ;(first || last).focus()
        }
      }
    }
    if (e.key === "Escape") {
      e.preventDefault() // Prevent closing without solving
    }
  }

  document.addEventListener("keydown", onKey)
  ;(first || (node as any)).focus?.()
  return () => document.removeEventListener("keydown", onKey)
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ============================
   Main Enhanced Component
   ============================ */

export default function AntiBotGuard(props: AntiBotGuardProps) {
  const {
    children,
    onVerdict,
    onEligibleChange,
    sessionMaxMinutes = 60,
    cooldownSeconds = 30,
    suspicionThreshold = 70,
    challengeInterval = 2,
    storageKey = defaultStorageKey,
    maxDailyRounds = 50,
    strictMode = true,
  } = props

  // Enhanced persistent state
  const persistedRef = useRef<PersistState>(loadPersist(storageKey))
  if (!persistedRef.current) {
    persistedRef.current = {
      roundsCompleted: 0,
      dailyRounds: 0,
      challengesPassed: 0,
      challengesFailed: 0,
      suspiciousPatterns: [],
    }
  }

  // Session storage keys
  const sessionBlockedKey = `${storageKey}:session:blocked`
  const sessionChallengePassKey = `${storageKey}:session:challengePassedAt`
  const deviceFingerprintKey = `${storageKey}:device:fp`

  const [eligible, setEligible] = useState<boolean>(false)
  const [verdict, setVerdict] = useState<GuardVerdict>("unknown")
  const [riskScore, setRiskScore] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [dailyRoundsRemaining, setDailyRoundsRemaining] = useState<number>(maxDailyRounds)

  // Enhanced behavioral tracking
  const clickTimestampsRef = useRef<number[]>([])
  const pointerSamplesRef = useRef<{ t: number; x: number; y: number; pressure?: number }[]>([])
  const keyTimingsRef = useRef<{ key: string; timestamp: number; duration: number }[]>([])
  const focusEventsRef = useRef<{ type: "focus" | "blur"; timestamp: number }[]>([])
  const scrollPatternsRef = useRef<{ timestamp: number; deltaY: number; deltaX: number }[]>([])
  const reactionLatenciesRef = useRef<number[]>([])
  const behaviorPatternsRef = useRef<Set<string>>(new Set())

  // Session tracking
  const roundsRef = useRef<number>(persistedRef.current.roundsCompleted || 0)
  const dailyRoundsRef = useRef<number>(persistedRef.current.dailyRounds || 0)
  const lastRoundEndRef = useRef<number | undefined>(persistedRef.current.lastRoundEnd)
  const sessionStartRef = useRef<number>(persistedRef.current.sessionStart || now())
  const softBlockUntilRef = useRef<number | undefined>(persistedRef.current.softBlockUntil)
  const deviceFingerprintRef = useRef<string>(persistedRef.current.deviceFingerprint || generateDeviceFingerprint())

  const cooldownTimerRef = useRef<number | null>(null)
  const challengeModalResolveRef = useRef<((res: { result: ChallengeResult; info?: any }) => void) | null>(null)
  const lastSentRef = useRef<number>(0)

  const [challengeOpen, setChallengeOpen] = useState(false)
  const [challengeType, setChallengeType] = useState<number>(0)
  const [challengeAttemptsLeft, setChallengeAttemptsLeft] = useState<number>(3)
  const [challengeDifficulty, setChallengeDifficulty] = useState<number>(1)

  // Enhanced behavioral event listeners
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      pointerSamplesRef.current.push({
        t: now(),
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
      })
      if (pointerSamplesRef.current.length > 100) pointerSamplesRef.current.shift()
    }

    const onClick = (e: MouseEvent) => {
      const t = Date.now()
      clickTimestampsRef.current.push(t)
      if (clickTimestampsRef.current.length > 100) clickTimestampsRef.current.shift()

      // Detect rapid clicking patterns
      if (clickTimestampsRef.current.length >= 5) {
        const recent = clickTimestampsRef.current.slice(-5)
        const intervals = recent.slice(1).map((time, i) => time - recent[i])
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

        if (avgInterval < 50) {
          behaviorPatternsRef.current.add("rapid_clicking")
        }
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const timestamp = now()
      keyTimingsRef.current.push({ key: e.key, timestamp, duration: 0 })
      if (keyTimingsRef.current.length > 50) keyTimingsRef.current.shift()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const timestamp = now()
      const lastKey = keyTimingsRef.current.findLast((k) => k.key === e.key && k.duration === 0)
      if (lastKey) {
        lastKey.duration = timestamp - lastKey.timestamp

        // Detect inhuman key timing patterns
        if (lastKey.duration < 10) {
          behaviorPatternsRef.current.add("instant_key_release")
        }
      }
    }

    const onFocus = () => {
      focusEventsRef.current.push({ type: "focus", timestamp: now() })
      if (focusEventsRef.current.length > 20) focusEventsRef.current.shift()
    }

    const onBlur = () => {
      focusEventsRef.current.push({ type: "blur", timestamp: now() })
      if (focusEventsRef.current.length > 20) focusEventsRef.current.shift()
    }

    const onScroll = (e: WheelEvent) => {
      scrollPatternsRef.current.push({
        timestamp: now(),
        deltaY: e.deltaY,
        deltaX: e.deltaX,
      })
      if (scrollPatternsRef.current.length > 30) scrollPatternsRef.current.shift()

      // Detect perfect scroll patterns
      if (scrollPatternsRef.current.length >= 3) {
        const recent = scrollPatternsRef.current.slice(-3)
        const deltaYs = recent.map((s) => s.deltaY)
        if (deltaYs.every((d) => d === deltaYs[0]) && deltaYs[0] !== 0) {
          behaviorPatternsRef.current.add("perfect_scroll_pattern")
        }
      }
    }

    // Add all listeners
    window.addEventListener("pointermove", onPointer)
    window.addEventListener("click", onClick)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("focus", onFocus)
    window.addEventListener("blur", onBlur)
    window.addEventListener("wheel", onScroll)

    return () => {
      window.removeEventListener("pointermove", onPointer)
      window.removeEventListener("click", onClick)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("wheel", onScroll)
    }
  }, [])

  // Device fingerprint validation
  useEffect(() => {
    const storedFingerprint = localStorage.getItem(deviceFingerprintKey)
    const currentFingerprint = generateDeviceFingerprint()

    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      // Device fingerprint changed - potential bot switching
      behaviorPatternsRef.current.add("fingerprint_mismatch")
      setRiskScore((prev) => Math.min(100, prev + 30))
    } else if (!storedFingerprint) {
      localStorage.setItem(deviceFingerprintKey, currentFingerprint)
    }

    deviceFingerprintRef.current = currentFingerprint
  }, [deviceFingerprintKey])

  // Enhanced behavioral analysis
  const computeAdvancedBehaviorScore = useCallback(() => {
    let score = 0

    // 1. Click pattern analysis
    const clicks = clickTimestampsRef.current
    if (clicks.length >= 10) {
      const intervals = clicks.slice(1).map((time, i) => time - clicks[i])
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance =
        intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length

      // Too consistent = bot-like (reduced from 25 to 10)
      if (variance < 50) score += 10
      // Too many rapid clicks (reduced from 20 to 8)
      if (intervals.filter((i) => i < 30).length > 5) score += 8
      // Perfect timing patterns (reduced from 15 to 5)
      if (intervals.filter((i) => i % 100 === 0).length > 3) score += 5
    }

    // 2. Pointer movement analysis
    const pointers = pointerSamplesRef.current
    if (pointers.length >= 20) {
      const velocities = []
      for (let i = 1; i < pointers.length; i++) {
        const dx = pointers[i].x - pointers[i - 1].x
        const dy = pointers[i].y - pointers[i - 1].y
        const dt = Math.max(1, pointers[i].t - pointers[i - 1].t)
        velocities.push(Math.sqrt(dx * dx + dy * dy) / dt)
      }

      // Check for linear movements (bot-like)
      let linearSegments = 0
      for (let i = 2; i < pointers.length; i++) {
        const p1 = pointers[i - 2],
          p2 = pointers[i - 1],
          p3 = pointers[i]
        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x)
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x)
        if (Math.abs(angle1 - angle2) < 0.05) linearSegments++
      }

      if (linearSegments > pointers.length * 0.9) score += 8

      // Check velocity consistency (too smooth = bot)
      const velocityVariance =
        velocities.reduce((sum, v, i, arr) => {
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length
          return sum + Math.pow(v - avg, 2)
        }, 0) / velocities.length

      if (velocityVariance < 0.05) score += 6
    }

    // 3. Key timing analysis
    const keyTimings = keyTimingsRef.current
    if (keyTimings.length >= 5) {
      const durations = keyTimings.map((k) => k.duration).filter((d) => d > 0)
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
        // Too consistent key press durations (reduced from 20 to 8)
        if (durations.every((d) => Math.abs(d - avgDuration) < 3)) score += 8
        // Inhuman fast releases (reduced from 25 to 10)
        if (durations.filter((d) => d < 5).length > 3) score += 10
      }
    }

    // 4. Focus pattern analysis
    const focusEvents = focusEventsRef.current
    if (focusEvents.length >= 4) {
      const focusLosses = focusEvents.filter((e) => e.type === "blur").length
      const totalEvents = focusEvents.length
      // Never losing focus might indicate automation (reduced from 15 to 5)
      if (focusLosses === 0 && totalEvents > 15) score += 5
    }

    // 5. Suspicious pattern accumulation
    const patterns = Array.from(behaviorPatternsRef.current)
    score += patterns.length * 5

    // 6. Enhanced headless detection
    try {
      if ((navigator as any).webdriver) score += 30
      if ((window as any).phantom) score += 30
      if ((window as any).callPhantom) score += 30
      if ((window as any)._phantom) score += 30
      if ((navigator as any).permissions?.query) {
        score += 2
      }
    } catch {}

    return Math.min(100, score)
  }, [])

  // Enhanced risk computation
  const computeRiskScore = useCallback(() => {
    let score = computeAdvancedBehaviorScore()

    // Add challenge failure penalty
    const failureRate =
      persistedRef.current.challengesFailed /
      Math.max(1, persistedRef.current.challengesPassed + persistedRef.current.challengesFailed)
    if (failureRate > 0.3) score += 20

    // Add daily activity penalty for excessive rounds
    if (persistedRef.current.dailyRounds > maxDailyRounds * 0.8) score += 15

    // Session length penalty (too long sessions are suspicious)
    const sessionMinutes = (now() - sessionStartRef.current) / (1000 * 60)
    if (sessionMinutes > sessionMaxMinutes * 0.9) score += 10

    return Math.max(0, Math.min(100, Math.round(score)))
  }, [computeAdvancedBehaviorScore, maxDailyRounds, sessionMaxMinutes])

  // Enhanced verdict system
  const updateVerdict = useCallback(
    (rs: number) => {
      // Check for hard blocks first
      if (sessionStorage.getItem(sessionBlockedKey)) {
        setVerdict("blocked")
        onVerdict?.("blocked")
        return "blocked"
      }

      if (softBlockUntilRef.current && softBlockUntilRef.current > now()) {
        setVerdict("blocked")
        onVerdict?.("blocked")
        return "blocked"
      }

      // Check daily limits
      if (persistedRef.current.dailyRounds >= maxDailyRounds) {
        setVerdict("blocked")
        onVerdict?.("blocked")
        return "blocked"
      }

      // Enhanced verdict logic
      const lastPassedRaw = sessionStorage.getItem(sessionChallengePassKey)
      const lastPassed = lastPassedRaw ? Number.parseInt(lastPassedRaw, 10) : 0
      const recentlyPassed = lastPassed && now() - lastPassed < 1000 * 60 * 30 // 30 minutes

      if (rs >= suspicionThreshold) {
        setVerdict("bot-likely")
        onVerdict?.("bot-likely")
        return "bot-likely"
      }

      if (rs < suspicionThreshold / 3 && recentlyPassed) {
        setVerdict("human-likely")
        onVerdict?.("human-likely")
        return "human-likely"
      }

      setVerdict("unknown")
      onVerdict?.("unknown")
      return "unknown"
    },
    [onVerdict, sessionBlockedKey, sessionChallengePassKey, suspicionThreshold, maxDailyRounds],
  )

  // Continuous risk assessment
useEffect(() => {
  const id = setInterval(() => {
    const rs = computeRiskScore()
    setRiskScore(rs)
    const verdict = updateVerdict(rs)

    const lastPass = sessionStorage.getItem(sessionChallengePassKey)
    const passedRecently = lastPass && now() - Number.parseInt(lastPass, 10) < 1000 * 60 * 30
    const hasGoodBehavior =
      rs <= suspicionThreshold * 0.7 &&
      clickTimestampsRef.current.length >= 1 &&
      pointerSamplesRef.current.length >= 10

    const isEligible = passedRecently || hasGoodBehavior
    setEligible(isEligible)
    onEligibleChange?.(isEligible)
  }, 2000) // Check every 2 seconds

  return () => clearInterval(id)
}, [computeRiskScore, updateVerdict, maxDailyRounds, suspicionThreshold, onEligibleChange])

// ===== Server sync (send telemetry) =====
const pushTelemetry = useCallback(async (payload: {
  riskScore: number
  verdict: GuardVerdict
  eligible: boolean
}) => {
  const nowTs = Date.now()
  // ابعت كل 5 ثواني بحد أقصى
  if (nowTs - (lastSentRef.current || 0) < 5000) return
  lastSentRef.current = nowTs

  try {
    await fetch("/api/antibot/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // تجاهل أخطاء الشبكة
  }
}, [])

useEffect(() => {
  pushTelemetry({ riskScore, verdict, eligible })
}, [riskScore, verdict, eligible, pushTelemetry])
// ===== End Server sync =====

  // Enhanced challenge system
  const presentChallenge = useCallback(
    (
      forcedType?: number,
      difficulty?: number,
    ): Promise<{
      result: ChallengeResult
      info?: any
    }> => {
      if (sessionStorage.getItem(sessionBlockedKey)) {
        return Promise.resolve({ result: "failed", info: "session-blocked" })
      }

      return new Promise((resolve) => {
        challengeModalResolveRef.current = resolve
        setChallengeAttemptsLeft(3)
        setChallengeType(typeof forcedType === "number" ? forcedType : cryptoRandomInt(4)) // 0-3 for 4 challenge types
        setChallengeDifficulty(difficulty || Math.min(3, Math.floor(persistedRef.current.challengesFailed / 2) + 1))
        setChallengeOpen(true)
      })
    },
    [sessionBlockedKey],
  )

  const onChallengeFinish = useCallback(
    (result: ChallengeResult, info?: any) => {
      setChallengeOpen(false)
      const resolve = challengeModalResolveRef.current
      challengeModalResolveRef.current = null

      if (result === "passed") {
        persistedRef.current.challengesPassed++
        setRiskScore((prev) => Math.max(0, prev - 30))
        sessionStorage.setItem(sessionChallengePassKey, String(now()))
        setEligible(true)
        onEligibleChange?.(true)
      } else if (result === "failed") {
        persistedRef.current.challengesFailed++

        // Progressive punishment
        if (persistedRef.current.challengesFailed >= 3) {
          sessionStorage.setItem(sessionBlockedKey, "1")
          softBlockUntilRef.current = now() + 1000 * 60 * 60 * 24 // 24 hour block
        }

        setEligible(false)
        onEligibleChange?.(false)
      }

      resolve?.({ result, info })
      updateVerdict(computeRiskScore())
    },
    [computeRiskScore, onEligibleChange, sessionBlockedKey, sessionChallengePassKey, updateVerdict],
  )

  // Enhanced challenge components
  function MathChallenge({
  onResult,
  difficulty,
}: { onResult: (res: "passed" | "failed") => void; difficulty: number }) {
  // keep numbers small & human-friendly, but scale slightly with difficulty
  const maxBase = Math.max(6, 8 + (difficulty - 1) * 4)

  const [problem] = useState(() => {
    let a = cryptoRandomInt(maxBase) + 1
    let b = cryptoRandomInt(maxBase) + 1
    // only + and - to keep it trivial for humans
    const operations: Array<"+" | "-"> = ["+", "-"]
    let op = operations[cryptoRandomInt(operations.length)]

    // avoid negative answers for readability: ensure a >= b when subtraction
    if (op === "-" && a < b) {
      ;[a, b] = [b, a]
    }

    const answer = op === "+" ? a + b : a - b
    return { a, b, op, answer }
  })

  // build 3 clickable options (one correct, two plausible distractors)
  const [options] = useState(() => {
    const correct = problem.answer
    const wrongs = new Set<number>()
    while (wrongs.size < 2) {
      // distractors are +/- small deltas so they feel plausible
      const delta = (cryptoRandomInt(4) + 1) * (cryptoRandomInt(2) === 0 ? -1 : 1)
      const cand = correct + delta
      if (cand !== correct && cand >= 0) wrongs.add(cand)
    }
    // shuffle (shuffle helper exists in file); if not, fallback to simple shuffle
    const arr = [correct, ...Array.from(wrongs)]
    if (typeof shuffle === "function") return shuffle(arr)
    // simple Fisher-Yates fallback
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })

  const startRef = useRef<number>(now())
  useEffect(() => {
    // reset timer when component mounts
    startRef.current = now()
  }, [])

  const handleChoose = (val: number) => {
    const reactionTime = now() - startRef.current
    // record latency for behavior analysis (existing ref in file)
    try {
      reactionLatenciesRef.current.push(reactionTime)
    } catch {}

    // mark suspicious if solved impossibly fast
    if (reactionTime < 700) {
      try {
        behaviorPatternsRef.current.add("too_fast_math")
      } catch {}
    }

    onResult(val === problem.answer ? "passed" : "failed")
  }

  return (
    <div className="p-4 text-center">
      <div className="text-lg font-semibold mb-2">Quick check</div>
      <div className="text-2xl font-mono bg-gray-800 p-3 rounded mb-4">
        {problem.a} {problem.op} {problem.b} = ?
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleChoose(opt)}
            className="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 text-white"
            aria-label={`option-${i}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}


function EmojiOddOneOut({
  onResult,
  difficulty,
}: { onResult: (res: "passed" | "failed") => void; difficulty: number }) {
  const emojis = ["🐶", "🐱", "🐭", "🐰", "🐸"]
  const [startTime] = useState(Date.now())

  // نختار الرموز
  const [items] = useState(() => {
    const base = emojis[cryptoRandomInt(emojis.length)]
    let odd = emojis[cryptoRandomInt(emojis.length)]
    while (odd === base) {
      odd = emojis[cryptoRandomInt(emojis.length)]
    }

    const arr = Array(3 + difficulty).fill(base)
    const oddIndex = cryptoRandomInt(arr.length)
    arr[oddIndex] = odd
    return { arr, oddIndex }
  })

  const handleClick = (i: number) => {
    const reactionTime = Date.now() - startTime
    try {
      reactionLatenciesRef.current.push(reactionTime)
    } catch {}

    if (reactionTime < 400) {
      try {
        behaviorPatternsRef.current.add("too_fast_odd_click")
      } catch {}
    }

    onResult(i === items.oddIndex ? "passed" : "failed")
  }

  return (
    <div className="p-4 text-center">
      <div className="text-lg font-semibold mb-4">Which one is different?</div>
      <div className="flex justify-center gap-4 flex-wrap">
        {items.arr.map((emoji, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="text-3xl p-4 border rounded hover:bg-gray-100 focus:outline-none focus:ring-2"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}



  // Existing challenge components (enhanced)
 function OddOneOut({
  onResult,
  difficulty,
}: { onResult: (res: "passed" | "failed") => void; difficulty: number }) {
  // عدد العناصر دايمًا زوجي أو مربع (4 أو 6 أو 9)
  const gridSize = Math.min(9, 4 + difficulty * 2) // 4, 6, 8… capped at 9

  const [items] = useState(() => {
    const emojis = ["🍎", "🍌", "🍇", "🍓", "🍉", "🍊"]
    const base = emojis[cryptoRandomInt(emojis.length)]
    let odd: string
    do {
      odd = emojis[cryptoRandomInt(emojis.length)]
    } while (odd === base)

    const grid = Array(gridSize).fill(base)
    const oddIndex = cryptoRandomInt(gridSize)
    grid[oddIndex] = odd
    return grid
  })

  const [startTime] = useState(now())

  const handleClick = (index: number) => {
    const reactionTime = now() - startTime
    try {
      reactionLatenciesRef.current.push(reactionTime)
    } catch {}

    if (reactionTime < 500) {
      try {
        behaviorPatternsRef.current.add("too_fast_oddone_click")
      } catch {}
    }

    const isOdd = items[index] !== items[0]
    onResult(isOdd ? "passed" : "failed")
  }

  return (
    <div className="p-4 text-center">
      <div className="mb-3 text-lg font-semibold">Find the different fruit</div>
      <div
        className="grid gap-2 justify-center"
        style={{
          gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(gridSize))}, 1fr)`,
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="p-3 border rounded bg-black hover:bg-gray-100 focus:outline-none focus:ring-2"
          >
            <span style={{ fontSize: 28 }}>{item}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


function SymbolTarget({
  onResult,
  difficulty,
}: { onResult: (res: "passed" | "failed") => void; difficulty: number }) {
  const symbols = ["★", "♞", "☂", "✈", "♻", "⚑", "♫", "⚡", "❤", "☕", "⚓", "✉", "☀"]
  const gridSize = Math.min(symbols.length, 4 + difficulty * 2)

  // نختار الرمز المستهدف
  const [targetSymbol] = useState(() => symbols[cryptoRandomInt(symbols.length)])

  const [items] = useState(() => {
    // ناخد رموز عشوائية مختلفة غير الرمز المستهدف
    let pool = symbols.filter((s) => s !== targetSymbol)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, gridSize - 1)

    // نضيف الرمز الهدف وسطهم
    const grid = [...pool.map((s) => ({ symbol: s }))]
    const targetIndex = cryptoRandomInt(gridSize)
    grid.splice(targetIndex, 0, { symbol: targetSymbol })

    return grid
  })

  const [timeLeft, setTimeLeft] = useState(5 + difficulty)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onResult("failed")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onResult])

  const handleClick = (index: number) => {
    const reactionTime = Date.now() - startTime
    try {
      reactionLatenciesRef.current.push(reactionTime)
    } catch {}

    const item = items[index]
    const correct = item.symbol === targetSymbol
    onResult(correct ? "passed" : "failed")
  }

  return (
    <div className="p-4 text-center">
      <div className="mb-3 text-lg font-semibold">
        Click the <span className="font-bold">{targetSymbol}</span> (Time: {timeLeft}s)
      </div>
      <div
        className="grid gap-2 justify-center"
        style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(items.length))}, 1fr)` }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-12 h-12 border rounded flex items-center justify-center text-2xl hover:scale-105 transition-transform focus:outline-none focus:ring-2"
          >
            {item.symbol}
          </button>
        ))}
      </div>
    </div>
  )
}


  // Challenge modal
  function ChallengeModal() {
    const modalRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      return focusTrap(modalRef.current)
    }, [challengeOpen])

    const handleResult = (res: "passed" | "failed") => {
      if (res === "passed") {
        onChallengeFinish("passed")
      } else {
        setChallengeAttemptsLeft((prev) => {
          const newAttempts = prev - 1
          if (newAttempts <= 0) {
            onChallengeFinish("failed")
          } else {
            // Increase difficulty and rotate challenge type
            setChallengeDifficulty((prev) => Math.min(3, prev + 1))
            setChallengeType((prev) => (prev + 1) % 4)
          }
          return newAttempts
        })
      }
    }

    if (!challengeOpen) return null

    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 "
      >
        <div
          ref={modalRef}
          className="w-full max-w-md bg-gradient-to-br from-pink-700 via-blue-800 to-pink-900 rounded-xl 
          shadow-xl p-4 focus:outline-none"
          tabIndex={-1}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-200">
              Attempts: {challengeAttemptsLeft}/3 | Level: {challengeDifficulty}
            </div>
          </div>

          <div className="mb-4">
            {challengeType === 0 && <OddOneOut onResult={handleResult} difficulty={challengeDifficulty} />}
            {challengeType === 1 && <SymbolTarget onResult={handleResult} difficulty={challengeDifficulty} />}
            {challengeType === 2 && <MathChallenge onResult={handleResult} difficulty={challengeDifficulty} />}
            {challengeType === 3 && <EmojiOddOneOut onResult={handleResult} difficulty={challengeDifficulty} />}
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Risk Score: {riskScore}/100</span>
            <button
              className="px-3 py-1 rounded border text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2"
              onClick={() => onChallengeFinish("failed")}
            >
              Give Up
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced round management
  const markRoundEnd = useCallback(() => {
    const nowTs = now()

    // Check daily limits
    if (persistedRef.current.dailyRounds >= maxDailyRounds) {
      sessionStorage.setItem(sessionBlockedKey, "1")
      setVerdict("blocked")
      onVerdict?.("blocked")
      return
    }

    // Session age check
    if (!sessionStartRef.current) sessionStartRef.current = nowTs
    const minutes = (nowTs - sessionStartRef.current) / (1000 * 60)
    if (minutes > sessionMaxMinutes) {
      softBlockUntilRef.current = nowTs + 1000 * 60 * 60 * 12 // 12 hour cooldown
      sessionStorage.setItem(sessionBlockedKey, "1")
      setEligible(false)
      setVerdict("blocked")
      onEligibleChange?.(false)
      onVerdict?.("blocked")
      return
    }

    // Enhanced cooldown enforcement
    if (lastRoundEndRef.current) {
      const diff = (nowTs - lastRoundEndRef.current) / 1000
      if (diff < cooldownSeconds) {
        setRiskScore((prev) => Math.min(100, prev + 15))
        behaviorPatternsRef.current.add("cooldown_violation")

        setCooldownRemaining(Math.ceil(cooldownSeconds - diff))
        if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current)

        let rem = Math.ceil(cooldownSeconds - diff)
        cooldownTimerRef.current = window.setInterval(() => {
          rem -= 1
          setCooldownRemaining(rem > 0 ? rem : 0)
          if (rem <= 0 && cooldownTimerRef.current) {
            window.clearInterval(cooldownTimerRef.current)
            cooldownTimerRef.current = null
          }
        }, 1000)
        return // Don't allow round to complete
      }
    }

    // Update counters
    roundsRef.current += 1
    persistedRef.current.roundsCompleted = roundsRef.current
    persistedRef.current.dailyRounds += 1
    persistedRef.current.lastDailyReset = new Date().setHours(0, 0, 0, 0)
    lastRoundEndRef.current = nowTs
    persistedRef.current.lastRoundEnd = lastRoundEndRef.current

    // Challenge requirement logic
    const shouldChallenge =
      roundsRef.current % challengeInterval === 0 ||
      riskScore >= suspicionThreshold * 0.8 ||
      persistedRef.current.dailyRounds % 10 === 0 // Every 10 daily rounds

    if (shouldChallenge) {
      ;(async () => {
        const res = await presentChallenge()
        setEligible(res.result === "passed")
        onEligibleChange?.(res.result === "passed")
      })()
    } else {
      // Update eligibility based on current state
      const lastPass = sessionStorage.getItem(sessionChallengePassKey)
      const passedRecently = lastPass && now() - Number.parseInt(lastPass, 10) < 1000 * 60 * 30
      const currentRisk = computeRiskScore()

      // Allow eligibility for users with good behavioral data
      const hasGoodBehavior =
        currentRisk <= suspicionThreshold * 0.7 &&
        clickTimestampsRef.current.length >= 1 &&
        pointerSamplesRef.current.length >= 10

      if (currentRisk >= suspicionThreshold) {
        setEligible(false)
        onEligibleChange?.(false)
      } else {
        const isEligible = passedRecently || hasGoodBehavior
        setEligible(isEligible)
        onEligibleChange?.(isEligible)
      }
    }

    const rs = computeRiskScore()
    setRiskScore(rs)
    updateVerdict(rs)
  }, [
    challengeInterval,
    computeRiskScore,
    presentChallenge,
    sessionBlockedKey,
    sessionChallengePassKey,
    sessionMaxMinutes,
    suspicionThreshold,
    updateVerdict,
    onEligibleChange,
    onVerdict,
    maxDailyRounds,
    riskScore,
  ])

  const requireChallenge = useCallback(async (): Promise<boolean> => {
    const res = await presentChallenge()
    return res.result === "passed"
  }, [presentChallenge])

  const getBehaviorAnalysis = useCallback(() => {
    const patterns = Array.from(behaviorPatternsRef.current)
    const confidence = Math.min(100, patterns.length * 10 + clickTimestampsRef.current.length * 2)

    return {
      patterns,
      confidence,
    }
  }, [])

  // Reset function for development
  useEffect(() => {
    ;(window as any).__AntiBotGuard = (window as any).__AntiBotGuard || {}
    ;(window as any).__AntiBotGuard.reset = () => {
      try {
        localStorage.removeItem(storageKey)
        localStorage.removeItem(deviceFingerprintKey)
        sessionStorage.removeItem(sessionBlockedKey)
        sessionStorage.removeItem(sessionChallengePassKey)

        persistedRef.current = {
          roundsCompleted: 0,
          dailyRounds: 0,
          challengesPassed: 0,
          challengesFailed: 0,
          suspiciousPatterns: [],
        }

        roundsRef.current = 0
        dailyRoundsRef.current = 0
        lastRoundEndRef.current = undefined
        sessionStartRef.current = now()
        softBlockUntilRef.current = undefined

        // Clear behavioral data
        clickTimestampsRef.current = []
        pointerSamplesRef.current = []
        keyTimingsRef.current = []
        focusEventsRef.current = []
        scrollPatternsRef.current = []
        reactionLatenciesRef.current = []
        behaviorPatternsRef.current.clear()

        setRiskScore(0)
        setVerdict("unknown")
        setEligible(false)
        setCooldownRemaining(0)
        setDailyRoundsRemaining(maxDailyRounds)

        console.log("AntiBotGuard state reset successfully")
      } catch (e) {
        console.error("Failed to reset AntiBotGuard:", e)
      }
    }
  }, [sessionBlockedKey, storageKey, deviceFingerprintKey, maxDailyRounds])

  // Initial eligibility check
  useEffect(() => {
    const lastPass = sessionStorage.getItem(sessionChallengePassKey)
    const passedRecently = lastPass && now() - Number.parseInt(lastPass, 10) < 1000 * 60 * 30
    const blocked = Boolean(sessionStorage.getItem(sessionBlockedKey))
    const dailyLimitReached = persistedRef.current.dailyRounds >= maxDailyRounds
    const currentRisk = computeRiskScore()

    // Allow eligibility for users with good behavioral data even without recent challenge pass
    const hasGoodBehavior =
      currentRisk <= suspicionThreshold * 0.7 &&
      clickTimestampsRef.current.length >= 1 &&
      pointerSamplesRef.current.length >= 10

    if (blocked || dailyLimitReached) {
      setEligible(false)
      setVerdict("blocked")
      onEligibleChange?.(false)
      onVerdict?.("blocked")
    } else {
      // User is eligible if they recently passed a challenge OR have good behavioral data
      const isEligible = passedRecently || hasGoodBehavior
      setEligible(isEligible)
      setDailyRoundsRemaining(maxDailyRounds - persistedRef.current.dailyRounds)
      onEligibleChange?.(isEligible)
    }
  }, [onEligibleChange, onVerdict, sessionBlockedKey, maxDailyRounds, computeRiskScore, suspicionThreshold])

  // Enhanced commitPersist function
  const commitPersist = useCallback(() => {
    const px: PersistState = {
      roundsCompleted: roundsRef.current,
      dailyRounds: persistedRef.current.dailyRounds,
      lastRoundEnd: lastRoundEndRef.current,
      sessionStart: sessionStartRef.current,
      softBlockUntil: softBlockUntilRef.current,
      behaviorScore: riskScore,
      lastDailyReset: persistedRef.current.lastDailyReset,
      challengesPassed: persistedRef.current.challengesPassed,
      challengesFailed: persistedRef.current.challengesFailed,
      deviceFingerprint: deviceFingerprintRef.current,
      suspiciousPatterns: Array.from(behaviorPatternsRef.current),
    }
    savePersist(storageKey, px)
  }, [storageKey, riskScore])

  // State object
  const state = useMemo<AntiBotState>(
    () => ({
      eligible,
      verdict,
      riskScore,
      cooldownRemaining,
      dailyRoundsRemaining,
      requireChallenge,
      markRoundEnd,
      getBehaviorAnalysis,
      resetState: () => {
        ;(window as any).__AntiBotGuard?.reset?.()
      },
    }),
    [
      eligible,
      verdict,
      riskScore,
      cooldownRemaining,
      dailyRoundsRemaining,
      requireChallenge,
      markRoundEnd,
      getBehaviorAnalysis,
    ],
  )

  return (
    <AntiBotContext.Provider value={state}>
      <div className="min-h-0">
        {children}
        <ChallengeModal />
      </div>
    </AntiBotContext.Provider>
  )
}
