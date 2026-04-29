"use client"

import { useState, useEffect, useCallback, useRef, RefObject } from "react"
import { useKeyboardControls, useTouchControls } from "@/hooks/use-controls"

// Tetris constants - Responsive sizes
const isMobile = typeof window !== "undefined" && window.innerWidth < 768

const BOARD_WIDTH  = isMobile ? 14 : 15;
const BOARD_HEIGHT = isMobile ? 16 : 13;
const BLOCK_SIZE = isMobile ? 25 : 40 
const TICK_RATE_MS = 500

// Tetromino shapes
const TETROMINOES = [
  // I
  {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "#00f0f0", // Cyan
  },
  // J
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#0000f0", // Blue
  },
  // L
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#f0a000", // Orange
  },
  // O
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#f0f000", // Yellow
  },
  // S
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "#00f000", // Green
  },
  // T
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "#a000f0", // Purple
  },
  // Z
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "#f00000", // Red
  },
]

interface TetrisGameProps {
  onGameOver: (score: number) => void
  soundEffects?: (type: string) => void
}

export default function TetrisGame({
  onGameOver,
  soundEffects,
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameBoard, setGameBoard] = useState<string[][]>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill("")),
  )

  // Current tetromino state
  const [currentTetromino, setCurrentTetromino] = useState(TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)])
  const [tetrominoPosition, setTetrominoPosition] = useState({ x: Math.floor(BOARD_WIDTH / 2) - 2, y: 0 })
  const [nextTetromino, setNextTetromino] = useState(TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)])

  // Game state
  const [isGameOver, setIsGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [tickRate, setTickRate] = useState(TICK_RATE_MS)

  // Initialize the game
  useEffect(() => {
    if (isGameOver) {
      onGameOver(score)
    }
  }, [isGameOver, onGameOver, score])

  // Level up based on lines cleared
  useEffect(() => {
    const newLevel = Math.floor(lines / 10) + 1
    if (newLevel !== level) {
      setLevel(newLevel)
      setTickRate(TICK_RATE_MS - (newLevel - 1) * 50)
      if (soundEffects) {
        try {
          soundEffects("levelup")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    }
  }, [lines, level, soundEffects])

  // Check for collision
  const checkCollision = useCallback(
    (tetromino: (typeof TETROMINOES)[0], position: { x: number; y: number }) => {
      const { shape } = tetromino

      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = position.x + x
            const boardY = position.y + y

            // Check boundaries
            if (
              boardX < 0 ||
              boardX >= BOARD_WIDTH ||
              boardY >= BOARD_HEIGHT ||
              (boardY >= 0 && gameBoard[boardY][boardX])
            ) {
              return true
            }
          }
        }
      }

      return false
    },
    [gameBoard],
  )

  // Rotate the tetromino
  const rotateTetromino = useCallback(() => {
    if (isPaused || isGameOver) return

    const rotated = {
      shape: currentTetromino.shape[0].map((_, i) => currentTetromino.shape.map((row) => row[i]).reverse()),
      color: currentTetromino.color,
    }

    if (!checkCollision(rotated, tetrominoPosition)) {
      setCurrentTetromino(rotated)
      if (soundEffects) {
        try {
          soundEffects("rotate")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    }
  }, [isPaused, isGameOver, currentTetromino, tetrominoPosition, checkCollision, soundEffects])

  // Move the tetromino left
  const moveLeft = useCallback(() => {
    if (isPaused || isGameOver) return

    const newPosition = { ...tetrominoPosition, x: tetrominoPosition.x - 1 }
    if (!checkCollision(currentTetromino, newPosition)) {
      setTetrominoPosition(newPosition)
      if (soundEffects) {
        try {
          soundEffects("move")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    }
  }, [isPaused, isGameOver, tetrominoPosition, currentTetromino, checkCollision, soundEffects])

  // Move the tetromino right
  const moveRight = useCallback(() => {
    if (isPaused || isGameOver) return

    const newPosition = { ...tetrominoPosition, x: tetrominoPosition.x + 1 }
    if (!checkCollision(currentTetromino, newPosition)) {
      setTetrominoPosition(newPosition)
      if (soundEffects) {
        try {
          soundEffects("move")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    }
  }, [isPaused, isGameOver, tetrominoPosition, currentTetromino, checkCollision, soundEffects])

  // Move the tetromino down
  const moveDown = useCallback(() => {
    if (isPaused || isGameOver) return

    const newPosition = { ...tetrominoPosition, y: tetrominoPosition.y + 1 }

    if (!checkCollision(currentTetromino, newPosition)) {
      setTetrominoPosition(newPosition)
    } else {
      // Lock the tetromino in place
      const newBoard = [...gameBoard.map((row) => [...row])]

      for (let y = 0; y < currentTetromino.shape.length; y++) {
        for (let x = 0; x < currentTetromino.shape[y].length; x++) {
          if (currentTetromino.shape[y][x]) {
            const boardY = tetrominoPosition.y + y
            const boardX = tetrominoPosition.x + x

            if (boardY < 0) {
              setIsGameOver(true)
              return
            }

            if (boardY >= 0 && boardX >= 0 && boardX < BOARD_WIDTH) {
              newBoard[boardY][boardX] = currentTetromino.color
            }
          }
        }
      }

      // Check for completed lines
      let linesCleared = 0

      // Normal line clearing
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (newBoard[y].every((cell) => cell !== "")) {
          // Remove the line
          newBoard.splice(y, 1)
          // Add a new empty line at the top
          newBoard.unshift(Array(BOARD_WIDTH).fill(""))
          linesCleared++
          y++ // Check the same row again
        }
      }

      // Update score
      if (linesCleared > 0) {
        const linePoints = [0, 100, 300, 500, 800]
        const pointsEarned = linePoints[Math.min(linesCleared, 4)] * level
        setScore((prevScore) => prevScore + pointsEarned)
        setLines((prevLines) => prevLines + linesCleared)
        if (soundEffects) {
          try {
            soundEffects("clear")
          } catch (e) {
            console.log("Error playing sound:", e)
          }
        }
      } else {
        if (soundEffects) {
          try {
            soundEffects("drop")
          } catch (e) {
            console.log("Error playing sound:", e)
          }
        }
      }

      setGameBoard(newBoard)

      // Spawn a new tetromino
      setCurrentTetromino(nextTetromino)
      setNextTetromino(TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)])
      setTetrominoPosition({ x: Math.floor(BOARD_WIDTH / 2) - 2, y: 0 })

      // Check for game over
      if (checkCollision(nextTetromino, { x: Math.floor(BOARD_WIDTH / 2) - 2, y: 0 })) {
        setIsGameOver(true)
      }
    }
  }, [
    isPaused,
    isGameOver,
    tetrominoPosition,
    currentTetromino,
    gameBoard,
    nextTetromino,
    level,
    checkCollision,
    soundEffects,
  ])

  // Hard drop
  const hardDrop = useCallback(() => {
    if (isPaused || isGameOver) return

    let newY = tetrominoPosition.y

    while (!checkCollision(currentTetromino, { ...tetrominoPosition, y: newY + 1 })) {
      newY++
    }

    setTetrominoPosition({ ...tetrominoPosition, y: newY })
    moveDown()
    if (soundEffects) {
      try {
        soundEffects("drop")
      } catch (e) {
        console.log("Error playing sound:", e)
      }
    }
  }, [isPaused, isGameOver, tetrominoPosition, currentTetromino, checkCollision, moveDown, soundEffects])

  // Game tick
  useEffect(() => {
    if (isPaused || isGameOver) return

    const tick = () => {
      moveDown()
    }

    const timerId = setInterval(tick, tickRate)
    return () => clearInterval(timerId)
  }, [isPaused, isGameOver, tickRate, moveDown])

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (gameBoard[y][x]) {
          drawBlock(ctx, x, y, gameBoard[y][x])
        }
      }
    }

    // Draw current tetromino
    if (!isGameOver) {
      drawTetromino(ctx, currentTetromino, tetrominoPosition)
    }

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * BLOCK_SIZE)
      ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE)
      ctx.stroke()
    }
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * BLOCK_SIZE, 0)
      ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE)
      ctx.stroke()
    }
  }, [gameBoard, currentTetromino, tetrominoPosition, isGameOver])

  // Draw a single modern block
  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    const px = x * BLOCK_SIZE
    const py = y * BLOCK_SIZE
    const size = BLOCK_SIZE

    // Create gradient for 3D effect
    const gradient = ctx.createLinearGradient(px, py, px, py + size)
    gradient.addColorStop(0, lightenColor(color, 30)) // افتح اللون شوية من فوق
    gradient.addColorStop(1, darkenColor(color, 30)) // غمّقه من تحت

    // Draw rounded square
    const radius = isMobile ? 3 : 6
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(px + radius, py)
    ctx.lineTo(px + size - radius, py)
    ctx.quadraticCurveTo(px + size, py, px + size, py + radius)
    ctx.lineTo(px + size, py + size - radius)
    ctx.quadraticCurveTo(px + size, py + size, px + size - radius, py + size)
    ctx.lineTo(px + radius, py + size)
    ctx.quadraticCurveTo(px, py + size, px, py + size - radius)
    ctx.lineTo(px, py + radius)
    ctx.quadraticCurveTo(px, py, px + radius, py)
    ctx.closePath()
    ctx.fill()

    // Glossy highlight on top
    const highlight = ctx.createLinearGradient(px, py, px, py + size / 2)
    highlight.addColorStop(0, "rgba(255,255,255,0.6)")
    highlight.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = highlight
    ctx.fillRect(px + 2, py + 2, size - 4, size / 2 - 2)

    // Neon glow + border
    ctx.shadowColor = color
    ctx.shadowBlur = isMobile ? 8 : 15
    ctx.strokeStyle = "white"
    ctx.lineWidth = isMobile ? 1 : 2
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Utility to lighten/darken colors
  function lightenColor(hex: string, percent: number) {
    return adjustColor(hex, percent)
  }
  function darkenColor(hex: string, percent: number) {
    return adjustColor(hex, -percent)
  }
  function adjustColor(hex: string, percent: number) {
    const num = parseInt(hex.replace("#", ""), 16)
    let r = (num >> 16) + percent
    let g = ((num >> 8) & 0x00ff) + percent
    let b = (num & 0x0000ff) + percent
    r = Math.min(255, Math.max(0, r))
    g = Math.min(255, Math.max(0, g))
    b = Math.min(255, Math.max(0, b))
    return `rgb(${r},${g},${b})`
  }

  // Draw the current tetromino
  const drawTetromino = (
    ctx: CanvasRenderingContext2D,
    tetromino: (typeof TETROMINOES)[0],
    position: { x: number; y: number },
  ) => {
    const { shape, color } = tetromino

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          drawBlock(ctx, position.x + x, position.y + y, color)
        }
      }
    }
  }

  // Set up keyboard controls
  useKeyboardControls({
    ArrowLeft: moveLeft,
    ArrowRight: moveRight,
    ArrowDown: moveDown,
    ArrowUp: rotateTetromino,
    " ": hardDrop,
    p: () => {
      setIsPaused(!isPaused)
      if (soundEffects) {
        try {
          soundEffects("move")
        } catch (e) {
          console.log("Error playing sound:", e)
        }
      }
    },
  })

  // Set up touch controls
  const touchControlsRef = useRef<HTMLElement | null>(null)
  useTouchControls(touchControlsRef as RefObject<HTMLElement>, {
    left: moveLeft,
    right: moveRight,
    down: moveDown,
    rotate: rotateTetromino,
    drop: hardDrop,
  })

  // Draw next tetromino preview
  const nextTetrominoCanvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = nextTetrominoCanvas.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Center the tetromino in the preview
    const offsetX = (4 - nextTetromino.shape[0].length) / 2
    const offsetY = (4 - nextTetromino.shape.length) / 2

    // Draw next tetromino with modern blocks
    for (let y = 0; y < nextTetromino.shape.length; y++) {
      for (let x = 0; x < nextTetromino.shape[y].length; x++) {
        if (nextTetromino.shape[y][x]) {
          drawBlock(
            ctx,
            offsetX + x,
            offsetY + y,
            nextTetromino.color
          )
        }
      }
    }
  }, [nextTetromino])

  // Mobile touch control handlers
  const handleMoveLeft = useCallback(() => {
    if (isPaused || isGameOver) return
    moveLeft()
  }, [isPaused, isGameOver, moveLeft])

  const handleMoveRight = useCallback(() => {
    if (isPaused || isGameOver) return
    moveRight()
  }, [isPaused, isGameOver, moveRight])

  const handleMoveDown = useCallback(() => {
    if (isPaused || isGameOver) return
    moveDown()
  }, [isPaused, isGameOver, moveDown])

  const handleRotate = useCallback(() => {
    if (isPaused || isGameOver) return
    rotateTetromino()
  }, [isPaused, isGameOver, rotateTetromino])

  const handleHardDrop = useCallback(() => {
    if (isPaused || isGameOver) return
    hardDrop()
  }, [isPaused, isGameOver, hardDrop])

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[350px] md:max-w-[550px] mb-2 px-4 py-2 border-1 border-purple-900 
      rounded-xl shadow-lg shadow-pink-700/20 bg-gradient-to-r from-pink-900 to-gray-800">
        <span className="text-gray-300 text-lg font-bold">Score: {score}</span>
        <span className="text-gray-300 text-lg font-bold">Lines: {lines}</span>
        <span className="text-gray-300 text-lg font-bold">Level: {level}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
        <div className="relative shadow-xl shadow-pink-700/60 rounded-xl">
          <canvas
            ref={canvasRef}
            width={BOARD_WIDTH * BLOCK_SIZE}
            height={BOARD_HEIGHT * BLOCK_SIZE}
            className="border-2 border-pink-500 shadow-lg shadow-pink-500/20 bg-black/50 rounded-xl"
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

      
      </div>

    <div>

      <div className="grid grid-cols-2 md:grid-cols-2 flex-wrap items-center mt-2 gap-8 pl-2 pr-2">

          
          <button
            onClick={() => {
              setIsPaused(!isPaused)
              if (soundEffects) {
                try {
                  soundEffects("move")
                } catch (e) {
                  console.log("Error playing sound:", e)
                }
              }
            }}
            className="px-4 py-2 bg-pink-700 hover:bg-purple-600 rounded-xl 
            text-sm font-bold transition-colors hidden md:block relative z-50"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>


      <div className="flex flex-col items-center">
          <div className="bg-black/50 rounded-xl border border-purple-500/30 mt-1">
            <canvas
              ref={nextTetrominoCanvas}
              width={4 * BLOCK_SIZE}
              height={4 * BLOCK_SIZE}
              className="bg-black/50 rounded-xl"
            />
          </div>
          <button
  onClick={() => setIsPaused(!isPaused)}
  className="block md:hidden bg-pink-600/80 hover:bg-pink-500/80 active:bg-pink-400/80 
             text-white font-bold py-1 px-8 mt-4 mb-2 rounded-xl border-2 border-pink-400/50
             shadow-lg shadow-pink-500/20 transition-all duration-150
             select-none touch-manipulation"
  disabled={isGameOver}
