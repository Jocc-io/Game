"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Game constants with responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const CANVAS_WIDTH = isMobile ? 360 : 600
const CANVAS_HEIGHT = isMobile   ? 400 : 500
const SHIP_SIZE = isMobile ? 12 : 15
const BULLET_SPEED = isMobile ? 5 : 8
const MAX_BULLETS = 4

// Game entities
type Vector2 = { x: number; y: number }
type Ship = Vector2 & { angle: number; velocity: Vector2; thrust: boolean }
type Bullet = Vector2 & { velocity: Vector2; life: number }
type Asteroid = Vector2 & { velocity: Vector2; size: number; angle: number; rotationSpeed: number }

interface AsteroidsGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

export default function AsteroidsGame({ onGameOver, soundEffects }: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  // Game state refs
  const ship = useRef<Ship>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    angle: 0,
    velocity: { x: 0, y: 0 },
    thrust: false
  })

  const bullets = useRef<Bullet[]>([])
  const asteroids = useRef<Asteroid[]>([])
  const particles = useRef<Array<Vector2 & { velocity: Vector2; life: number; color: string }>>([])

  const keys = useRef({
    left: false,
    right: false,
    thrust: false,
    shoot: false
  })

  const animationFrameId = useRef<number | null>(null)
  const lastShootTime = useRef(0)
  const shootCooldown = 200 // ms
  const invulnerabilityTime = useRef(0)

  // Helpers
  const wrapPosition = (pos: Vector2): Vector2 => {
    return {
      x: ((pos.x % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH,
      y: ((pos.y % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT
    }
  }

  const checkCollision = (pos1: Vector2, radius1: number, pos2: Vector2, radius2: number): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < radius1 + radius2
  }

  // Create asteroids (uses current level)
  const createAsteroids = useCallback(() => {
    asteroids.current = []
const numAsteroids = isMobile ? 3 : 3 + Math.max(1, level)

    for (let i = 0; i < numAsteroids; i++) {
      let x: number, y: number
      let attempts = 0
      do {
        x = Math.random() * CANVAS_WIDTH
        y = Math.random() * CANVAS_HEIGHT
        attempts++
        if (attempts > 50) break
      } while (
        Math.sqrt((x - ship.current.x) ** 2 + (y - ship.current.y) ** 2) < 100
      )

      asteroids.current.push({
  x,
  y,
  velocity: { x: (Math.random() - 0.5) * (1 + level * 0.4), y: (Math.random() - 0.5) * (1 + level * 0.4) },
  size: isMobile ? 2 : 3, // اصغر في الموبايل مباشرة
  angle: Math.random() * Math.PI * 2,
  rotationSpeed: (Math.random() - 0.5) * 0.1
})

    }
  }, [level])

  // Initialize game
  const initializeGame = useCallback(() => {
    ship.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      angle: 0,
      velocity: { x: 0, y: 0 },
      thrust: false
    }

    bullets.current = []
    particles.current = []

    setScore(0)
    setLives(3)
    setLevel(1)
    setIsGameOver(false)
    setIsPaused(false)
    invulnerabilityTime.current = 0

    asteroids.current = []
    for (let i = 0; i < 4; i++) {
      asteroids.current.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        size: 3,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      })
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }

    startGameLoop()
  }, [])

  useEffect(() => {
    // initialize on mount
    initializeGame()
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "p", "P"].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case "ArrowLeft":
          keys.current.left = true
          break
        case "ArrowRight":
          keys.current.right = true
          break
        case "ArrowUp":
          keys.current.thrust = true
          break
        case "ArrowDown":
          break
        case " ":
          keys.current.shoot = true
          break
        case "p":
        case "P":
          setIsPaused(prev => !prev)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          keys.current.left = false
          break
        case "ArrowRight":
          keys.current.right = false
          break
        case "ArrowUp":
          keys.current.thrust = false
          break
        case " ":
          keys.current.shoot = false
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false })
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Mobile controls
  const handleMobileControl = useCallback((action: string, pressed: boolean) => {
    if (isPaused || isGameOver) return

    switch (action) {
      case "left":
        keys.current.left = pressed
        break
      case "right":
        keys.current.right = pressed
        break
      case "thrust":
        keys.current.thrust = pressed
        break
      case "shoot":
        keys.current.shoot = pressed
        break
    }
  }, [isPaused, isGameOver])

  // Particles/explosions
  const createExplosion = (x: number, y: number, color: string = "#ffffff") => {
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        x,
        y,
        velocity: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 },
        life: 30,
        color
      })
    }
  }

  const breakAsteroid = (asteroid: Asteroid) => {
    createExplosion(asteroid.x, asteroid.y, "#64748b")

    if (asteroid.size > 1) {
      for (let i = 0; i < 2; i++) {
        asteroids.current.push({
          x: asteroid.x,
          y: asteroid.y,
          velocity: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 },
          size: isMobile ? Math.max(1, asteroid.size - 1) : asteroid.size - 1,
          angle: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2
        })
      }
    }

    const points = (4 - asteroid.size) * 20
    setScore(prev => prev + 5) 
    if (soundEffects) soundEffects("clear")
  }

  // Draw function
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw stars
    ctx.fillStyle = "#ffffff"
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % CANVAS_WIDTH
      const y = (i * 73) % CANVAS_HEIGHT
      ctx.fillRect(x, y, 1, 1)
    }

