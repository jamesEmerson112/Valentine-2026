import type { Flower, Rat, Obstacle } from '../types'

/**
 * Draw a flower at its current bloom stage.
 * bloomProgress 0-1 maps to stages: seed(0), sprout(0.2), bud(0.4), blooming(0.6), full bloom(0.8+)
 */
export function drawFlower(ctx: CanvasRenderingContext2D, flower: Flower, time: number) {
  if (!flower.alive) return

  const { x, y, bloomProgress } = flower
  const stage = Math.min(4, Math.floor(bloomProgress * 5))
  const sway = Math.sin(time * 0.001 + flower.id) * 3

  ctx.save()
  ctx.translate(x + sway, y)

  switch (stage) {
    case 0: drawSeed(ctx); break
    case 1: drawSprout(ctx); break
    case 2: drawBud(ctx); break
    case 3: drawBlooming(ctx, time); break
    case 4: drawFullBloom(ctx, time, flower.id); break
  }

  ctx.restore()
}

function drawSeed(ctx: CanvasRenderingContext2D) {
  // Dirt mound
  ctx.fillStyle = '#8B6914'
  ctx.beginPath()
  ctx.ellipse(0, 0, 10, 5, 0, Math.PI, 0)
  ctx.fill()
  // Seed dot
  ctx.fillStyle = '#5C4A1E'
  ctx.beginPath()
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawSprout(ctx: CanvasRenderingContext2D) {
  // Stem
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -16)
  ctx.stroke()
  // Two small leaves
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(-5, -10, 5, 2.5, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(5, -12, 5, 2.5, 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawBud(ctx: CanvasRenderingContext2D) {
  // Taller stem
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -26)
  ctx.stroke()
  // Leaves
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(-6, -14, 6, 3, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(6, -18, 6, 3, 0.4, 0, Math.PI * 2)
  ctx.fill()
  // Closed bud
  ctx.fillStyle = '#81C784'
  ctx.beginPath()
  ctx.ellipse(0, -30, 5, 8, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawBlooming(ctx: CanvasRenderingContext2D, time: number) {
  // Stem
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -30)
  ctx.stroke()
  // Leaves
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(-7, -16, 7, 3, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(7, -22, 7, 3, 0.4, 0, Math.PI * 2)
  ctx.fill()
  // Partially open petals
  const openFactor = 0.6
  const petalCount = 5
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2
    const px = Math.cos(angle) * 7 * openFactor
    const py = -33 + Math.sin(angle) * 7 * openFactor
    ctx.fillStyle = i % 2 === 0 ? '#ff8fa3' : '#ffb3c1'
    ctx.beginPath()
    ctx.ellipse(px, py, 5 * openFactor, 8 * openFactor, angle, 0, Math.PI * 2)
    ctx.fill()
  }
  // Center
  const pulse = 1 + Math.sin(time * 0.003) * 0.1
  ctx.fillStyle = '#FFD54F'
  ctx.beginPath()
  ctx.arc(0, -33, 3.5 * pulse, 0, Math.PI * 2)
  ctx.fill()
}

function drawFullBloom(ctx: CanvasRenderingContext2D, time: number, flowerId: number) {
  // Stem
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, -32)
  ctx.stroke()
  // Leaves
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(-8, -16, 8, 3.5, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(8, -22, 8, 3.5, 0.4, 0, Math.PI * 2)
  ctx.fill()
  // Full petals
  const petalCount = 5
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2
    const px = Math.cos(angle) * 9
    const py = -35 + Math.sin(angle) * 9
    ctx.fillStyle = i % 2 === 0 ? '#ff6b81' : '#ffb3c1'
    ctx.beginPath()
    ctx.ellipse(px, py, 7, 11, angle, 0, Math.PI * 2)
    ctx.fill()
  }
  // Bright center
  const pulse = 1 + Math.sin(time * 0.004) * 0.12
  ctx.fillStyle = '#FFD54F'
  ctx.beginPath()
  ctx.arc(0, -35, 5 * pulse, 0, Math.PI * 2)
  ctx.fill()
  // Sparkle particles
  ctx.fillStyle = 'rgba(255, 255, 200, 0.8)'
  for (let i = 0; i < 3; i++) {
    const sparkAngle = time * 0.002 + flowerId + i * 2.1
    const dist = 14 + Math.sin(time * 0.003 + i) * 4
    const sx = Math.cos(sparkAngle) * dist
    const sy = -35 + Math.sin(sparkAngle) * dist
    ctx.beginPath()
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw a rat facing its movement direction.
 */
export function drawRat(ctx: CanvasRenderingContext2D, rat: Rat, time: number) {
  if (rat.despawned) return

  const { x, y, vx, vy, knockbackTimer, size } = rat
  const heading = Math.atan2(vy, vx)
  const isKnockedBack = knockbackTimer > 0
  const walkBob = Math.sin(time * 0.012) * 2

  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = rat.opacity

  // Spin during knockback
  if (isKnockedBack) {
    ctx.rotate(time * 0.02)
  } else {
    ctx.rotate(heading)
  }

  const s = size / 24 // scale factor

  // Body (grey ellipse)
  ctx.fillStyle = '#888'
  ctx.beginPath()
  ctx.ellipse(0, 0, 10 * s, 6 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Head
  ctx.fillStyle = '#999'
  ctx.beginPath()
  ctx.arc(10 * s, 0, 5 * s, 0, Math.PI * 2)
  ctx.fill()

  // Ears
  ctx.fillStyle = '#FFB6C1'
  ctx.beginPath()
  ctx.arc(12 * s, -5 * s, 2.5 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(12 * s, 5 * s, 2.5 * s, 0, Math.PI * 2)
  ctx.fill()

  // Nose
  ctx.fillStyle = '#FFB6C1'
  ctx.beginPath()
  ctx.arc(15 * s, 0, 1.5 * s, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.arc(12 * s, -2 * s, 1 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(12 * s, 2 * s, 1 * s, 0, Math.PI * 2)
  ctx.fill()

  // Tail (curved)
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-10 * s, 0)
  ctx.quadraticCurveTo(-16 * s, -6 * s, -14 * s, -10 * s)
  ctx.stroke()

  // Legs (4, animated)
  if (!isKnockedBack) {
    ctx.strokeStyle = '#777'
    ctx.lineWidth = 1.5 * s
    const legOffset = walkBob
    // Front legs
    ctx.beginPath()
    ctx.moveTo(5 * s, -5 * s)
    ctx.lineTo(5 * s, -9 * s - legOffset)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(5 * s, 5 * s)
    ctx.lineTo(5 * s, 9 * s + legOffset)
    ctx.stroke()
    // Back legs
    ctx.beginPath()
    ctx.moveTo(-5 * s, -5 * s)
    ctx.lineTo(-5 * s, -9 * s + legOffset)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-5 * s, 5 * s)
    ctx.lineTo(-5 * s, 9 * s - legOffset)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draw an obstacle (rock or bush).
 */
export function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, time: number) {
  ctx.save()
  const cx = obs.x + obs.width / 2
  const cy = obs.y + obs.height / 2

  if (obs.type === 'rock') {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.beginPath()
    ctx.ellipse(cx + 2, cy + obs.height * 0.35, obs.width * 0.45, obs.height * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    // Main body — grey-brown rounded ellipse
    ctx.fillStyle = '#8a8078'
    ctx.beginPath()
    ctx.ellipse(cx, cy, obs.width * 0.45, obs.height * 0.38, 0, 0, Math.PI * 2)
    ctx.fill()

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.ellipse(cx - obs.width * 0.1, cy - obs.height * 0.12, obs.width * 0.25, obs.height * 0.15, -0.3, 0, Math.PI * 2)
    ctx.fill()

    // Cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - obs.width * 0.1, cy - obs.height * 0.05)
    ctx.lineTo(cx + obs.width * 0.05, cy + obs.height * 0.1)
    ctx.stroke()
  } else {
    // Bush — green blob with leaf clusters and slight sway
    const sway = Math.sin(time * 0.0015 + obs.id * 1.7) * 2

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.beginPath()
    ctx.ellipse(cx + 2, cy + obs.height * 0.35, obs.width * 0.45, obs.height * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Main bush shape — three overlapping circles
    const greens = ['#4a8c3f', '#5aa84a', '#3d7a34']
    const offsets = [
      { dx: -obs.width * 0.15, dy: obs.height * 0.05 },
      { dx: obs.width * 0.12, dy: obs.height * 0.08 },
      { dx: 0, dy: -obs.height * 0.08 },
    ]
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = greens[i]
      ctx.beginPath()
      ctx.arc(
        cx + offsets[i].dx + sway * (i === 2 ? 1.2 : 0.6),
        cy + offsets[i].dy,
        obs.width * (i === 2 ? 0.32 : 0.28),
        0, Math.PI * 2,
      )
      ctx.fill()
    }

    // Leaf highlights
    ctx.fillStyle = 'rgba(150,220,100,0.3)'
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + time * 0.0005
      const lx = cx + Math.cos(angle) * obs.width * 0.18 + sway
      const ly = cy + Math.sin(angle) * obs.height * 0.12
      ctx.beginPath()
      ctx.arc(lx, ly, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

/**
 * Draw a subtle dashed rounded rect for the garden boundary.
 */
export function drawGardenBoundary(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number,
  time: number
) {
  const x = cx - w / 2
  const y = cy - h / 2
  const r = 12

  ctx.save()
  ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -time * 0.02

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}
