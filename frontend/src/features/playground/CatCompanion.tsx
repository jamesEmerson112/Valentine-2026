import { useState, useRef, useEffect, useCallback } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import catSvg from '../../assets/cat-companion.svg'
import './CatCompanion.css'

interface CatCompanionProps {
  spriteSpawnTrigger?: number
  scale?: number
}

export default function CatCompanion({ spriteSpawnTrigger = 0, scale = 1 }: CatCompanionProps) {
  const [pos, setPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const [flipX, setFlipX] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [isExcited, setIsExcited] = useState(false)
  const targetRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const idleTimerRef = useRef(0)

  const catSize = 80 * scale
  const catOffset = 40 * scale

  const handleMouseMove = useCallback((e: PointerEvent) => {
    targetRef.current = { x: e.clientX, y: e.clientY }
    setIsIdle(false)
    idleTimerRef.current = 0
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handleMouseMove)
    return () => window.removeEventListener('pointermove', handleMouseMove)
  }, [handleMouseMove])

  // React to new sprite spawns
  useEffect(() => {
    if (spriteSpawnTrigger === 0) return
    setIsExcited(true)
    const timer = setTimeout(() => setIsExcited(false), 600)
    return () => clearTimeout(timer)
  }, [spriteSpawnTrigger])

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
      className={`cat-companion ${isIdle ? 'cat-idle' : ''} ${isExcited ? 'cat-excited' : ''}`}
      style={{
        transform: `translate(${pos.x - catOffset}px, ${pos.y - catOffset}px) scaleX(${flipX ? -1 : 1})`,
      }}
    >
      <img src={catSvg} alt="" width={catSize} height={catSize} draggable={false} />
    </div>
  )
}
