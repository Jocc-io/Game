"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Game constants with responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const CANVAS_WIDTH = isMobile ? 360 : 600
const CANVAS_HEIGHT = isMobile ? 400 : 500
const GRID_SIZE = 20
const SNAKE_SPEED = isMobile ? 200 : 150 // ms
const FOOD_COLORS = ["#ec4899", "#a855f7", "#6366f1", "#06b6d4", "#10b981"]

interface SnakeGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
type SnakePart = { x: number; y: number }
type Food = { x: number; y: number; color: string; points: number }

// Helper: draw rounded rectangle
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

export default function SnakeGame({ onGameOver, soundEffects }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [isPaused, setIsPaused] = useState(false)
  const isPausedRef = useRef(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [level, setLevel] = useState(1)
  const levelRef = useRef(1)

  // Game state
  const snake = useRef<SnakePart[]>([{ x: 10, y: 10 }])
  const direction = useRef<Direction>("RIGHT")
  const nextDirection = useRef<Direction>("RIGHT")
  const food = useRef<Food>({ x: 15, y: 10, color: FOOD_COLORS[0], points: 10 })
  const growSnake = useRef(false)
  const requestRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    resetGame()
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const resetGame = () => {
    snake.current = [{ x: 10, y: 10 }]
    direction.current = "RIGHT"
    nextDirection.current = "RIGHT"
    generateFood()
    setScore(0)
    scoreRef.current = 0
    setLevel(1)
    levelRef.current = 1
    setIsGameOver(false)
    setIsPaused(false)
    isPausedRef.current = false

    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current)
    lastTimeRef.current = 0
    requestRef.current = requestAnimationFrame(gameLoop)
  }

  const generateFood = () => {
    const randomFoodType = Math.floor(Math.random() * FOOD_COLORS.length)
    let newX = 0,
      newY = 0
    let validPosition = false

    while (!validPosition) {
      newX = Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE))
      newY = Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE))
      validPosition = !snake.current.some((part) => part.x === newX && part.y === newY)
    }

    food.current = { x: newX, y: newY, color: FOOD_COLORS[randomFoodType], points: 10 }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "p", "P"].includes(e.key)) {
        e.preventDefault() // ⛔️ يمنع تحريك الصفحة
      }

      switch (e.key) {
        case "ArrowUp":
          if (direction.current !== "DOWN") nextDirection.current = "UP"
          break
        case "ArrowDown":
          if (direction.current !== "UP") nextDirection.current = "DOWN"
          break
        case "ArrowLeft":
          if (direction.current !== "RIGHT") nextDirection.current = "LEFT"
          break
        case "ArrowRight":
          if (direction.current !== "LEFT") nextDirection.current = "RIGHT"
          break
        case "p":
        case "P":
          setIsPaused((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    scoreRef.current = score
  }, [score])
  useEffect(() => {
    levelRef.current = level
  }, [level])

  const handleDirectionChange = useCallback(
    (newDirection: Direction) => {
      if (isPaused || isGameOver) return

      // Prevent opposite direction moves
      if (
        (direction.current === "UP" && newDirection === "DOWN") ||
        (direction.current === "DOWN" && newDirection === "UP") ||
        (direction.current === "LEFT" && newDirection === "RIGHT") ||
        (direction.current === "RIGHT" && newDirection === "LEFT")
      ) {
        return
      }

      nextDirection.current = newDirection
    },
    [isPaused, isGameOver],
  )

  const handleGameOver = () => {
    setIsGameOver(true)
    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current)
    onGameOver(scoreRef.current)
    if (soundEffects) soundEffects("gameover")
  }

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (isGameOver) return
      if (isPausedRef.current) {
        requestRef.current = requestAnimationFrame(gameLoop)
        return
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const elapsed = timestamp - lastTimeRef.current
      const frameRate = SNAKE_SPEED / levelRef.current

      if (elapsed > frameRate) {
        lastTimeRef.current = timestamp
        direction.current = nextDirection.current
        const head = { ...snake.current[0] }

        switch (direction.current) {
          case "UP":
            head.y -= 1
            break
          case "DOWN":
            head.y += 1
            break
          case "LEFT":
            head.x -= 1
            break
          case "RIGHT":
            head.x += 1
            break
        }

        if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
          handleGameOver()
          return
        }

        if (snake.current.some((part) => part.x === head.x && part.y === head.y)) {
          handleGameOver()
          return
        }

        snake.current.unshift(head)

        if (head.x === food.current.x && head.y === food.current.y) {
          const newScore = scoreRef.current + food.current.points
          scoreRef.current = newScore
          setScore(newScore)

          const newLevel = Math.floor(newScore / 100) + 1
          if (newLevel > levelRef.current) {
            setLevel(newLevel)
            levelRef.current = newLevel
            if (soundEffects) soundEffects("levelup")
          }

          // ✨ Pulse Effect عند أكل الفاكهة
          const ctx = canvasRef.current?.getContext("2d")
          if (ctx) {
            ctx.beginPath()
            ctx.arc(head.x * GRID_SIZE + GRID_SIZE / 2, head.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE, 0, Math.PI * 2)
            ctx.strokeStyle = food.current.color
            ctx.lineWidth = 3
            ctx.globalAlpha = 0.6
            ctx.stroke()
            ctx.globalAlpha = 1
          }

          generateFood()
          growSnake.current = true
          if (soundEffects) soundEffects("clear")
        }

        if (!growSnake.current) snake.current.pop()
        else growSnake.current = false

        drawGame()
      }

      requestRef.current = requestAnimationFrame(gameLoop)
    },
    [isGameOver, soundEffects],
  )

  useEffect(() => {
    if (!isGameOver) requestRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current)
    }
  }, [gameLoop, isGameOver])

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 🌌 خلفية متدرجة
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    bgGradient.addColorStop(0, "#0f172a")
    bgGradient.addColorStop(1, "#1e293b")
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }

    // 🐍 Snake
    snake.current.forEach((part, index) => {
      const isHead = index === 0
      roundedRect(ctx, part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, isHead ? 8 : 4)
      const gradient = ctx.createLinearGradient(
        part.x * GRID_SIZE,
        part.y * GRID_SIZE,
        part.x * GRID_SIZE + GRID_SIZE,
        part.y * GRID_SIZE + GRID_SIZE,
      )
      if (isHead) {
        gradient.addColorStop(0, "#a855f7")
        gradient.addColorStop(1, "#ec4899")
      } else {
        const colorPos = 1 - index / snake.current.length
        gradient.addColorStop(0, `rgba(168, 85, 247, ${colorPos})`)
        gradient.addColorStop(1, `rgba(236, 72, 153, ${colorPos})`)
      }
      ctx.fillStyle = gradient
      ctx.shadowColor = isHead ? "#ec4899" : "#a855f7"
      ctx.shadowBlur = isHead ? 20 : 10
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"
      ctx.lineWidth = 2
      ctx.stroke()

      // 👀 Snake eyes
      if (isHead) {
        ctx.fillStyle = "white"
        let eyeX1 = 0,
          eyeY1 = 0,
          eyeX2 = 0,
          eyeY2 = 0
        switch (direction.current) {
          case "UP":
            eyeX1 = part.x * GRID_SIZE + GRID_SIZE * 0.25
            eyeY1 = part.y * GRID_SIZE + GRID_SIZE * 0.25
            eyeX2 = part.x * GRID_SIZE + GRID_SIZE * 0.75
            eyeY2 = part.y * GRID_SIZE + GRID_SIZE * 0.25
            break
          case "DOWN":
            eyeX1 = part.x * GRID_SIZE + GRID_SIZE * 0.25
            eyeY1 = part.y * GRID_SIZE + GRID_SIZE * 0.75
            eyeX2 = part.x * GRID_SIZE + GRID_SIZE * 0.75
            eyeY2 = part.y * GRID_SIZE + GRID_SIZE * 0.75
            break
          case "LEFT":
            eyeX1 = part.x * GRID_SIZE + GRID_SIZE * 0.25
            eyeY1 = part.y * GRID_SIZE + GRID_SIZE * 0.25
            eyeX2 = part.x * GRID_SIZE + GRID_SIZE * 0.25
            eyeY2 = part.y * GRID_SIZE + GRID_SIZE * 0.75
            break
          case "RIGHT":
            eyeX1 = part.x * GRID_SIZE + GRID_SIZE * 0.75
            eyeY1 = part.y * GRID_SIZE + GRID_SIZE * 0.25
            eyeX2 = part.x * GRID_SIZE + GRID_SIZE * 0.75
            eyeY2 = part.y * GRID_SIZE + GRID_SIZE * 0.75
            break
        }
        ctx.beginPath()
        ctx.arc(eyeX1, eyeY1, GRID_SIZE * 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(eyeX2, eyeY2, GRID_SIZE * 0.15, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // 🍒 Food with Pulse Glow
    const centerX = food.current.x * GRID_SIZE + GRID_SIZE / 2
    const centerY = food.current.y * GRID_SIZE + GRID_SIZE / 2
    const foodGradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, GRID_SIZE / 2)
    foodGradient.addColorStop(0, "white")
    foodGradient.addColorStop(0.4, food.current.color)
    foodGradient.addColorStop(1, "black")
    ctx.fillStyle = foodGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, GRID_SIZE * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 border-1 border-purple-900 
      rounded-xl shadow-lg shadow-green-700/20 bg-gradient-to-r from-green-800 to-gray-800">
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300 text-lg font-bold">Level: {level}</span>
      </div>

        <div className="relative shadow-xl shadow-green-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-green-500 shadow-lg shadow-green-500/20 bg-black/50 rounded-xl"
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

      <div className="md:hidden mt-4 w-full max-w-[300px]">
        {/* D-pad directional controls */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 pl-12 pr-12 pt-4 ">
          {/* Empty top-left */}
          <div></div>

          {/* Up button */}
          <button
            onTouchStart={() => handleDirectionChange("UP")}
            onClick={() => handleDirectionChange("UP")}
            className="bg-green-600/80 hover:bg-green-500/80 active:bg-green-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-green-400/50
                     shadow-lg shadow-green-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ↑
          </button>

          {/* Empty top-right */}
          <div></div>

          {/* Left button */}
          <button
            onTouchStart={() => handleDirectionChange("LEFT")}
            onClick={() => handleDirectionChange("LEFT")}
            className="bg-green-600/80 hover:bg-green-500/80 active:bg-green-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-green-400/50
                     shadow-lg shadow-green-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ←
          </button>

          {/* Center pause button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center text-sm"
            disabled={isGameOver}
          >
            {isPaused ? "▶️" : "⏸️"}
          </button>

          {/* Right button */}
          <button
            onTouchStart={() => handleDirectionChange("RIGHT")}
            onClick={() => handleDirectionChange("RIGHT")}
            className="bg-green-600/80 hover:bg-green-500/80 active:bg-green-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-green-400/50
                     shadow-lg shadow-green-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            →
          </button>

          {/* Empty bottom-left */}
          <div></div>

          {/* Down button */}
          <button
            onTouchStart={() => handleDirectionChange("DOWN")}
            onClick={() => handleDirectionChange("DOWN")}
            className="bg-green-600/80 hover:bg-green-500/80 active:bg-green-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-green-400/50
                     shadow-lg shadow-green-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ↓
          </button>

          {/* Empty bottom-right */}
          <div></div>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-2 bg-green-700 hover:bg-emerald-600 rounded-xl font-bold transition-colors hidden md:block"
          disabled={isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button
          onClick={resetGame}
          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-xl text-xs font-bold transition-colors"
        >
          Restart
        </button>
      </div>

    </div>
  )
}
