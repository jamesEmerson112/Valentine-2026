interface StarterFigure {
  name: string
  draw: (ctx: CanvasRenderingContext2D, size: number) => void
}

const figures: StarterFigure[] = [
  {
    name: 'bunny',
    draw: (ctx, size) => {
      const s = size / 80
      // Ears
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#ffc2d1'
      ctx.lineWidth = 1.5 * s
      ctx.beginPath()
      ctx.ellipse(28 * s, 18 * s, 7 * s, 22 * s, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(52 * s, 18 * s, 7 * s, 22 * s, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      // Inner ears
      ctx.fillStyle = '#ffc2d1'
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.ellipse(28 * s, 18 * s, 3.5 * s, 17 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(52 * s, 18 * s, 3.5 * s, 17 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      // Head
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#ffc2d1'
      ctx.lineWidth = 1 * s
      ctx.beginPath()
      ctx.arc(40 * s, 48 * s, 20 * s, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      // Eyes
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(34 * s, 46 * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(46 * s, 46 * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()
      // X mouth
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1.5 * s
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(37 * s, 53 * s); ctx.lineTo(43 * s, 57 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(43 * s, 53 * s); ctx.lineTo(37 * s, 57 * s)
      ctx.stroke()
    },
  },
  {
    name: 'heart',
    draw: (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const s = size * 0.4
      ctx.fillStyle = '#ff6b81'
      ctx.beginPath()
      const top = s * 0.3
      ctx.moveTo(cx, cy - s / 2 + top)
      ctx.bezierCurveTo(cx, cy - s / 2, cx - s / 2, cy - s / 2, cx - s / 2, cy - s / 2 + top)
      ctx.bezierCurveTo(cx - s / 2, cy + top / 2, cx, cy + top / 2, cx, cy + s / 2)
      ctx.bezierCurveTo(cx, cy + top / 2, cx + s / 2, cy + top / 2, cx + s / 2, cy - s / 2 + top)
      ctx.bezierCurveTo(cx + s / 2, cy - s / 2, cx, cy - s / 2, cx, cy - s / 2 + top)
      ctx.fill()
    },
  },
  {
    name: 'cat',
    draw: (ctx, size) => {
      const s = size / 70
      // Body
      ctx.fillStyle = '#ffb3c1'
      ctx.beginPath()
      ctx.ellipse(35 * s, 55 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      // Head
      ctx.beginPath()
      ctx.arc(35 * s, 35 * s, 16 * s, 0, Math.PI * 2)
      ctx.fill()
      // Ears
      ctx.beginPath()
      ctx.moveTo(22 * s, 24 * s); ctx.lineTo(17 * s, 10 * s); ctx.lineTo(30 * s, 22 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(48 * s, 24 * s); ctx.lineTo(53 * s, 10 * s); ctx.lineTo(40 * s, 22 * s)
      ctx.fill()
      // Inner ears
      ctx.fillStyle = '#ff8fa3'
      ctx.beginPath()
      ctx.moveTo(24 * s, 24 * s); ctx.lineTo(20 * s, 14 * s); ctx.lineTo(29 * s, 23 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(46 * s, 24 * s); ctx.lineTo(50 * s, 14 * s); ctx.lineTo(41 * s, 23 * s)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.arc(29 * s, 34 * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(41 * s, 34 * s, 2 * s, 0, Math.PI * 2)
      ctx.fill()
      // Eye shine
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(30 * s, 33 * s, 0.7 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(42 * s, 33 * s, 0.7 * s, 0, Math.PI * 2)
      ctx.fill()
      // Nose
      ctx.fillStyle = '#ff6b81'
      ctx.beginPath()
      ctx.ellipse(35 * s, 39 * s, 1.5 * s, 1 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      // Mouth
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1 * s
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(32 * s, 41 * s)
      ctx.quadraticCurveTo(35 * s, 44 * s, 38 * s, 41 * s)
      ctx.stroke()
      // Whiskers
      ctx.strokeStyle = '#c44569'
      ctx.lineWidth = 0.7 * s
      ctx.beginPath()
      ctx.moveTo(20 * s, 37 * s); ctx.lineTo(12 * s, 35 * s); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(20 * s, 40 * s); ctx.lineTo(12 * s, 41 * s); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(50 * s, 37 * s); ctx.lineTo(58 * s, 35 * s); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(50 * s, 40 * s); ctx.lineTo(58 * s, 41 * s); ctx.stroke()
      // Tail
      ctx.strokeStyle = '#ffb3c1'
      ctx.lineWidth = 3 * s
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(53 * s, 52 * s)
      ctx.quadraticCurveTo(62 * s, 40 * s, 58 * s, 30 * s)
      ctx.stroke()
    },
  },
  {
    name: 'star',
    draw: (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const outerR = size * 0.38
      const innerR = size * 0.15
      const points = 5
      ctx.fillStyle = '#ff8fa3'
      ctx.strokeStyle = '#ff6b81'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = (i * Math.PI) / points - Math.PI / 2
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    },
  },
  {
    name: 'flower',
    draw: (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const petalR = size * 0.16
      const petalDist = size * 0.18
      const petals = 5
      // Petals
      ctx.fillStyle = '#ffb3c1'
      for (let i = 0; i < petals; i++) {
        const angle = (i * Math.PI * 2) / petals - Math.PI / 2
        const px = cx + petalDist * Math.cos(angle)
        const py = cy + petalDist * Math.sin(angle)
        ctx.beginPath()
        ctx.arc(px, py, petalR, 0, Math.PI * 2)
        ctx.fill()
      }
      // Center
      ctx.fillStyle = '#ff6b81'
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2)
      ctx.fill()
    },
  },
]

/**
 * Generate starter sprite data URLs by drawing programmatic figures onto offscreen canvases.
 */
export function generateStarterSprites(): { imageData: string; width: number; height: number }[] {
  return figures.map(fig => {
    const size = 70
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    fig.draw(ctx, size)
    return {
      imageData: canvas.toDataURL(),
      width: size,
      height: size,
    }
  })
}