>
  {isPaused ? "▶️" : "⏸️"}
</button>
        </div>


      {/* Mobile touch controls */}
      <div ref={touchControlsRef as React.RefObject<HTMLDivElement>} className="w-full max-w-xs md:hidden">
        {/* D-pad directional controls */}
        <div className="grid grid-cols-3 grid-rows-2 gap-4">


          {/* Empty top-left */}
          <div></div>

          {/* Rotate button */}
          <button
            onTouchStart={handleRotate}
            onClick={handleRotate}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-2 px-4 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ↻
          </button>

          {/* Empty top-right */}
          <div></div>

          {/* Left button */}
          <button
            onTouchStart={handleMoveLeft}
            onClick={handleMoveLeft}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-2 px-4 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ←
          </button>

       {/* Hard drop button */}
          <button
            onTouchStart={handleHardDrop}
            onClick={handleHardDrop}
            className="bg-pink-600/80 hover:bg-pink-500/80 active:bg-pink-400/80 
                     text-white font-bold py-2 px-4 rounded-xl border-2 border-pink-400/50
                     shadow-lg shadow-pink-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            ⤓
          </button>

          {/* Right button */}
          <button
            onTouchStart={handleMoveRight}
            onClick={handleMoveRight}
            className="bg-purple-600/80 hover:bg-purple-500/80 active:bg-purple-400/80 
                     text-white font-bold py-2 px-4 rounded-xl border-2 border-purple-400/50
                     shadow-lg shadow-purple-500/20 transition-all duration-150
                     select-none touch-manipulation flex items-center justify-center"
            disabled={isGameOver}
          >
            →
          </button>
          
          
        </div>
        <div className=" flex justify-center">
        


          </div>
        </div>
       </div>
      </div>
    </div>
  )
}
