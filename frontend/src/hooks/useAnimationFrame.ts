import { useRef, useEffect, useCallback } from 'react'

export function useAnimationFrame(callback: (deltaTime: number) => void, active = true) {
  const requestRef = useRef<number>(0)
  const previousTimeRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  callbackRef.current = callback

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== 0) {
      const deltaTime = Math.min(time - previousTimeRef.current, 50) // cap at 50ms
      callbackRef.current(deltaTime)
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (active) {
      previousTimeRef.current = 0
      requestRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(requestRef.current)
    }
  }, [active, animate])
}
