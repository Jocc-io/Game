"use client"

import { useEffect, type RefObject } from "react"

type KeyboardControls = {
  [key: string]: () => void
}

export function useKeyboardControls(controls: KeyboardControls) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (controls[e.key]) {
        e.preventDefault()
        controls[e.key]()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [controls])
}

type TouchControls = {
  left: () => void
  right: () => void
  down: () => void
  rotate: () => void
  drop: () => void
}

export function useTouchControls(ref: RefObject<HTMLElement>, controls: TouchControls) {
  useEffect(() => {
    if (!ref.current) return

    const element = ref.current

    // Handle touch controls
    const handleTouchStart = (e: Event) => {
      e.preventDefault()
      const target = e.target as HTMLElement

      if (target.classList.contains("touch-left")) {
        controls.left()
      } else if (target.classList.contains("touch-right")) {
        controls.right()
      } else if (target.classList.contains("touch-down")) {
        controls.down()
      } else if (target.classList.contains("touch-rotate")) {
        controls.rotate()
      } else if (target.classList.contains("touch-drop")) {
        controls.drop()
      }
    }

    // Add touch event listeners to all buttons
    const buttons = element.querySelectorAll("button")
    buttons.forEach((button) => {
      button.addEventListener("touchstart", handleTouchStart)
      button.addEventListener("click", handleTouchStart) // Add click for desktop testing
    })

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener("touchstart", handleTouchStart)
        button.removeEventListener("click", handleTouchStart)
      })
    }
  }, [ref, controls])
}
