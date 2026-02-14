interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  shape: 'circle' | 'heart' | 'star'
  gravity: number
  rotation: number
  rotationSpeed: number
}

const MAX_PARTICLES = 500

class ParticleSystem {
  private particles: Particle[] = []

  emit(p: Partial<Particle> & { x: number; y: number }) {
    if (this.particles.length >= MAX_PARTICLES) return
    this.particles.push({
      vx: 0, vy: 0,
      life: 1, maxLife: 1,
      size: 4, color: '#ff6b81',
      shape: 'circle', gravity: 0,
      rotation: 0, rotationSpeed: 0,
      ...p,
    })
  }

  burst(count: number, factory: (i: number) => Partial<Particle> & { x: number; y: number }) {
    for (let i = 0; i < count; i++) {
      this.emit(factory(i))
    }
  }

  update(dt: number) {
    const dtSec = dt / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dtSec
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.x += p.vx * dtSec
      p.y += p.vy * dtSec
      p.vy += p.gravity * dtSec
      p.rotation += p.rotationSpeed * dtSec
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)

      if (p.shape === 'heart') {
        drawHeart(ctx, p.size, p.color)
      } else if (p.shape === 'star') {
        drawStar(ctx, p.size, p.color)
      } else {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  clear() {
    this.particles = []
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  const s = size
  ctx.moveTo(0, s * 0.3)
  ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.5)
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.3)
  ctx.fill()
}

function drawStar(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const r = i === 0 ? size : size
    const method = i === 0 ? 'moveTo' : 'lineTo'
    ctx[method](Math.cos(angle) * r, Math.sin(angle) * r)
    const innerAngle = angle + (2 * Math.PI) / 10
    ctx.lineTo(Math.cos(innerAngle) * (size * 0.4), Math.sin(innerAngle) * (size * 0.4))
  }
  ctx.closePath()
  ctx.fill()
}

// Preset emitters

const PINK_GOLD = ['#ff6b81', '#ff4757', '#ffb8c6', '#ffd700', '#ffaa00']
const GOLD_YELLOW = ['#ffd700', '#ffaa00', '#ffe066', '#fff3b0']
const CONFETTI_COLORS = ['#ff6b81', '#ff4757', '#ffd700', '#4CAF50', '#42a5f5', '#ab47bc', '#ffb8c6']

export function emitRatCaughtParticles(x: number, y: number) {
  const shapes: Particle['shape'][] = ['heart', 'circle', 'star']
  particles.burst(12, (i) => {
    const angle = (i / 12) * Math.PI * 2
    const speed = 60 + Math.random() * 80
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1.0,
      size: 4 + Math.random() * 4,
      color: PINK_GOLD[Math.floor(Math.random() * PINK_GOLD.length)],
      shape: shapes[i % shapes.length],
      gravity: 40,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 4,
    }
  })
}

export function emitBloomParticles(x: number, y: number, stage: number) {
  const count = 8 + stage * 3
  particles.burst(count, (i) => {
    const angle = (i / count) * Math.PI * 2
    const speed = 30 + stage * 15 + Math.random() * 30
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0,
      size: 3 + Math.random() * 3,
      color: GOLD_YELLOW[Math.floor(Math.random() * GOLD_YELLOW.length)],
      shape: 'star' as const,
      gravity: -10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 6,
    }
  })
}

export function emitVictoryParticles(width: number, height: number) {
  const shapes: Particle['shape'][] = ['heart', 'circle', 'star']
  particles.burst(80, () => {
    return {
      x: Math.random() * width,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 60,
      vy: 80 + Math.random() * 120,
      life: 2.0 + Math.random() * 1.5,
      maxLife: 3.5,
      size: 4 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      gravity: 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 5,
    }
  })
}

export const particles = new ParticleSystem()
