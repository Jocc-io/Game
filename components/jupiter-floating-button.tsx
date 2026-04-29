"use client"

import { useState } from "react"
import JupiterSwapModal from "./jupiter-swap-modal"

export default function JupiterFloatingButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-gradient-to-r from-cyan-500 to-purple-600 
                   hover:from-cyan-600 hover:to-purple-700 rounded-full shadow-lg shadow-cyan-500/25 
                   flex items-center justify-center transition-all duration-300 hover:scale-110 
                   border-2 border-cyan-400/30 hover:border-cyan-400/50"
        title="Swap Tokens"
      >
        <img src="/images/jup.png" alt="jupiter" className="w-10 h-10 text-white rounded-full" />
      </button>

      <JupiterSwapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
