import type { Sprite } from '../types'

const BASE_SPEED = 0.06 // pixels per ms

const SPEED_RANGES: Record<Sprite['behavior'], [number, number]> = {
  wander: [0.7, 1.3],
  bounce: [0.8, 1.5],
  float: [0.6, 1.0],
  dance: [0.8, 1.2],
}

/**
 * Generate a per-sprite speed multiplier based on behavior.
 */
export function baseSpeed(behavior: Sprite['behavior']): number {
  const [min, max] = SPEED_RANGES[behavior]
  return min + Math.random() * (max - min)
}

/**
 * Update sprite position based on its behavior. Mutates sprite in place.
 */
export function updateSprite(sprite: Sprite, dt: number, bounds: { width: number; height: number }, scale: number = 1) {
  sprite.timer += dt
  const spd = BASE_SPEED * sprite.speed * scale

  switch (sprite.behavior) {
    case 'wander':
      updateWander(sprite, dt, bounds, spd)
      break
    case 'bounce':
      updateBounce(sprite, dt, bounds, spd)
      break
    case 'float':
      updateFloat(sprite, dt, bounds, spd)
      break
    case 'dance':
      updateDance(sprite, dt, bounds, spd)
      break
  }

  // Subtle rotation accumulation on all behaviors
  sprite.rotation += sprite.speed * 0.0003 * dt
}

function updateWander(sprite: Sprite, dt: number, bounds: { width: number; height: number }, spd: number) {
  // Change direction every 2-4 seconds
  if (sprite.timer > 2000 + Math.random() * 2000) {
    sprite.angle = Math.random() * Math.PI * 2
    sprite.timer = 0
  }

  sprite.vx = Math.cos(sprite.angle) * spd
  sprite.vy = Math.sin(sprite.angle) * spd
  sprite.x += sprite.vx * dt
  sprite.y += sprite.vy * dt
  sprite.flipX = sprite.vx < 0

  // Bounce off walls
  if (sprite.x < 0) { sprite.x = 0; sprite.angle = Math.PI - sprite.angle }
  if (sprite.x + sprite.width > bounds.width) { sprite.x = bounds.width - sprite.width; sprite.angle = Math.PI - sprite.angle }
  if (sprite.y < 0) { sprite.y = 0; sprite.angle = -sprite.angle }
  if (sprite.y + sprite.height > bounds.height) { sprite.y = bounds.height - sprite.height; sprite.angle = -sprite.angle }
}

function updateBounce(sprite: Sprite, dt: number, bounds: { width: number; height: number }, spd: number) {
  // Normalize velocity direction, apply per-sprite speed
  const mag = Math.sqrt(sprite.vx * sprite.vx + sprite.vy * sprite.vy)
  if (mag > 0) {
    sprite.vx = (sprite.vx / mag) * spd
    sprite.vy = (sprite.vy / mag) * spd
  }

  sprite.x += sprite.vx * dt
  sprite.y += sprite.vy * dt
  sprite.flipX = sprite.vx < 0

  if (sprite.x < 0 || sprite.x + sprite.width > bounds.width) {
    sprite.vx *= -1
    sprite.x = Math.max(0, Math.min(sprite.x, bounds.width - sprite.width))
  }
  if (sprite.y < 0 || sprite.y + sprite.height > bounds.height) {
    sprite.vy *= -1
    sprite.y = Math.max(0, Math.min(sprite.y, bounds.height - sprite.height))
  }
}

function updateFloat(sprite: Sprite, dt: number, bounds: { width: number; height: number }, spd: number) {
  // Upward drift with sine wave horizontal movement
  sprite.y -= spd * 0.5 * dt
  sprite.x += Math.sin(sprite.timer * 0.002) * 0.3

  // Wrap around when going off top
  if (sprite.y + sprite.height < 0) {
    sprite.y = bounds.height
    sprite.x = Math.random() * (bounds.width - sprite.width)
  }
  // Keep in horizontal bounds
  if (sprite.x < 0) sprite.x = 0
  if (sprite.x + sprite.width > bounds.width) sprite.x = bounds.width - sprite.width
}

function updateDance(sprite: Sprite, dt: number, bounds: { width: number; height: number }, spd: number) {
  // Horizontal sine wave + vertical bobbing
  const freq = 0.003
  sprite.x += Math.sin(sprite.timer * freq) * spd * dt * 0.8
  sprite.y += Math.cos(sprite.timer * freq * 1.5) * spd * dt * 0.5

  // Keep in bounds
  if (sprite.x < 0) sprite.x = 0
  if (sprite.x + sprite.width > bounds.width) sprite.x = bounds.width - sprite.width
  if (sprite.y < 0) sprite.y = 0
  if (sprite.y + sprite.height > bounds.height) sprite.y = bounds.height - sprite.height

  sprite.flipX = Math.sin(sprite.timer * freq) < 0
}

/**
 * Pick a random behavior for a new sprite.
 */
export function randomBehavior(): Sprite['behavior'] {
  const behaviors: Sprite['behavior'][] = ['wander', 'bounce', 'float', 'dance']
  return behaviors[Math.floor(Math.random() * behaviors.length)]
}

/**
 * Create initial velocity for a sprite based on behavior.
 */
export function initialVelocity(behavior: Sprite['behavior'], scale: number = 1): { vx: number; vy: number } {
  switch (behavior) {
    case 'bounce':
      return { vx: (Math.random() > 0.5 ? 1 : -1) * BASE_SPEED * scale, vy: (Math.random() > 0.5 ? 1 : -1) * BASE_SPEED * scale }
    case 'wander':
      return { vx: 0, vy: 0 }
    case 'float':
      return { vx: 0, vy: -0.03 * scale }
    case 'dance':
      return { vx: 0, vy: 0 }
  }
}
