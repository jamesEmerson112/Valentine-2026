import type { Obstacle, Flower } from '../types'
import {
  OBSTACLE_COUNT_MIN,
  OBSTACLE_COUNT_MAX,
  OBSTACLE_SIZE_MIN,
  OBSTACLE_SIZE_MAX,
  OBSTACLE_GARDEN_CLEARANCE,
  OBSTACLE_FLOWER_CLEARANCE,
} from './gameConfig'

interface ObstacleConfig {
  sizeMin: number
  sizeMax: number
  gardenClearance: number
  flowerClearance: number
  margin: number
  overlapPadding: number
}

interface Rect {
  x: number; y: number; w: number; h: number
}

function rectsOverlap(a: Rect, b: Rect, padding: number): boolean {
  return (
    a.x - padding < b.x + b.w &&
    a.x + a.w + padding > b.x &&
    a.y - padding < b.y + b.h &&
    a.y + a.h + padding > b.y
  )
}

function pointInRect(px: number, py: number, r: Rect, margin: number): boolean {
  return (
    px >= r.x - margin &&
    px <= r.x + r.w + margin &&
    py >= r.y - margin &&
    py <= r.y + r.h + margin
  )
}

/**
 * Generate random obstacles spread across the field, avoiding the garden and flowers.
 */
export function generateObstacles(
  bounds: { width: number; height: number },
  gardenRect: { cx: number; cy: number; w: number; h: number },
  flowers: Flower[],
  config?: ObstacleConfig,
): Obstacle[] {
  const sizeMin = config?.sizeMin ?? OBSTACLE_SIZE_MIN
  const sizeMax = config?.sizeMax ?? OBSTACLE_SIZE_MAX
  const gardenClearance = config?.gardenClearance ?? OBSTACLE_GARDEN_CLEARANCE
  const flowerClearance = config?.flowerClearance ?? OBSTACLE_FLOWER_CLEARANCE
  const margin = config?.margin ?? 20
  const overlapPadding = config?.overlapPadding ?? 10

  const count = OBSTACLE_COUNT_MIN + Math.floor(Math.random() * (OBSTACLE_COUNT_MAX - OBSTACLE_COUNT_MIN + 1))
  const obstacles: Obstacle[] = []

  const gardenBox: Rect = {
    x: gardenRect.cx - gardenRect.w / 2,
    y: gardenRect.cy - gardenRect.h / 2,
    w: gardenRect.w,
    h: gardenRect.h,
  }

  let attempts = 0
  const maxAttempts = count * 50

  while (obstacles.length < count && attempts < maxAttempts) {
    attempts++

    const w = sizeMin + Math.random() * (sizeMax - sizeMin)
    const h = sizeMin + Math.random() * (sizeMax - sizeMin)
    const x = margin + Math.random() * (bounds.width - w - margin * 2)
    const y = margin + Math.random() * (bounds.height - h - margin * 2)
    const candidate: Rect = { x, y, w, h }

    // Check garden clearance
    if (rectsOverlap(candidate, gardenBox, gardenClearance)) continue

    // Check flower clearance
    let tooCloseToFlower = false
    for (const flower of flowers) {
      if (pointInRect(flower.x, flower.y, candidate, flowerClearance)) {
        tooCloseToFlower = true
        break
      }
    }
    if (tooCloseToFlower) continue

    // Check overlap with existing obstacles
    let overlaps = false
    for (const existing of obstacles) {
      const existingRect: Rect = { x: existing.x, y: existing.y, w: existing.width, h: existing.height }
      if (rectsOverlap(candidate, existingRect, overlapPadding)) {
        overlaps = true
        break
      }
    }
    if (overlaps) continue

    obstacles.push({
      id: obstacles.length,
      x,
      y,
      width: w,
      height: h,
      type: Math.random() < 0.5 ? 'rock' : 'bush',
    })
  }

  return obstacles
}
