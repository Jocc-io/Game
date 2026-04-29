import { Keyboard, MousePointer, Smartphone } from "lucide-react"

export default function GameInstructions() {
  return (
    <div className="w-full">
      <h3 className="text-lg font-bold mb-4 text-center">How to Play</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
        <div className="bg-black/20 rounded-xl p-4 flex flex-col items-center gap-2 border border-purple-500/20">
          <Keyboard className="w-6 h-6 text-purple-400" />
          <p className="text-center">
            <span className="font-bold block mb-1">Keyboard</span>
            Arrow keys to move
            <br />
            Up Arrow to rotate
            <br />
            Space to hard drop
            <br />P to pause
          </p>
        </div>

        <div className="bg-black/20 rounded-xl p-4 flex flex-col items-center gap-2 border border-purple-500/20">
          <MousePointer className="w-6 h-6 text-purple-400" />
          <p className="text-center">
            <span className="font-bold block mb-1">Mouse</span>
            Click buttons below game
            <br />
            on mobile devices
          </p>
        </div>

        <div className="bg-black/20 rounded-xl p-4 flex flex-col items-center gap-2 border border-purple-500/20">
          <Smartphone className="w-6 h-6 text-purple-400" />
          <p className="text-center">
            <span className="font-bold block mb-1">Touch</span>
            Touch buttons to control
            <br />
            Swipe for faster movement
          </p>
        </div>
      </div>

      
    </div>
  )
}
