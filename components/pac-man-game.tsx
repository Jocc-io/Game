"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Game constants with responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const CANVAS_WIDTH = isMobile ? 360 : 600
const CANVAS_HEIGHT = isMobile ? 400 : 500
const CELL_SIZE = isMobile ? 15 : 20
const COLS = Math.floor(CANVAS_WIDTH / CELL_SIZE)
const ROWS = Math.floor(CANVAS_HEIGHT / CELL_SIZE)

// Game entities
type Position = { x: number; y: number }
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"

interface PacManGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

export default function PacManGame({ onGameOver, soundEffects }: PacManGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  // Game state refs
  const pacman = useRef<Position & { direction: Direction; nextDirection: Direction }>({
    x: Math.floor(COLS / 2),
    y: Math.floor(ROWS / 2),
    direction: "RIGHT",
    nextDirection: "RIGHT"
  })
  
  const ghosts = useRef<Array<Position & { direction: Direction; color: string; mode: "chase" | "scatter" | "frightened" }>>([
    { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) - 1, direction: "UP", color: "#ff0000", mode: "chase" },
    { x: Math.floor(COLS / 2) + 1, y: Math.floor(ROWS / 2) - 1, direction: "DOWN", color: "#ff66cc", mode: "chase" },
    { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) + 1, direction: "LEFT", color: "#00ffff", mode: "chase" },
    { x: Math.floor(COLS / 2) + 1, y: Math.floor(ROWS / 2) + 1, direction: "RIGHT", color: "#ffb852", mode: "chase" }
  ])

  const maze = useRef<number[][]>([])
  const dots = useRef<boolean[][]>([])
  const powerPellets = useRef<Position[]>([])
  // frightenedTimer in milliseconds
  const frightenedTimer = useRef<number>(0)
  const animationFrameId = useRef<number | null>(null)
  const lastMoveTime = useRef(0)
  const lastFrameTime = useRef<number | null>(null)
  const moveSpeed = useRef(200) // ms per grid move

  // Initialize maze and dots
  useEffect(() => {
    initializeGame(true)
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeGame = (resetLives = true) => {
    // Create simple maze (1 = wall, 0 = empty)
    const newMaze: number[][] = []
    const newDots: boolean[][] = []
    
    for (let y = 0; y < ROWS; y++) {
      newMaze[y] = []
      newDots[y] = []
      for (let x = 0; x < COLS; x++) {
        // Create walls around edges and some internal walls (difficulty increases with level)
        if (
          x === 0 ||
          x === COLS - 1 ||
          y === 0 ||
          y === ROWS - 1 ||
          (x % 4 === 0 && y % 4 === 0 && Math.random() < Math.min(0.6, 0.2 + level * 0.05))
        ) {
          newMaze[y][x] = 1
          newDots[y][x] = false
        } else {
          newMaze[y][x] = 0
          newDots[y][x] = true
        }
      }
    }

    // Clear area around pac-man and ghosts (center spawn)
    const centerX = Math.floor(COLS / 2)
    const centerY = Math.floor(ROWS / 2)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (centerY + dy >= 0 && centerY + dy < ROWS && centerX + dx >= 0 && centerX + dx < COLS) {
          newMaze[centerY + dy][centerX + dx] = 0
          newDots[centerY + dy][centerX + dx] = false
        }
      }
    }

    maze.current = newMaze
    dots.current = newDots

    // Add power pellets (ensure they sit on empty tiles)
    powerPellets.current = [
      { x: 2, y: 2 },
      { x: COLS - 3, y: 2 },
      { x: 2, y: ROWS - 3 },
      { x: COLS - 3, y: ROWS - 3 }
    ].filter(p => maze.current[p.y] && maze.current[p.y][p.x] === 0)

    // Reset game state
    pacman.current = {
  x: centerX,
  y: ROWS - 4,   // بعيد عن الأشباح اللي في النص
  direction: "LEFT",
  nextDirection: "LEFT"
}


    // Reset ghosts to spawn positions (around center)
    const spawnOffsets = [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 }
    ]
    ghosts.current.forEach((g, i) => {
      g.x = centerX + spawnOffsets[i].x
      g.y = centerY + spawnOffsets[i].y
      g.direction = "UP"
      g.mode = "chase"
    })

    if (resetLives) setScore(0)
    if (resetLives) setLives(3)
    setIsGameOver(false)
    setIsPaused(false)
    frightenedTimer.current = 0
    moveSpeed.current = Math.max(200 - (level - 1) * 20, 80)
    lastMoveTime.current = 0
    lastFrameTime.current = null

    startGameLoop()
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "p", "P"].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case "ArrowUp":
          pacman.current.nextDirection = "UP"
          break
        case "ArrowDown":
          pacman.current.nextDirection = "DOWN"
          break
        case "ArrowLeft":
          pacman.current.nextDirection = "LEFT"
          break
        case "ArrowRight":
          pacman.current.nextDirection = "RIGHT"
          break
        case "p":
        case "P":
          setIsPaused(prev => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Mobile controls
  const handleDirectionChange = useCallback((direction: Direction) => {
    if (isPaused || isGameOver) return
    pacman.current.nextDirection = direction
  }, [isPaused, isGameOver])

  const canMove = (x: number, y: number): boolean => {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false
    return maze.current[y][x] === 0
  }

  const moveEntity = (entity: Position & { direction: Direction }, newDirection?: Direction) => {
    if (newDirection && newDirection !== entity.direction) {
      // Try to change direction
      let newX = entity.x
      let newY = entity.y
      
      switch (newDirection) {
        case "UP": newY--; break
        case "DOWN": newY++; break
        case "LEFT": newX--; break
        case "RIGHT": newX++; break
      }
      
      if (canMove(newX, newY)) {
        entity.direction = newDirection
        entity.x = newX
        entity.y = newY
        return true
      }
    }

    // Continue in current direction
    let newX = entity.x
    let newY = entity.y
    
    switch (entity.direction) {
      case "UP": newY--; break
      case "DOWN": newY++; break
      case "LEFT": newX--; break
      case "RIGHT": newX++; break
    }
    
    if (canMove(newX, newY)) {
      entity.x = newX
      entity.y = newY
      return true
    }
    
    return false
  }

  const gameLoop = useCallback((timestamp: number) => {
    if (isGameOver) {
      return
    }

    if (isPaused) {
      // stop advancing frames while paused
      lastFrameTime.current = null
      animationFrameId.current = requestAnimationFrame(gameLoop)
      return
    }

    // compute delta time (ms) since last frame
    const delta = lastFrameTime.current ? (timestamp - lastFrameTime.current) : 0
    lastFrameTime.current = timestamp

    // handle movement at discrete intervals (moveSpeed)
    if (timestamp - lastMoveTime.current > moveSpeed.current) {
      lastMoveTime.current = timestamp

      // Move Pac-Man
      const moved = moveEntity(pacman.current, pacman.current.nextDirection)
      if (moved && soundEffects) {
        soundEffects("move")
      }

      // Check dot collection (grid-based)
      const px = pacman.current.x
      const py = pacman.current.y
      
      if (dots.current[py] && dots.current[py][px]) {
        dots.current[py][px] = false
        setScore(prev => prev + 1) // each dot = 1 point
        if (soundEffects) soundEffects("clear")
      }

      // Check power pellet collection (grid-based) -> ONLY here we trigger frightened
      const pelletIndex = powerPellets.current.findIndex(p => p.x === px && p.y === py)
      if (pelletIndex !== -1) {
        powerPellets.current.splice(pelletIndex, 1)
        setScore(prev => prev + 10)
        // set frightened timer in ms (7 seconds)
        frightenedTimer.current = 7000
        ghosts.current.forEach(ghost => {
          ghost.mode = "frightened"
        })
        if (soundEffects) soundEffects("powerup")
      }

      // Move ghosts (simple AI)
      ghosts.current.forEach(ghost => {
        if (Math.random() < 0.12) {
          const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"]
          ghost.direction = directions[Math.floor(Math.random() * directions.length)]
        }
        moveEntity(ghost)
      })

      // Check ghost collisions (grid-based)
      ghosts.current.forEach(ghost => {
        if (ghost.x === px && ghost.y === py) {
          if (ghost.mode === "frightened") {
            // Eat ghost
            setScore(prev => prev + 200)
            // respawn ghost at spawn (center offsets)
            const centerX = Math.floor(COLS / 2)
            const centerY = Math.floor(ROWS / 2)
            ghost.x = centerX
            ghost.y = centerY
            ghost.mode = "chase"
            if (soundEffects) soundEffects("eatghost")
          } else {
            // Pac-Man dies
            setLives(prev => {
              const newLives = prev - 1
              if (newLives <= 0) {
                setIsGameOver(true)
                if (animationFrameId.current) {
                  cancelAnimationFrame(animationFrameId.current)
                }
                onGameOver(score)
                if (soundEffects) soundEffects("gameover")
              } else {
                // Reset positions
                pacman.current.x = Math.floor(COLS / 2)
                pacman.current.y = Math.floor(ROWS / 2)
                pacman.current.direction = "RIGHT"
                pacman.current.nextDirection = "RIGHT"
                if (soundEffects) soundEffects("drop")
              }
              return newLives
            })
          }
        }
      })

      // Check win condition (dots + pellets)
      let dotsRemaining = 0
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (dots.current[y] && dots.current[y][x]) dotsRemaining++
        }
      }
      
      if (dotsRemaining === 0 && powerPellets.current.length === 0) {
        setLevel(prev => prev + 1)
        moveSpeed.current = Math.max(100, moveSpeed.current - 20)
        initializeGame(false)  // don't reset lives/score when going to next level
        if (soundEffects) soundEffects("levelup")
      }

      // draw after movement update
      draw()
    }

    // update frightened timer using delta (ms)
    if (frightenedTimer.current > 0 && delta > 0) {
      frightenedTimer.current = Math.max(0, frightenedTimer.current - delta)
      if (frightenedTimer.current === 0) {
        ghosts.current.forEach(g => (g.mode = "chase"))
      }
    }

    animationFrameId.current = requestAnimationFrame(gameLoop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, isPaused, score, soundEffects, onGameOver])

  const startGameLoop = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
    }
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

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw maze
    ctx.fillStyle = "#0000ff"
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (maze.current[y][x] === 1) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    // Draw dots
    ctx.fillStyle = "#ffff00"
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (dots.current[y] && dots.current[y][x]) {
          ctx.beginPath()
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            2,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
    }

    // Draw power pellets
    ctx.fillStyle = "#ffff00"
    powerPellets.current.forEach(pellet => {
      ctx.beginPath()
      ctx.arc(
        pellet.x * CELL_SIZE + CELL_SIZE / 2,
        pellet.y * CELL_SIZE + CELL_SIZE / 2,
        6,
        0,
        Math.PI * 2
      )
      ctx.fill()
    })

    // ==== Modern Pac-Man ====
    const px = pacman.current.x * CELL_SIZE + CELL_SIZE / 2
    const py = pacman.current.y * CELL_SIZE + CELL_SIZE / 2
    const radius = CELL_SIZE * 0.8

    // Body gradient + glow
    const bodyGrad = ctx.createRadialGradient(px - radius/3, py - radius/3, radius*0.2, px, py, radius)
    bodyGrad.addColorStop(0, "#fff176")
    bodyGrad.addColorStop(0.6, "#fdd835")
    bodyGrad.addColorStop(1, "#f9a825")

    ctx.fillStyle = bodyGrad
    ctx.shadowColor = "#ffd54f"
    ctx.shadowBlur = 18

    // mouth angles
    let mouthAngle = Math.sin(Date.now()/150) * 0.22 + 0.32
    let startAngle = 0, endAngle = 0
    switch (pacman.current.direction) {
      case "RIGHT":
        startAngle = mouthAngle
        endAngle = 2 * Math.PI - mouthAngle
        break
      case "LEFT":
        startAngle = Math.PI + mouthAngle
        endAngle = Math.PI - mouthAngle
        break
      case "UP":
        startAngle = 1.5 * Math.PI + mouthAngle
        endAngle = 1.5 * Math.PI - mouthAngle
        break
      case "DOWN":
        startAngle = 0.5 * Math.PI + mouthAngle
        endAngle = 0.5 * Math.PI - mouthAngle
        break
    }

    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.arc(px, py, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    // Eye
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(px - radius/3, py - radius/3, radius * 0.16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#000"
    ctx.beginPath()
    ctx.arc(px - radius/3, py - radius/3, radius * 0.07, 0, Math.PI * 2)
    ctx.fill()

    // Draw ghosts (with frightened yellow + blinking in last 2s)
    ghosts.current.forEach(ghost => {
      const gx = ghost.x * CELL_SIZE + CELL_SIZE / 2
      const gy = ghost.y * CELL_SIZE + CELL_SIZE / 2
      const ghostRadius = CELL_SIZE * 0.7

      // decide base color (blinking if near end)
      let baseColor = ghost.color
      if (ghost.mode === "frightened") {
        // blinking in last 2000 ms
        if (frightenedTimer.current > 0 && frightenedTimer.current < 2000) {
          // blink every 200ms
          const blinkOn = Math.floor(frightenedTimer.current / 200) % 2 === 0
          baseColor = blinkOn ? ghost.color : "#ffeb3b"
        } else {
          baseColor = "#ffeb3b"
        }
      }

      const gGrad = ctx.createLinearGradient(gx - ghostRadius, gy - ghostRadius, gx + ghostRadius, gy + ghostRadius)
      gGrad.addColorStop(0, "#ffffff")
      gGrad.addColorStop(1, baseColor)

      ctx.fillStyle = gGrad
      ctx.shadowColor = baseColor
      ctx.shadowBlur = ghost.mode === "frightened" ? 20 : 12

      // body (rounded top + flat bottom with small waves)
      ctx.beginPath()
      ctx.moveTo(gx - ghostRadius, gy)
      ctx.quadraticCurveTo(gx, gy - ghostRadius, gx + ghostRadius, gy)
      ctx.lineTo(gx + ghostRadius, gy + ghostRadius * 0.9)
      // simple wavy bottom
      ctx.lineTo(gx + ghostRadius * 0.6, gy + ghostRadius * 1.2)
      ctx.lineTo(gx, gy + ghostRadius * 0.9)
      ctx.lineTo(gx - ghostRadius * 0.6, gy + ghostRadius * 1.2)
      ctx.closePath()
      ctx.fill()

      // eyes (always present)
      ctx.shadowBlur = 0
      ctx.fillStyle = "#fff"
      ctx.beginPath()
      ctx.arc(gx - ghostRadius/3, gy - ghostRadius/4, Math.max(3, CELL_SIZE * 0.12), 0, Math.PI * 2)
      ctx.arc(gx + ghostRadius/3, gy - ghostRadius/4, Math.max(3, CELL_SIZE * 0.12), 0, Math.PI * 2)
      ctx.fill()

      // pupils follow Pac-Man
      const dx = pacman.current.x - ghost.x
      const dy = pacman.current.y - ghost.y
      const angle = Math.atan2(dy, dx)
      const pupilOffset = Math.max(1, CELL_SIZE * 0.06)

      ctx.fillStyle = "#000"
      ctx.beginPath()
      ctx.arc(gx - ghostRadius/3 + pupilOffset * Math.cos(angle), gy - ghostRadius/4 + pupilOffset * Math.sin(angle), Math.max(1.5, CELL_SIZE * 0.04), 0, Math.PI * 2)
      ctx.arc(gx + ghostRadius/3 + pupilOffset * Math.cos(angle), gy - ghostRadius/4 + pupilOffset * Math.sin(angle), Math.max(1.5, CELL_SIZE * 0.04), 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 border-1 border-purple-900 
      rounded-xl shadow-lg shadow-yellow-700/20 bg-gradient-to-r from-yellow-700 to-gray-800">
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300 text-lg font-bold">Lives: {lives}</span>
        <span className="text-gray-300 text-lg font-bold">Level: {level}</span>
      </div>

      <div className="relative shadow-xl shadow-yellow-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-yellow-500 shadow-lg shadow-yellow-500/20 bg-black/50 rounded-xl"
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
      <div className="md:hidden mt-1 w-full max-w-[300px]">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 pl-12 pr-12 pt-4">
          <div></div>
          <button
            onClick={() => handleDirectionChange("UP")}
            className="bg-yellow-600/80 hover:bg-yellow-500/80 active:bg-yellow-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-yellow-400/50
                     shadow-lg shadow-yellow-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ↑
          </button>
          <div></div>

          <button
            onClick={() => handleDirectionChange("LEFT")}
            className="bg-yellow-600/80 hover:bg-yellow-500/80 active:bg-yellow-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-yellow-400/50
                     shadow-lg shadow-yellow-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ←
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-orange-600/80 hover:bg-orange-500/80 active:bg-orange-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-orange-400/50
                     shadow-lg shadow-orange-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center text-sm"
            disabled={isGameOver}
          >
            {isPaused ? "▶️" : "⏸️"}
          </button>

          <button
            onClick={() => handleDirectionChange("RIGHT")}
            className="bg-yellow-600/80 hover:bg-yellow-500/80 active:bg-yellow-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-yellow-400/50
                     shadow-lg shadow-yellow-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            →
          </button>

          <div></div>
          <button
            onClick={() => handleDirectionChange("DOWN")}
            className="bg-yellow-600/80 hover:bg-yellow-500/80 active:bg-yellow-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-yellow-400/50
                     shadow-lg shadow-yellow-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ↓
          </button>
          <div></div>
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
      onClick={() => {
        setLevel(1)
        initializeGame(true)
      }}
      className="px-4 py-2 bg-orange-700 hover:bg-orange-600 rounded-xl text-xs font-bold transition-colors"
    >
      Restart
    </button>

      </div>
    </div>
  )
}
