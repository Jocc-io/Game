"use client"

import { useState, useEffect, useRef, useCallback } from "react"
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

 // ---- Game constants (dependent on isMobile) ----
  const CANVAS_WIDTH = isMobile ? 360 : 600
  const CANVAS_HEIGHT = isMobile ? 400 : 500
  const PLAYER_WIDTH = 40
  const PLAYER_HEIGHT = isMobile ? 15 : 20
  const PLAYER_SPEED = 5
  const BULLET_WIDTH = 3  
  const BULLET_HEIGHT = isMobile ? 10 : 15
  const BULLET_SPEED = isMobile ? 5 : 7
  const INVADER_WIDTH = isMobile ? 20 : 30
  const INVADER_HEIGHT = isMobile ? 20 : 30
  const INVADER_ROWS = isMobile ? 4 : 5
  const INVADER_COLS = isMobile ? 8 : 10
  const INVADER_PADDING = isMobile ? 8 : 10
  const INVADER_DROP = isMobile ? 5 : 20
  const INVADER_SPEED = 2
interface SpaceInvadersGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

type Bullet = { x: number; y: number; active: boolean }
type Invader = { x: number; y: number; active: boolean; type: number }
type EnemyBullet = { x: number; y: number; active: boolean }
type Explosion = { x: number; y: number; size: number; life: number; maxLife: number }

