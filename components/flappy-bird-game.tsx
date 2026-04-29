"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Game constants with responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const CANVAS_WIDTH = isMobile ? 360 : 600
const CANVAS_HEIGHT = isMobile ? 400 : 500
const BIRD_SIZE = isMobile ? 15 : 25
const PIPE_WIDTH = isMobile ? 50 : 80
const GRAVITY = 0.6
const JUMP_FORCE = isMobile ? -6 : -8

interface FlappyBirdGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

type Bird = {
  x: number
  y: number
  velocity: number
  rotation: number
}

type Pipe = {
  x: number
  topHeight: number
  bottomY: number
  passed: boolean
}

type Particle = {
  x: number
  y: number
  velocity: { x: number; y: number }
  life: number
  color: string
  size: number
}

export default function FlappyBirdGame({ onGameOver, soundEffects }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [pipeSpeed, setPipeSpeed] = useState(isMobile ? 1 : 5)
  const [pipeGap, setPipeGap] = useState(isMobile ? 150 : 200)
  // Game state refs
  const bird = useRef<Bird>({
    x: CANVAS_WIDTH / 4,
    y: CANVAS_HEIGHT / 2,
    velocity: 0,
    rotation: 0
  })

  const pipes = useRef<Pipe[]>([])
  const particles = useRef<Particle[]>([])
  const animationFrameId = useRef<number | null>(null)
  const lastPipeTime = useRef(0)
  const pipeInterval = 2000 // ms
  const backgroundOffset = useRef(0)

  // Load best score from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flappyBirdBestScore")
      if (saved) setBestScore(parseInt(saved, 10))
    }
  }, [])

  // Save best score
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score)
      if (typeof window !== "undefined") {
        localStorage.setItem("flappyBirdBestScore", score.toString())
      }
    }
  }, [score, bestScore])
   useEffect(() => {
    if (score > 0 && score % 5 === 0) {
      setPipeSpeed(prev => Math.min(prev + 1, 18)) // سرعة لحد سقف
    }
    if (score > 0 && score % 8 === 0) {
      setPipeGap(prev => Math.max(prev - 10, 80)) // الفتحة ما تقلش عن 80
    }
  }, [score])

  // Initialize game
  const initializeGame = useCallback(() => {
    bird.current = {
      x: CANVAS_WIDTH / 4,
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      rotation: 0
    }
    pipes.current = []
    particles.current = []
    setScore(0)
    setIsGameOver(false)
    setIsPaused(false)
    setGameStarted(false)
    lastPipeTime.current = 0
    backgroundOffset.current = 0
     setPipeSpeed(isMobile ? 7 : 10)
    setPipeGap(isMobile ? 120 : 200)

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
    startGameLoop()
  }, [])

  useEffect(() => {
    initializeGame()
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
  }, [initializeGame])

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault()
        jump()
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault()
        setIsPaused(prev => !prev)
      }
    }

    const handleClick = () => {
      jump()
    }

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault()
      jump()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("click", handleClick)
    window.addEventListener("touchstart", handleTouch)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("touchstart", handleTouch)
    }
  }, [])

  const jump = () => {
    if (isGameOver) return
    
    if (!gameStarted) {
      setGameStarted(true)
    }
    
    bird.current.velocity = JUMP_FORCE
    bird.current.rotation = -30
    
    // Create jump particles
    for (let i = 0; i < 5; i++) {
      particles.current.push({
        x: bird.current.x,
        y: bird.current.y + BIRD_SIZE / 2,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: Math.random() * -3 - 1
        },
        life: 20,
        color: "#fbbf24",
        size: Math.random() * 3 + 1
      })
    }
    
    if (soundEffects) soundEffects("move")
  }

  const createPipe = () => {
    const minHeight = 50
    const maxHeight = CANVAS_HEIGHT - pipeGap - minHeight
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight
    
    pipes.current.push({
      x: CANVAS_WIDTH,
      topHeight,
      bottomY: topHeight + pipeGap,
      passed: false
    })
  }

  const createExplosion = (x: number, y: number) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x,
        y,
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8
        },
        life: 30,
        color: ["#ef4444", "#f97316", "#eab308", "#ffffff"][Math.floor(Math.random() * 4)],
        size: Math.random() * 4 + 2
      })
    }
  }

  const checkCollisions = () => {
    // Ground and ceiling collision
    if (bird.current.y + BIRD_SIZE >= CANVAS_HEIGHT || bird.current.y <= 0) {
      return true
    }

    // Pipe collision
    for (const pipe of pipes.current) {
      if (
        bird.current.x + BIRD_SIZE > pipe.x &&
        bird.current.x < pipe.x + PIPE_WIDTH &&
        (bird.current.y < pipe.topHeight || bird.current.y + BIRD_SIZE > pipe.bottomY)
      ) {
        return true
      }
    }

    return false
  }

  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver) return

    if (isPaused) {
      animationFrameId.current = requestAnimationFrame(gameLoop)
      return
    }

    // Update bird physics
    if (gameStarted) {
      bird.current.velocity += GRAVITY
      bird.current.y += bird.current.velocity
      
      // Update rotation based on velocity
      bird.current.rotation = Math.min(90, Math.max(-30, bird.current.velocity * 3))
    }

    // Update background
    backgroundOffset.current = (backgroundOffset.current + 1) % CANVAS_WIDTH

    // Generate pipes
    if (gameStarted && timestamp - lastPipeTime.current > pipeInterval) {
      createPipe()
      lastPipeTime.current = timestamp
    }

    // Update pipes
    for (let i = pipes.current.length - 1; i >= 0; i--) {
      const pipe = pipes.current[i]
      pipe.x -= pipeSpeed

      // Score when passing pipe
      if (!pipe.passed && bird.current.x > pipe.x + PIPE_WIDTH) {
        pipe.passed = true
        setScore(prev => prev + 5)
        if (soundEffects) soundEffects("clear")
      }

      // Remove off-screen pipes
      if (pipe.x + PIPE_WIDTH < 0) {
        pipes.current.splice(i, 1)
      }
    }

    // Update particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i]
      p.x += p.velocity.x
      p.y += p.velocity.y
      p.velocity.y += 0.2 // gravity on particles
      p.life--
      
      if (p.life <= 0) {
        particles.current.splice(i, 1)
      }
    }

    // Check collisions
    if (gameStarted && checkCollisions()) {
      createExplosion(bird.current.x + BIRD_SIZE / 2, bird.current.y + BIRD_SIZE / 2)
      setIsGameOver(true)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      onGameOver(score)
      if (soundEffects) soundEffects("gameover")
      return
    }

    draw()
    animationFrameId.current = requestAnimationFrame(gameLoop)
  }, [isGameOver, isPaused, gameStarted, score, soundEffects, onGameOver])

  const startGameLoop = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    animationFrameId.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => {
    if (!isPaused && !isGameOver) {
      startGameLoop()
    }
  }, [isPaused, isGameOver, gameLoop])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw animated sky background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    skyGradient.addColorStop(0, "#87CEEB")
    skyGradient.addColorStop(0.7, "#98D8E8")
    skyGradient.addColorStop(1, "#B0E0E6")
    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw moving clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    for (let i = 0; i < 5; i++) {
      const x = ((i * 150 - backgroundOffset.current * 0.5) % (CANVAS_WIDTH + 100)) - 50
      const y = 50 + i * 30
      drawCloud(ctx, x, y, 40 + i * 10)
    }

    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 50, 0, CANVAS_HEIGHT)
    groundGradient.addColorStop(0, "#8FBC8F")
    groundGradient.addColorStop(1, "#228B22")
    ctx.fillStyle = groundGradient
    ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50)

    // Draw grass texture
    ctx.fillStyle = "#32CD32"
    for (let x = 0; x < CANVAS_WIDTH; x += 10) {
      const height = Math.random() * 8 + 2
      ctx.fillRect(x, CANVAS_HEIGHT - 50, 2, -height)
    }

    // Draw pipes with 3D effect
    pipes.current.forEach(pipe => {
      drawPipe3D(ctx, pipe.x, 0, PIPE_WIDTH, pipe.topHeight, true)
      drawPipe3D(ctx, pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY, false)
    })

    // Draw bird with 3D effect
    drawBird3D(ctx, bird.current)

    // Draw particles
    particles.current.forEach(particle => {
      const alpha = particle.life / 30
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })

    // Draw score
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 3
    ctx.font = `bold ${isMobile ? 24 : 32}px Arial`
    ctx.textAlign = "center"
    ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 60)
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 60)

    // Draw start instruction
    if (!gameStarted) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      
      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${isMobile ? 16 : 20}px Arial`
      ctx.textAlign = "center"
      ctx.fillText("Tap or Press Space to Start", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
      ctx.fillText("Avoid the pipes!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30)
    }
  }

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath()
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
    ctx.arc(x + size * 0.3, y, size * 0.7, 0, Math.PI * 2)
    ctx.arc(x + size * 0.6, y, size * 0.5, 0, Math.PI * 2)
    ctx.arc(x + size * 0.2, y - size * 0.3, size * 0.4, 0, Math.PI * 2)
    ctx.arc(x + size * 0.4, y - size * 0.3, size * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawPipe3D = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isTop: boolean) => {
    // Main pipe body with gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y)
    gradient.addColorStop(0, "#4ade80")
    gradient.addColorStop(0.3, "#22c55e")
    gradient.addColorStop(0.7, "#16a34a")
    gradient.addColorStop(1, "#15803d")
    
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, width, height)

    // 3D highlight on left side
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    ctx.fillRect(x, y, width * 0.2, height)

    // 3D shadow on right side
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(x + width * 0.8, y, width * 0.2, height)

    // Pipe cap (wider part)
    const capHeight = 30
    const capWidth = width + 10
    const capX = x - 5
    let capY = isTop ? y + height - capHeight : y

    // Cap gradient
    const capGradient = ctx.createLinearGradient(capX, capY, capX + capWidth, capY)
    capGradient.addColorStop(0, "#65a30d")
    capGradient.addColorStop(0.5, "#84cc16")
    capGradient.addColorStop(1, "#4d7c0f")
    
    ctx.fillStyle = capGradient
    ctx.fillRect(capX, capY, capWidth, capHeight)

    // Cap 3D effects
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    ctx.fillRect(capX, capY, capWidth * 0.2, capHeight)
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
    ctx.fillRect(capX + capWidth * 0.8, capY, capWidth * 0.2, capHeight)

    // Pipe details/rivets
    ctx.fillStyle = "#374151"
    for (let i = 0; i < 3; i++) {
      const rivetY = y + (height / 4) * (i + 1)
      ctx.beginPath()
      ctx.arc(x + width * 0.2, rivetY, 3, 0, Math.PI * 2)
      ctx.arc(x + width * 0.8, rivetY, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const drawBird3D = (ctx: CanvasRenderingContext2D, bird: Bird) => {
    ctx.save()
    ctx.translate(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2)
    ctx.rotate((bird.rotation * Math.PI) / 180)

    // Bird body with 3D gradient
    const bodyGradient = ctx.createRadialGradient(
      -BIRD_SIZE * 0.2, -BIRD_SIZE * 0.2, BIRD_SIZE * 0.1,
      0, 0, BIRD_SIZE * 0.8
    )
    bodyGradient.addColorStop(0, "#fef3c7")
    bodyGradient.addColorStop(0.3, "#fbbf24")
    bodyGradient.addColorStop(0.7, "#f59e0b")
    bodyGradient.addColorStop(1, "#d97706")

    // Bird body (ellipse)
    ctx.fillStyle = bodyGradient
    ctx.beginPath()
    ctx.ellipse(0, 0, BIRD_SIZE * 0.7, BIRD_SIZE * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Bird wing with animation
    const wingFlap = Math.sin(Date.now() / 100) * 0.3
    ctx.fillStyle = "#f97316"
    ctx.beginPath()
    ctx.ellipse(-BIRD_SIZE * 0.2, wingFlap * 5, BIRD_SIZE * 0.4, BIRD_SIZE * 0.3, wingFlap, 0, Math.PI * 2)
    ctx.fill()

    // Wing highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.beginPath()
    ctx.ellipse(-BIRD_SIZE * 0.2, wingFlap * 5, BIRD_SIZE * 0.2, BIRD_SIZE * 0.15, wingFlap, 0, Math.PI * 2)
    ctx.fill()

    // Beak
    ctx.fillStyle = "#ea580c"
    ctx.beginPath()
    ctx.moveTo(BIRD_SIZE * 0.5, 0)
    ctx.lineTo(BIRD_SIZE * 0.8, -BIRD_SIZE * 0.1)
    ctx.lineTo(BIRD_SIZE * 0.8, BIRD_SIZE * 0.1)
    ctx.closePath()
    ctx.fill()

    // Eye
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(BIRD_SIZE * 0.2, -BIRD_SIZE * 0.1, BIRD_SIZE * 0.15, 0, Math.PI * 2)
    ctx.fill()

    // Pupil
    ctx.fillStyle = "#000000"
    ctx.beginPath()
    ctx.arc(BIRD_SIZE * 0.25, -BIRD_SIZE * 0.1, BIRD_SIZE * 0.08, 0, Math.PI * 2)
    ctx.fill()

    // Eye highlight
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(BIRD_SIZE * 0.28, -BIRD_SIZE * 0.12, BIRD_SIZE * 0.03, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 border-1 border-purple-900 
      rounded-xl shadow-lg shadow-yellow-700/20 bg-gradient-to-r from-yellow-700 to-gray-800">
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300 text-lg font-bold">Best: {bestScore}</span>
      </div>

      <div className="relative shadow-xl shadow-yellow-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-yellow-500 shadow-lg shadow-yellow-500/20 bg-black/50 rounded-xl cursor-pointer"
        />

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">PAUSED</div>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-center">
              <div className="text-3xl font-bold mb-4">GAME OVER</div>
              <div className="text-xl">Final Score: {score}</div>
              {score === bestScore && score > 0 && (
                <div className="text-lg text-yellow-400 mt-2">🏆 New Best Score!</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="md:hidden mt-4 w-full max-w-[300px]">
        <div className="flex justify-center gap-4">
          <button
            onClick={jump}
            className="bg-yellow-600/80 hover:bg-yellow-500/80 active:bg-yellow-400/80 
                     text-white font-bold py-3 px-8 rounded-xl border-2 border-yellow-400/50
                     shadow-lg shadow-yellow-500/20 transition-all duration-150
                     select-none touch-manipulation text-lg"
            disabled={isGameOver}
          >
            🐦 FLY
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-orange-600/80 hover:bg-orange-500/80 active:bg-orange-400/80 
                     text-white font-bold py-3 px-6 rounded-xl border-2 border-orange-400/50
                     shadow-lg shadow-orange-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            {isPaused ? "▶️" : "⏸️"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-2 bg-yellow-700 hover:bg-orange-600 rounded-xl font-bold transition-colors hidden md:block"
          disabled={isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button
          onClick={initializeGame}
          className="px-4 py-2 bg-orange-700 hover:bg-orange-600 rounded-xl text-xs font-bold transition-colors"
        >
          Restart
        </button>
      </div>

      <div className="mt-4 text-center text-gray-400 text-sm">
        <p>🎮 Tap screen, click, or press Space/↑ to fly</p>
        <p>🏆 Avoid the pipes and get the highest score!</p>
      </div>
    </div>
  )
}