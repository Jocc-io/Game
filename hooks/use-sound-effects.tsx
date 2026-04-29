"use client"

import { useEffect, useRef, useState } from "react"

type SoundType = "move" | "rotate" | "drop" | "clear" | "levelup" | "gameover" | "powerup"

interface SoundPack {
  name: string
  sounds: Record<SoundType, string>
}

// Sound packs - in a real app, these would be actual sound files
const SOUND_PACKS: Record<string, SoundPack> = {
  default: {
    name: "Default",
    sounds: {
      move: "/sounds/default/move.mp3",
      rotate: "/sounds/default/rotate.mp3",
      drop: "/sounds/default/drop.mp3",
      clear: "/sounds/default/clear.mp3",
      levelup: "/sounds/default/levelup.mp3",
      gameover: "/sounds/default/gameover.mp3",
      powerup: "/sounds/default/powerup.mp3",
    },
  },
  retro_sounds: {
    name: "Retro Arcade",
    sounds: {
      move: "/sounds/retro/move.mp3",
      rotate: "/sounds/retro/rotate.mp3",
      drop: "/sounds/retro/drop.mp3",
      clear: "/sounds/retro/clear.mp3",
      levelup: "/sounds/retro/levelup.mp3",
      gameover: "/sounds/retro/gameover.mp3",
      powerup: "/sounds/retro/powerup.mp3",
    },
  },
  futuristic_sounds: {
    name: "Futuristic",
    sounds: {
      move: "/sounds/futuristic/move.mp3",
      rotate: "/sounds/futuristic/rotate.mp3",
      drop: "/sounds/futuristic/drop.mp3",
      clear: "/sounds/futuristic/clear.mp3",
      levelup: "/sounds/futuristic/levelup.mp3",
      gameover: "/sounds/futuristic/gameover.mp3",
      powerup: "/sounds/futuristic/powerup.mp3",
    },
  },
  nature_sounds: {
    name: "Nature Zen",
    sounds: {
      move: "/sounds/nature/move.mp3",
      rotate: "/sounds/nature/rotate.mp3",
      drop: "/sounds/nature/drop.mp3",
      clear: "/sounds/nature/clear.mp3",
      levelup: "/sounds/nature/levelup.mp3",
      gameover: "/sounds/nature/gameover.mp3",
      powerup: "/sounds/nature/powerup.mp3",
    },
  },
}

export function useSoundEffects(soundPack = "default", enabled = true) {
  const [isMuted, setIsMuted] = useState(!enabled)
  const audioContextRef = useRef<AudioContext | null>(null)
  const initializedRef = useRef(false)

  // Initialize Web Audio API context
  useEffect(() => {
    // Only create AudioContext when needed (on user interaction)
    // This avoids the "AudioContext was not allowed to start" error
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Play a sound effect using Web Audio API
  const playSound = (type: SoundType) => {
    if (isMuted) return

    try {
      // Create AudioContext on demand (requires user interaction first)
      if (!audioContextRef.current && !initializedRef.current) {
        initializedRef.current = true
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        } catch (e) {
          console.log("Could not initialize AudioContext:", e)
          return
        }
      }

      const ctx = audioContextRef.current
      if (!ctx) return

      // Create oscillator for simple sound effects
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      // Configure sound based on type
      switch (type) {
        case "move":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(220, ctx.currentTime)
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
          break
        case "rotate":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(330, ctx.currentTime)
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
          break
        case "drop":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(440, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          break
        case "clear":
          oscillator.type = "square"
          oscillator.frequency.setValueAtTime(440, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          break
        case "levelup":
          oscillator.type = "sawtooth"
          oscillator.frequency.setValueAtTime(220, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          break
        case "gameover":
          oscillator.type = "sawtooth"
          oscillator.frequency.setValueAtTime(880, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
          break
        case "powerup":
          oscillator.type = "sine"
          oscillator.frequency.setValueAtTime(440, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
          oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.2)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          break
      }

      // Connect and start
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 1)
    } catch (e) {
      console.log("Sound playback not available:", e)
    }
  }

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  return {
    playSound,
    isMuted,
    toggleMute,
    setMuted: setIsMuted,
  }
}