export default function SpaceInvadersGame({ onGameOver, soundEffects }: SpaceInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 🟢 Responsive check
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize() // أول مرة
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

 

  // ---- React state (UI) ----
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  // Mirror state into refs when needed elsewhere without causing re-renders
  const scoreRef = useRef(score)
  const livesRef = useRef(lives)
  const levelRef = useRef(level)
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { livesRef.current = lives }, [lives])
  useEffect(() => { levelRef.current = level }, [level])

  // ---- Game refs (mutable) ----
  const playerX = useRef(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2)
  const bullets = useRef<Bullet[]>([])
  const invaders = useRef<Invader[]>([])
  const enemyBullets = useRef<EnemyBullet[]>([])
  const explosions = useRef<Explosion[]>([])
  const invaderDirection = useRef(1)
  const invaderSpeed = useRef(INVADER_SPEED)
  const lastEnemyBulletTime = useRef(0)
  const enemyBulletRate = useRef(1500)
  const leftPressed = useRef(false)
  const rightPressed = useRef(false)
  const spacePressed = useRef(false)
  const lastBulletTime = useRef(0)
  const bulletCooldown = useRef(300)

  // RAF control
  const animationFrameId = useRef<number | null>(null)
  const runningRef = useRef(false)


  // ---- Loop control helpers ----
  const stopLoop = useCallback(() => {
    runningRef.current = false
    const id = animationFrameId.current
    if (id !== null) {
      cancelAnimationFrame(id)
      animationFrameId.current = null
    }
  }, [])

  const startLoop = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    animationFrameId.current = requestAnimationFrame(gameLoop)
  }, [])

  // ---- Initialize game ----
  useEffect(() => {
    initializeGame()
    return () => {
      stopLoop()
      // no need to reset other refs on unmount
      window.removeEventListener("keydown", noopKeydown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
const totalInvadersWidth = INVADER_COLS * (INVADER_WIDTH + INVADER_PADDING) - INVADER_PADDING
const xOffset = (CANVAS_WIDTH - totalInvadersWidth) / 2
  const initializeGame = () => {
    // Reset player and entities
    playerX.current = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2
    bullets.current = []
    enemyBullets.current = []
    explosions.current = []

    // Build invaders grid
    const newInvaders: Invader[] = []
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        newInvaders.push({
          x: col * (INVADER_WIDTH + INVADER_PADDING) + xOffset,
          y: row * (INVADER_HEIGHT + INVADER_PADDING) + 50,
          active: true,
          type: row % 3,
        })
      }
    }
    invaders.current = newInvaders

    // Reset movement & difficulty
    invaderDirection.current = 1
    invaderSpeed.current = INVADER_SPEED
    enemyBulletRate.current = 1500

    // Reset UI state + mirror refs immediately (avoid 1-frame stale draw)
    setIsGameOver(false)
    setIsPaused(false)
    setLevel(1)
    levelRef.current = 1
    setLives(3)
    livesRef.current = 3
    setScore(0)
    scoreRef.current = 0

    // Start fresh loop
    stopLoop()
    startLoop()
  }

  // ---- Keyboard handlers (respect pause) ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling with arrows/space
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault()

      // Toggle pause with P always (even if already paused or game over)
      if (e.key.toLowerCase() === "p") {
        togglePause()
        return
      }

      // Ignore gameplay keys while paused or game over
      if (isPaused || isGameOver) return

      if (e.key === "ArrowLeft") leftPressed.current = true
      if (e.key === "ArrowRight") rightPressed.current = true
      if (e.key === " ") spacePressed.current = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault()
      if (e.key === "ArrowLeft") leftPressed.current = false
      if (e.key === "ArrowRight") rightPressed.current = false
      if (e.key === " ") spacePressed.current = false
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false })
    window.addEventListener("keyup", handleKeyUp, { passive: false })
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [isPaused, isGameOver])

  // Helper for cleanup on mount effect above
  const noopKeydown = (_e: KeyboardEvent) => {}

  // ---- Pause/Resume ----
  const togglePause = () => {
    setIsPaused((prev) => {
      const next = !prev
      if (next) {
        // Pause: stop RAF immediately so update/draw halt
        stopLoop()
        // soundEffects?.("pause")
      } else {
        // Resume: restart RAF
        if (!isGameOver) startLoop()
        // soundEffects?.("resume")
      }
      return next
    })
  }

  // Auto-pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !isGameOver) {
        if (!isPaused) setIsPaused(true)
        stopLoop()
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [isPaused, isGameOver, stopLoop])

  // ---- Shooting ----
  const fireBullet = () => {
    const now = Date.now()
    if (now - lastBulletTime.current > bulletCooldown.current) {
      bullets.current.push({
        x: playerX.current + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: CANVAS_HEIGHT - PLAYER_HEIGHT - 10,
        active: true,
      })
      lastBulletTime.current = now
      soundEffects?.("move")
    }
  }

  const fireEnemyBullet = () => {
    const now = Date.now()
    if (now - lastEnemyBulletTime.current > enemyBulletRate.current) {
      const activeInvaders = invaders.current.filter((i) => i.active)
      if (activeInvaders.length > 0) {
        const inv = activeInvaders[Math.floor(Math.random() * activeInvaders.length)]
        enemyBullets.current.push({
          x: inv.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: inv.y + INVADER_HEIGHT,
          active: true,
        })
        lastEnemyBulletTime.current = now
      }
    }
  }

  // ---- Particles ----
  const addExplosion = (x: number, y: number, size: number) => {
    explosions.current.push({ x, y, size, life: 20, maxLife: 20 })
  }

  // ---- Game Update ----
  const updateGame = () => {
    // Player movement
    if (leftPressed.current && playerX.current > 0) playerX.current -= PLAYER_SPEED
    if (rightPressed.current && playerX.current < CANVAS_WIDTH - PLAYER_WIDTH) playerX.current += PLAYER_SPEED

    // Shooting
    if (spacePressed.current) fireBullet()

    // Player bullets
    bullets.current.forEach((b) => {
      if (!b.active) return
      b.y -= BULLET_SPEED
      if (b.y < 0) b.active = false

      invaders.current.forEach((inv) => {
        if (
          inv.active &&
          b.x < inv.x + INVADER_WIDTH &&
          b.x + BULLET_WIDTH > inv.x &&
          b.y < inv.y + INVADER_HEIGHT &&
          b.y + BULLET_HEIGHT > inv.y
        ) {
          inv.active = false
          b.active = false
          const points = (3 - inv.type) * 5 * levelRef.current
          setScore((prev) => prev + points)
          addExplosion(inv.x + INVADER_WIDTH / 2, inv.y + INVADER_HEIGHT / 2, INVADER_WIDTH)
          soundEffects?.("clear")
        }
      })
    })
    bullets.current = bullets.current.filter((b) => b.active)

    // Enemy bullets
    enemyBullets.current.forEach((b) => {
      if (!b.active) return
      b.y += BULLET_SPEED
      if (b.y > CANVAS_HEIGHT) b.active = false

      const hitPlayer =
        b.x < playerX.current + PLAYER_WIDTH &&
        b.x + BULLET_WIDTH > playerX.current &&
        b.y < CANVAS_HEIGHT &&
        b.y + BULLET_HEIGHT > CANVAS_HEIGHT - PLAYER_HEIGHT

      if (hitPlayer) {
        b.active = false
        loseLife()
        addExplosion(playerX.current + PLAYER_WIDTH / 2, CANVAS_HEIGHT - PLAYER_HEIGHT / 2, PLAYER_WIDTH)
      }
    })
    enemyBullets.current = enemyBullets.current.filter((b) => b.active)

    // Enemy fire
    fireEnemyBullet()

    // Invaders movement
    let shouldChangeDirection = false
    let allDestroyed = true
    invaders.current.forEach((inv) => {
      if (!inv.active) return
      allDestroyed = false
      inv.x += invaderSpeed.current * invaderDirection.current
      if (
        (invaderDirection.current === 1 && inv.x + INVADER_WIDTH > CANVAS_WIDTH) ||
        (invaderDirection.current === -1 && inv.x < 0)
      ) {
        shouldChangeDirection = true
      }
      if (inv.y + INVADER_HEIGHT > CANVAS_HEIGHT - PLAYER_HEIGHT - 20) {
        gameOver()
      }
    })

    if (shouldChangeDirection) {
      invaderDirection.current *= -1
      invaders.current.forEach((inv) => {
        if (inv.active) inv.y += INVADER_DROP
      })
    }

    if (allDestroyed) levelUp()

    // Explosions decay
    explosions.current.forEach((ex) => ex.life--)
    explosions.current = explosions.current.filter((ex) => ex.life > 0)
  }

  // ---- Level/Lives/GameOver ----
  const levelUp = () => {
    setLevel((prev) => prev + 1)

    const newInvaders: Invader[] = []
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        newInvaders.push({
          x: col * (INVADER_WIDTH + INVADER_PADDING) + 50,
          y: row * (INVADER_HEIGHT + INVADER_PADDING) + 50,
          active: true,
          type: row % 3,
        })
      }
    }
    invaders.current = newInvaders

    invaderSpeed.current = INVADER_SPEED * (levelRef.current + 1)
    enemyBulletRate.current = 1500 / (levelRef.current + 1)
    soundEffects?.("levelup")
  }

  const loseLife = () => {
    setLives((prev) => {
      const next = prev - 1
      if (next <= 0) gameOver()
      else soundEffects?.("drop")
      return next
    })
  }

  const gameOver = () => {
    setIsGameOver(true)
    // Ensure the loop halts
    stopLoop()
    soundEffects?.("gameover")
  }

  // Notify parent after render
  useEffect(() => {
    if (isGameOver) onGameOver(scoreRef.current)
  }, [isGameOver, onGameOver])

  // ---- Mobile touch control functions ----
  const handleMoveLeft = useCallback(() => {
    if (isPaused || isGameOver) return
    leftPressed.current = true
    setTimeout(() => {
      leftPressed.current = false
    }, 100)
  }, [isPaused, isGameOver])

  const handleMoveRight = useCallback(() => {
    if (isPaused || isGameOver) return
    rightPressed.current = true
    setTimeout(() => {
      rightPressed.current = false
    }, 100)
  }, [isPaused, isGameOver])

  const handleShoot = useCallback(() => {
    if (isPaused || isGameOver) return
    fireBullet()
  }, [isPaused, isGameOver])

  // ---- RAF Game Loop ----
  const gameLoop = useCallback(() => {
    // If loop was stopped meanwhile, do nothing
    if (!runningRef.current) return

    // Update & draw one frame
    if (!isGameOver) {
      updateGame()
      drawGame()
    }

    // Queue next frame only if still running
    if (runningRef.current) {
      animationFrameId.current = requestAnimationFrame(gameLoop)
    }
  }, [isGameOver])

  // ---- Drawing ----
  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    drawStarsBackground(ctx)

    // Player (triangle ship)
    ctx.fillStyle = "#8b5cf6"
    ctx.beginPath()
    ctx.moveTo(playerX.current + PLAYER_WIDTH / 2, CANVAS_HEIGHT - PLAYER_HEIGHT)
    ctx.lineTo(playerX.current, CANVAS_HEIGHT)
    ctx.lineTo(playerX.current + PLAYER_WIDTH, CANVAS_HEIGHT)
    ctx.closePath()
    ctx.fill()

    // Player bullets
    ctx.fillStyle = "#f9a8d4"
    bullets.current.forEach((b) => b.active && ctx.fillRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT))

    // Enemy bullets
    ctx.fillStyle = "#ef4444"
    enemyBullets.current.forEach((b) => b.active && ctx.fillRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT))

    // Invaders (باستخدام إيموجي)
    ctx.font = "24px Arial"
    invaders.current.forEach((inv) => {
      if (!inv.active) return
      const emoji = inv.type === 0 ? "👾" : inv.type === 1 ? "🛸" : "🤖"
      ctx.fillText(emoji, inv.x, inv.y + 24)
    })

    // Explosions
    explosions.current.forEach((ex) => {
      const alpha = ex.life / ex.maxLife
      ctx.fillStyle = `rgba(255,0,0,${alpha})`
      ctx.beginPath()
      ctx.arc(ex.x, ex.y, ex.size, 0, Math.PI * 2)
      ctx.fill()
    })

    // NOTE: Score/Lives/Level are rendered in DOM HUD above the canvas now.
  }

  const drawStarsBackground = (ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * CANVAS_WIDTH
      const y = Math.random() * CANVAS_HEIGHT
      const r = Math.random() * 1.5
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ---- UI ----
  return (
    <div className="flex flex-col items-center">
      {/* HUD above the canvas */}
      <div
        className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 
      border-1 border-purple-900 rounded-xl shadow-lg shadow-indigo-700/20 
      bg-gradient-to-r from-indigo-500 to-gray-800 "
      >
        <div className="text-gray-300 text-lg font-bold">Score: {score}</div>
        <div className="text-gray-300 text-lg font-bold">Lives: {lives}</div>
        <div className="text-gray-300 text-lg font-bold">Level: {level}</div>
      </div>

      <div className="relative shadow-xl shadow-indigo-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 bg-black/50 rounded-xl"
        />

        {/* PAUSED overlay */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">PAUSED</div>
          </div>
        )}

        {/* GAME OVER overlay */}
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">GAME OVER</div>
          </div>
        )}
      </div>

      {/* Mobile touch controls */}
      <div className="md:hidden mt-4 w-full max-w-[600px]">
        <div className="grid grid-cols-3 gap-4 px-8">
          {/* Left Movement Button */}
          <button
            onTouchStart={handleMoveLeft}
            onClick={handleMoveLeft}
            className="bg-indigo-600/80 hover:bg-indigo-500/80 active:bg-indigo-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-indigo-400/50
                     shadow-lg shadow-indigo-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            ←
          </button>

          {/* Shoot Button */}
          <button
            onTouchStart={handleShoot}
            onClick={handleShoot}
            className="bg-pink-600/80 hover:bg-pink-500/80 active:bg-pink-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-pink-400/50
                     shadow-lg shadow-pink-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            🚀
          </button>

          {/* Right Movement Button */}
          <button
            onTouchStart={handleMoveRight}
            onClick={handleMoveRight}
            className="bg-indigo-600/80 hover:bg-indigo-500/80 active:bg-indigo-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-indigo-400/50
                     shadow-lg shadow-indigo-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            →
          </button>
        </div>

        {/* Pause Button Row */}
        <div className="flex justify-center mt-1 px-4">
         
        </div>
      </div>

        <div className="grid grid-cols-2 mt-4 gap-4 px-4">

        <button
          onClick={initializeGame}
          className="px-4 py-2 bg-pink-700 hover:bg-indigo-600 rounded-xl text-xs font-bold transition-colors "
        >
          Restart
        </button>
      
        <button
          onClick={togglePause}
          className="px-4 py-2 bg-indigo-700 hover:bg-violet-600 rounded-xl text-xs font-bold transition-colors "
          disabled={isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>


      </div>

    </div>
  )
}
