"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// Game constants with responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const CANVAS_WIDTH = isMobile ? 360 : 600
const CANVAS_HEIGHT = isMobile ? 400 : 500
const PADDLE_WIDTH = isMobile ? 100 : 150
const PADDLE_HEIGHT = 12
const BALL_RADIUS = isMobile ? 6 : 8
const BRICK_ROWS = 5
const BRICK_COLUMNS = isMobile ? 8 : 8
const BRICK_WIDTH = isMobile ? 35 : 65
const BRICK_HEIGHT = isMobile ? 12 : 18
const BRICK_PADDING = isMobile ? 5 : 7
const BRICK_TOP_OFFSET = isMobile ? 20 : 30
const BRICK_LEFT_OFFSET = isMobile ? 20 : 18
const BALL_SPEED = isMobile ? 5 : 10


// Brick colors by row
const BRICK_COLORS = [
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
]

interface BreakBricksGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

export default function BreakBricksGame({ onGameOver, soundEffects }: BreakBricksGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isGameWon, setIsGameWon] = useState(false)

  // Game state
  const paddleX = useRef((CANVAS_WIDTH - PADDLE_WIDTH) / 2)
  const ballX = useRef(CANVAS_WIDTH / 2)
  const ballY = useRef(CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10)
  const ballDX = useRef(BALL_SPEED)
  const ballDY = useRef(-BALL_SPEED)
  const rightPressed = useRef(false)
  const leftPressed = useRef(false)
  const bricks = useRef<{ x: number; y: number; status: number; color: string }[][]>([])
  const animationFrameId = useRef<number | null>(null)
  const mousePosition = useRef({ x: 0 })
  const touchPosition = useRef({ x: 0 })
  const isTouchDevice = useRef(false)

  // Initialize bricks
  useEffect(() => {
    initializeBricks()
  }, [level])

  const initializeBricks = () => {
    const newBricks: { x: number; y: number; status: number; color: string }[][] = []

    for (let c = 0; c < BRICK_COLUMNS; c++) {
      newBricks[c] = []
      for (let r = 0; r < BRICK_ROWS; r++) {
        const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_LEFT_OFFSET
        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_TOP_OFFSET
        newBricks[c][r] = {
          x: brickX,
          y: brickY,
          status: 1,
          color: BRICK_COLORS[r],
        }
      }
    }

    bricks.current = newBricks
  }

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed.current = true
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed.current = true
      } else if (e.key === "p" || e.key === "P") {
        setIsPaused((prev) => !prev)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        rightPressed.current = false
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        leftPressed.current = false
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Handle mouse and touch events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e: MouseEvent) => {
      const relativeX = e.clientX - canvas.getBoundingClientRect().left
      if (relativeX > 0 && relativeX < canvas.width) {
        mousePosition.current.x = relativeX
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      isTouchDevice.current = true
      const relativeX = e.touches[0].clientX - canvas.getBoundingClientRect().left
      if (relativeX > 0 && relativeX < canvas.width) {
        touchPosition.current.x = relativeX
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      isTouchDevice.current = true
      handleTouchMove(e)
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchmove", handleTouchMove as EventListener)
    canvas.addEventListener("touchstart", handleTouchStart as EventListener)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchmove", handleTouchMove as EventListener)
      canvas.removeEventListener("touchstart", handleTouchStart as EventListener)
    }
  }, [])

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

  // Collision detection with bricks
  const collisionDetection = useCallback(() => {
    for (let c = 0; c < BRICK_COLUMNS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        const brick = bricks.current[c][r]
        if (brick.status === 1) {
          if (
            ballX.current > brick.x &&
            ballX.current < brick.x + BRICK_WIDTH &&
            ballY.current > brick.y &&
            ballY.current < brick.y + BRICK_HEIGHT
          ) {
            ballDY.current = -ballDY.current
            brick.status = 0
            setScore((prevScore) => prevScore + 10 * level)

            if (soundEffects) {
              try {
                soundEffects("clear")
              } catch (e) {
                console.log("Error playing sound:", e)
              }
            }

            // Check if all bricks are destroyed
            let allBricksDestroyed = true
            for (let c = 0; c < BRICK_COLUMNS; c++) {
              for (let r = 0; r < BRICK_ROWS; r++) {
                if (bricks.current[c][r].status === 1) {
                  allBricksDestroyed = false
                  break
                }
              }
              if (!allBricksDestroyed) break
            }

            if (allBricksDestroyed) {
              if (level < 3) {
                // Next level
                setLevel((prevLevel) => prevLevel + 1)
                ballX.current = CANVAS_WIDTH / 2
                ballY.current = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10
                paddleX.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2
                ballDX.current = BALL_SPEED + level
                ballDY.current = -(BALL_SPEED + level)

                if (soundEffects) {
                  try {
                    soundEffects("levelup")
                  } catch (e) {
                    console.log("Error playing sound:", e)
                  }
                }
              } else {
                // Game won
                setIsGameWon(true)
                setIsGameOver(true)
                if (animationFrameId.current) {
                  cancelAnimationFrame(animationFrameId.current)
                }
                onGameOver(score + 10 * level * BRICK_ROWS * BRICK_COLUMNS)
              }
            }
          }
        }
      }
    }
  }, [level, score, soundEffects, onGameOver])

  // Draw the game
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw bricks
    for (let c = 0; c < BRICK_COLUMNS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        if (bricks.current[c][r].status === 1) {
          const brick = bricks.current[c][r]
          const px = brick.x
          const py = brick.y
          const w = BRICK_WIDTH
          const h = BRICK_HEIGHT

          // Gradient fill
          const gradient = ctx.createLinearGradient(px, py, px, py + h)
          gradient.addColorStop(0, "white")
          gradient.addColorStop(0.2, brick.color)
          gradient.addColorStop(1, darkenColor(brick.color, 40))

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.roundRect(px, py, w, h, 6)
          ctx.fill()

          // Glow effect
          ctx.shadowColor = brick.color
          ctx.shadowBlur = 15
          ctx.strokeStyle = "rgba(255,255,255,0.8)"
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }
    }

    // Draw paddle
    const paddleGradient = ctx.createLinearGradient(
      paddleX.current,
      CANVAS_HEIGHT - PADDLE_HEIGHT,
      paddleX.current,
      CANVAS_HEIGHT,
    )
    paddleGradient.addColorStop(0, "#c084fc") // فاتح
    paddleGradient.addColorStop(1, "#6d28d9") // غامق

    ctx.fillStyle = paddleGradient
    ctx.beginPath()
    ctx.roundRect(paddleX.current, CANVAS_HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, 8)
    ctx.fill()

    // Glow
    ctx.shadowColor = "#a855f7"
    ctx.shadowBlur = 20
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.closePath()

    // Draw ball
    const ballGradient = ctx.createRadialGradient(
      ballX.current,
      ballY.current,
      2,
      ballX.current,
      ballY.current,
      BALL_RADIUS,
    )
    ballGradient.addColorStop(0, "white")
    ballGradient.addColorStop(0.3, "#ec4899")
    ballGradient.addColorStop(1, darkenColor("#ec4899", 40))

    ctx.fillStyle = ballGradient
    ctx.beginPath()
    ctx.arc(ballX.current, ballY.current, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    // Glow
    ctx.shadowColor = "#ec4899"
    ctx.shadowBlur = 20
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.closePath()

    // Collision detection
    collisionDetection()

    // Ball movement and collision with walls
    if (ballX.current + ballDX.current > CANVAS_WIDTH - BALL_RADIUS || ballX.current + ballDX.current < BALL_RADIUS) {
      ballDX.current = -ballDX.current
      if (soundEffects) {
        try {
          soundEffects("move")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    }

    if (ballY.current + ballDY.current < BALL_RADIUS) {
      ballDY.current = -ballDY.current
      if (soundEffects) {
        try {
          soundEffects("move")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    } else if (ballY.current + ballDY.current > CANVAS_HEIGHT - BALL_RADIUS - PADDLE_HEIGHT) {
      if (ballX.current > paddleX.current && ballX.current < paddleX.current + PADDLE_WIDTH) {
        // Ball hits paddle
        ballDY.current = -ballDY.current

        // Adjust ball direction based on where it hit the paddle
        const hitPosition = (ballX.current - paddleX.current) / PADDLE_WIDTH
        ballDX.current = BALL_SPEED * (2 * hitPosition - 1) * 1.5

        if (soundEffects) {
          try {
            soundEffects("rotate")
          } catch (e) {
            console.log("Error playing sound:", e)
          }
        }
      } else if (ballY.current + ballDY.current > CANVAS_HEIGHT - BALL_RADIUS) {
        // Ball hits bottom wall (lose life)
        setLives((prevLives) => prevLives - 1)

        if (lives > 1) {
          // Reset ball and paddle
          ballX.current = CANVAS_WIDTH / 2
          ballY.current = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 10
          paddleX.current = (CANVAS_WIDTH - PADDLE_WIDTH) / 2
          ballDX.current = BALL_SPEED + (level - 1)
          ballDY.current = -(BALL_SPEED + (level - 1))

          if (soundEffects) {
            try {
              soundEffects("drop")
            } catch (e) {
              console.log("Error playing sound:", e)
            }
          }
        } else {
          // Game over
          setIsGameOver(true)
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current)
          }
          onGameOver(score)

          if (soundEffects) {
            try {
              soundEffects("gameover")
            } catch (e) {
              console.log("Error playing sound:", e)
            }
          }
          return
        }
      }
    }

    // Update ball position
    ballX.current += ballDX.current
    ballY.current += ballDY.current

    // Paddle movement with keyboard
    if (rightPressed.current && paddleX.current < CANVAS_WIDTH - PADDLE_WIDTH) {
      paddleX.current += 7
    } else if (leftPressed.current && paddleX.current > 0) {
      paddleX.current -= 7
    }

    // Paddle movement with mouse
    if (mousePosition.current.x > 0 && !isTouchDevice.current) {
      paddleX.current = mousePosition.current.x - PADDLE_WIDTH / 2
      if (paddleX.current < 0) {
        paddleX.current = 0
      } else if (paddleX.current > CANVAS_WIDTH - PADDLE_WIDTH) {
        paddleX.current = CANVAS_WIDTH - PADDLE_WIDTH
      }
    }

    // Paddle movement with touch
    if (isTouchDevice.current) {
      paddleX.current = touchPosition.current.x - PADDLE_WIDTH / 2
      if (paddleX.current < 0) {
        paddleX.current = 0
      } else if (paddleX.current > CANVAS_WIDTH - PADDLE_WIDTH) {
        paddleX.current = CANVAS_WIDTH - PADDLE_WIDTH
      }
    }

    // Continue animation
    if (!isPaused && !isGameOver) {
      animationFrameId.current = requestAnimationFrame(draw)
    }
  }, [isPaused, isGameOver, lives, score, level, collisionDetection, soundEffects, onGameOver])

  // Start/stop game loop
  useEffect(() => {
    if (!isPaused && !isGameOver) {
      animationFrameId.current = requestAnimationFrame(draw)
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [draw, isPaused, isGameOver])

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 
      border-1 border-purple-900 rounded-xl shadow-lg shadow-cyan-700/20 
      bg-gradient-to-r from-cyan-700 to-gray-800 "
      >
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300  text-lg font-bold">Lives: {lives}</span>
        <span className="text-gray-300  text-lg font-bold">Level: {level}</span>
      </div>
        <div className="relative shadow-xl shadow-cyan-700/60 rounded-xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-cyan-500 shadow-lg shadow-cyan-500/20 bg-black/50 rounded-xl"
        />

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold">PAUSED</div>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
            <div className="text-3xl font-bold text-center">{isGameWon ? "YOU WIN!" : "GAME OVER"}</div>
          </div>
        )}
      </div>

      <div className="md:hidden mt-4 w-full max-w-[600px]">
        <div className="grid grid-cols-3 gap-4 px-8 mt-1">
          {/* Left Movement Button */}
          <button
            onTouchStart={handleMoveLeft}
            onClick={handleMoveLeft}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            ←
          </button>

          {/* Pause Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-pink-600/80 hover:bg-pink-500/80 active:bg-pink-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-pink-400/50
                     shadow-lg shadow-pink-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            {isPaused ? "▶️" : "⏸️"}
          </button>

          {/* Right Movement Button */}
          <button
            onTouchStart={handleMoveRight}
            onClick={handleMoveRight}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-1 px-2 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation"
            disabled={isGameOver}
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsPaused(!isPaused)}
        className="px-4 py-2 bg-cyan-700 hover:bg-blue-600 rounded-xl font-bold 
        transition-colors hidden md:block text-sm"          
        disabled={isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>

    </div>
  )
}

function adjustColor(hex: string, percent: number) {
  const num = Number.parseInt(hex.replace("#", ""), 16)
  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00ff) + percent
  let b = (num & 0x0000ff) + percent
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return `rgb(${r},${g},${b})`
}

function lightenColor(hex: string, percent: number) {
  return adjustColor(hex, percent)
}

function darkenColor(hex: string, percent: number) {
  return adjustColor(hex, -percent)
}
