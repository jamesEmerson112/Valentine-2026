import { useRef, useMemo } from 'react'
import { useAnimationFrame } from '../hooks/useAnimationFrame'
import { useWindowSize } from '../hooks/useWindowSize'
import { drawHeart } from '../utils/canvasHelpers'
import './GrassGround.css'

interface Blade {
  x: number
  height: number
  width: number
  color: string
  phase: number
  hasPinkTip: boolean
}

interface GroundHeart {
  x: number
  y: number
  size: number
  color: string
}

const GRASS_COLORS = ['#7ec88b', '#6abf78', '#5cb870', '#8ed49a', '#72c585']
const PINK_TIP = '#ffb3c1'
const HEART_COLORS = ['#ffb3c1', '#ff8fa3', '#ffc2d1']

function generateBlades(width: number): Blade[] {
  const count = Math.max(200, Math.min(400, Math.floor(width * 0.3)))
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    height: 30 + Math.random() * 50,
    width: 2 + Math.random() * 2,
    color: GRASS_COLORS[Math.floor(Math.random() * GRASS_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
    hasPinkTip: Math.random() < 0.2,
  }))
}

function generateHearts(width: number, canvasHeight: number): GroundHeart[] {
  return Array.from({ length: 5 }, () => ({
    x: Math.random() * width,
    y: canvasHeight - 20 - Math.random() * 40,
    size: 6 + Math.random() * 6,
    color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
  }))
}

export default function GrassGround() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useWindowSize()
  const canvasHeight = Math.min(150, Math.max(120, Math.floor(size.height * 0.15)))

  const blades = useMemo(() => generateBlades(size.width), [size.width])
  const hearts = useMemo(() => generateHearts(size.width, canvasHeight), [size.width, canvasHeight])

  useAnimationFrame((_, time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size.width
    canvas.height = canvasHeight

    // Ground fill gradient
    const groundGrad = ctx.createLinearGradient(0, canvasHeight * 0.4, 0, canvasHeight)
    groundGrad.addColorStop(0, '#5cb870')
    groundGrad.addColorStop(0.5, '#4a9e5e')
    groundGrad.addColorStop(1, '#3d8a50')
    ctx.fillStyle = groundGrad
    ctx.fillRect(0, canvasHeight * 0.5, size.width, canvasHeight * 0.5)

    // Draw hearts at ground level
    for (const h of hearts) {
      ctx.globalAlpha = 0.6
      drawHeart(ctx, h.x, h.y, h.size, h.color)
      ctx.globalAlpha = 1
    }

    // Draw grass blades
    const t = time / 1000
    for (const blade of blades) {
      const swayOffset = Math.sin(t * 1.5 + blade.phase) * (blade.height * 0.12)
      const baseY = canvasHeight
      const tipY = baseY - blade.height

      ctx.beginPath()
      ctx.moveTo(blade.x, baseY)
      ctx.quadraticCurveTo(
        blade.x + swayOffset,
        tipY + blade.height * 0.3,
        blade.x + swayOffset * 0.8,
        tipY
      )
      ctx.lineWidth = blade.width
      ctx.lineCap = 'round'

      if (blade.hasPinkTip) {
        const grad = ctx.createLinearGradient(blade.x, baseY, blade.x, tipY)
        grad.addColorStop(0, blade.color)
        grad.addColorStop(0.7, blade.color)
        grad.addColorStop(1, PINK_TIP)
        ctx.strokeStyle = grad
      } else {
        ctx.strokeStyle = blade.color
      }

      ctx.stroke()
    }
  })

  return (
    <canvas
      ref={canvasRef}
      className="grass-ground"
      width={size.width}
      height={canvasHeight}
      aria-hidden="true"
    />
  )
}
