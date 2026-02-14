import { useState, useRef, useEffect, useCallback } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import catSvg from '../../assets/cat-companion.svg'
import './CatCompanion.css'

export default function CatCompanion() {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const [flipX, setFlipX] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const targetRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const idleTimerRef = useRef(0)

  const handleMouseMove = useCallback((e: PointerEvent) => {
    targetRef.current = { x: e.clientX, y: e.clientY }
    setIsIdle(false)
    idleTimerRef.current = 0
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handleMouseMove)
    return () => window.removeEventListener('pointermove', handleMouseMove)
  }, [handleMouseMove])

  useAnimationFrame((dt) => {
    const lerp = 0.08
    const target = targetRef.current
    const current = posRef.current

    const dx = target.x - current.x
    const dy = target.y - current.y

    const newX = current.x + dx * lerp
    const newY = current.y + dy * lerp

    if (Math.abs(dx) > 2) {
      setFlipX(dx < 0)
    }

    posRef.current = { x: newX, y: newY }
    setPos({ x: newX, y: newY })

    idleTimerRef.current += dt
    if (idleTimerRef.current > 2000) {
      setIsIdle(true)
    }
  })

  return (
    <div
      className={`cat-companion ${isIdle ? 'cat-idle' : ''}`}
      style={{
        transform: `translate(${pos.x - 40}px, ${pos.y - 40}px) scaleX(${flipX ? -1 : 1})`,
      }}
    >
      <img src={catSvg} alt="" width={80} height={80} draggable={false} />
    </div>
  )
}