// Draw ship 
if (invulnerabilityTime.current <= 0 || Math.floor(invulnerabilityTime.current / 5) % 2 === 0) {
  // Ship color
  ctx.strokeStyle = `hsl(${level * 40 % 360}, 100%, 70%)`;
  ctx.lineWidth = 2
  ctx.beginPath()

  const cos = Math.cos(ship.current.angle)
  const sin = Math.sin(ship.current.angle)

  // Ship triangle
  ctx.moveTo(
    ship.current.x + cos * SHIP_SIZE,
    ship.current.y + sin * SHIP_SIZE
  )
  ctx.lineTo(
    ship.current.x + cos * (-SHIP_SIZE) + sin * (-SHIP_SIZE / 2),
    ship.current.y + sin * (-SHIP_SIZE) + cos * (SHIP_SIZE / 2)
  )
  ctx.lineTo(
    ship.current.x + cos * (-SHIP_SIZE / 2),
    ship.current.y + sin * (-SHIP_SIZE / 2)
  )
  ctx.lineTo(
    ship.current.x + cos * (-SHIP_SIZE) + sin * (SHIP_SIZE / 2),
    ship.current.y + sin * (-SHIP_SIZE) + cos * (-SHIP_SIZE / 2)
  )
  ctx.closePath()
  ctx.stroke()

  // Thrust flame (multi-color for fire effect)
  if (ship.current.thrust) {
    const flameLength = SHIP_SIZE * 1.5
    const flameWidth = 4

    const flameX = ship.current.x - cos * SHIP_SIZE
    const flameY = ship.current.y - sin * SHIP_SIZE

    const gradient = ctx.createLinearGradient(
      flameX, flameY,
      flameX - cos * flameLength, flameY - sin * flameLength
    )
    gradient.addColorStop(0, "#ffff00") // أصفر
    gradient.addColorStop(0.5, "#ff6600") // برتقالي
    gradient.addColorStop(1, "#ff0000") // أحمر

    ctx.strokeStyle = gradient
    ctx.lineWidth = flameWidth
    ctx.beginPath()
    ctx.moveTo(flameX, flameY)
    ctx.lineTo(flameX - cos * flameLength, flameY - sin * flameLength)
    ctx.stroke()
  }
}
    // Draw bullets
    ctx.fillStyle = "#ffffff"
    bullets.current.forEach(bullet => {
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw asteroids (modern style)
asteroids.current.forEach(asteroid => {
  const radius = asteroid.size * (isMobile ? 6 : 8)
  ctx.save()
  ctx.translate(asteroid.x, asteroid.y)
  ctx.rotate(asteroid.angle)

  // Create gradient for asteroid
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius)
  gradient.addColorStop(0, "#a3bffa") // light blue highlight
  gradient.addColorStop(0.7, "#64748b") // main color
  gradient.addColorStop(1, "#1e293b") // dark edges

  ctx.fillStyle = gradient
  ctx.lineWidth = 2
  ctx.strokeStyle = "#94a3b8" // border color

  ctx.beginPath()
  const points = 10
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const r = radius * (0.7 + Math.random() * 0.3) // irregular shape
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Add small craters/lines
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * radius * 0.6
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2)
    ctx.fillStyle = "#475569" // darker spots
    ctx.fill()
  }

  ctx.restore()
})

    // Draw particles
    particles.current.forEach(particle => {
      const alpha = particle.life / 30
      let r = 255, g = 255, b = 255
      try {
        r = parseInt(particle.color.slice(1, 3), 16)
        g = parseInt(particle.color.slice(3, 5), 16)
        b = parseInt(particle.color.slice(5, 7), 16)
      } catch (e) {
        // fallback
      }
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, 1, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      return
    }

    if (isPaused) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      draw()
      return
    }

    // Update ship
    if (keys.current.left) {
      ship.current.angle -= 0.15
    }
    if (keys.current.right) {
      ship.current.angle += 0.15
    }
    if (keys.current.thrust) {
      const thrust = 0.3
      ship.current.velocity.x += Math.cos(ship.current.angle) * thrust
      ship.current.velocity.y += Math.sin(ship.current.angle) * thrust
      ship.current.thrust = true
    } else {
      ship.current.thrust = false
    }

    // Apply friction
    ship.current.velocity.x *= 0.99
    ship.current.velocity.y *= 0.99

    // Update ship position
    ship.current.x += ship.current.velocity.x
    ship.current.y += ship.current.velocity.y
    const wrappedShip = wrapPosition(ship.current)
    ship.current.x = wrappedShip.x
    ship.current.y = wrappedShip.y

    // Shooting
    if (keys.current.shoot && timestamp - lastShootTime.current > shootCooldown && bullets.current.length < MAX_BULLETS) {
      bullets.current.push({
        x: ship.current.x,
        y: ship.current.y,
        velocity: {
          x: Math.cos(ship.current.angle) * BULLET_SPEED + ship.current.velocity.x,
          y: Math.sin(ship.current.angle) * BULLET_SPEED + ship.current.velocity.y
        },
        life: 60
      })
      lastShootTime.current = timestamp
      if (soundEffects) soundEffects("move")
    }

    // ✅ FIXED: Update bullets WITHOUT wrapping — remove when out of bounds
    for (let i = bullets.current.length - 1; i >= 0; i--) {
      const bullet = bullets.current[i]
      bullet.x += bullet.velocity.x
      bullet.y += bullet.velocity.y
      bullet.life--

      // remove bullet if it goes outside canvas or expires
      if (
        bullet.life <= 0 ||
        bullet.x < 0 || bullet.x > CANVAS_WIDTH ||
        bullet.y < 0 || bullet.y > CANVAS_HEIGHT
      ) {
        bullets.current.splice(i, 1)
      }
    }

    // Update asteroids (they still wrap)
    asteroids.current.forEach(asteroid => {
      asteroid.x += asteroid.velocity.x
      asteroid.y += asteroid.velocity.y
      asteroid.angle += asteroid.rotationSpeed
      const wrapped = wrapPosition(asteroid)
      asteroid.x = wrapped.x
      asteroid.y = wrapped.y
    })

    // Update particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i]
      p.x += p.velocity.x
      p.y += p.velocity.y
      p.life--
      if (p.life <= 0) particles.current.splice(i, 1)
    }

    // Check bullet-asteroid collisions
    for (let bi = bullets.current.length - 1; bi >= 0; bi--) {
      const bullet = bullets.current[bi]
      for (let ai = asteroids.current.length - 1; ai >= 0; ai--) {
        const asteroid = asteroids.current[ai]
        const asteroidRadius = asteroid.size * 8
        if (checkCollision(bullet, 2, asteroid, asteroidRadius)) {
          breakAsteroid(asteroid)
          asteroids.current.splice(ai, 1)
          bullets.current.splice(bi, 1)
          break
        }
      }
    }

    // Check ship-asteroid collisions
    if (invulnerabilityTime.current <= 0) {
      for (let ai = asteroids.current.length - 1; ai >= 0; ai--) {
        const asteroid = asteroids.current[ai]
        const asteroidRadius = asteroid.size * 8
        if (checkCollision(ship.current, SHIP_SIZE, asteroid, asteroidRadius)) {
          createExplosion(ship.current.x, ship.current.y, "#ff0000")
          setLives(prev => {
            const newLives = prev - 1
            if (newLives <= 0) {
              setIsGameOver(true)
              if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
                animationFrameId.current = null
              }
              onGameOver(score)
              if (soundEffects) soundEffects("gameover")
            } else {
              ship.current.x = CANVAS_WIDTH / 2
              ship.current.y = CANVAS_HEIGHT / 2
              ship.current.velocity = { x: 0, y: 0 }
              ship.current.angle = 0
              invulnerabilityTime.current = 120 // frames
              if (soundEffects) soundEffects("drop")
            }
            return newLives
          })
          break
        }
      }
    } else {
      invulnerabilityTime.current--
    }

    // Level completion
    if (asteroids.current.length === 0) {
      setLevel(prev => prev + 1)
      createAsteroids()
      if (soundEffects) soundEffects("levelup")
    }

    draw()
    animationFrameId.current = requestAnimationFrame(gameLoop)
  }, [isGameOver, isPaused, score, soundEffects, onGameOver, createAsteroids])

  const startGameLoop = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
    animationFrameId.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => {
    if (!isPaused && !isGameOver) {
      startGameLoop()
    } else if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }, [isPaused, isGameOver, gameLoop])

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 border-1 border-purple-900 
      rounded-xl shadow-lg shadow-slate-700/20 bg-gradient-to-r from-slate-700 to-gray-800">
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300 text-lg font-bold">Lives: {lives}</span>
        <span className="text-gray-300 text-lg font-bold">Level: {level}</span>
      </div>

      <div className="relative shadow-xl shadow-slate-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-slate-500 shadow-lg shadow-slate-500/20 bg-black/50 rounded-xl"
        />

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">PAUSED</div>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">GAME OVER</div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="md:hidden mt-4 w-full max-w-[600px]">
        <div className="grid grid-cols-4 gap-2 px-4">
          <button
            onTouchStart={() => handleMobileControl("left", true)}
            onTouchEnd={() => handleMobileControl("left", false)}
            onMouseDown={() => handleMobileControl("left", true)}
            onMouseUp={() => handleMobileControl("left", false)}
            className="bg-slate-600/80 hover:bg-slate-500/80 active:bg-slate-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-slate-400/50
                     shadow-lg shadow-slate-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            ↺
          </button>

          <button
            onTouchStart={() => handleMobileControl("thrust", true)}
            onTouchEnd={() => handleMobileControl("thrust", false)}
            onMouseDown={() => handleMobileControl("thrust", true)}
            onMouseUp={() => handleMobileControl("thrust", false)}
            className="bg-orange-600/80 hover:bg-orange-500/80 active:bg-orange-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-orange-400/50
                     shadow-lg shadow-orange-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            🚀
          </button>

          <button
            onTouchStart={() => handleMobileControl("shoot", true)}
            onTouchEnd={() => handleMobileControl("shoot", false)}
            onMouseDown={() => handleMobileControl("shoot", true)}
            onMouseUp={() => handleMobileControl("shoot", false)}
            className="bg-red-600/80 hover:bg-red-500/80 active:bg-red-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-red-400/50
                     shadow-lg shadow-red-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            💥
          </button>

          <button
            onTouchStart={() => handleMobileControl("right", true)}
            onTouchEnd={() => handleMobileControl("right", false)}
            onMouseDown={() => handleMobileControl("right", true)}
            onMouseUp={() => handleMobileControl("right", false)}
            className="bg-slate-600/80 hover:bg-slate-500/80 active:bg-slate-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-slate-400/50
                     shadow-lg shadow-slate-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            ↻
          </button>
        </div>

        <div className="flex justify-center mt-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-gray-600/80 hover:bg-gray-500/80 active:bg-gray-400/80 
                     text-white font-bold py-1 px-4 rounded-xl border-2 border-gray-400/50
                     shadow-lg shadow-gray-500/20 transition-all duration-150
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
          className="px-4 py-2 bg-slate-700 hover:bg-gray-600 rounded-xl font-bold transition-colors hidden md:block"
          disabled={isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button
          onClick={initializeGame}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-bold transition-colors"
        >
          Restart
        </button>
      </div>
    </div>
  )
}
