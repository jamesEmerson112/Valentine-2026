import type { Obstacle } from '../types'
import { GRID_CELL_SIZE } from './gameConfig'

const INFLATION = 35 // px buffer around obstacles for sprite clearance

/**
 * Build a 2D navigation grid. 0 = walkable, 1 = blocked.
 * Obstacles are inflated by INFLATION px so sprites don't clip them.
 */
export function buildGrid(
  bounds: { width: number; height: number },
  obstacles: Obstacle[]
): { grid: number[][]; cols: number; rows: number } {
  const cols = Math.ceil(bounds.width / GRID_CELL_SIZE)
  const rows = Math.ceil(bounds.height / GRID_CELL_SIZE)

  // Initialize all walkable
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(0)
  }

  // Mark cells overlapping inflated obstacles as blocked
  for (const obs of obstacles) {
    const left = obs.x - INFLATION
    const top = obs.y - INFLATION
    const right = obs.x + obs.width + INFLATION
    const bottom = obs.y + obs.height + INFLATION

    const minCol = Math.max(0, Math.floor(left / GRID_CELL_SIZE))
    const maxCol = Math.min(cols - 1, Math.floor(right / GRID_CELL_SIZE))
    const minRow = Math.max(0, Math.floor(top / GRID_CELL_SIZE))
    const maxRow = Math.min(rows - 1, Math.floor(bottom / GRID_CELL_SIZE))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        grid[r][c] = 1
      }
    }
  }

  return { grid, cols, rows }
}

export function worldToGrid(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.floor(x / GRID_CELL_SIZE),
    row: Math.floor(y / GRID_CELL_SIZE),
  }
}

export function gridToWorld(row: number, col: number): { x: number; y: number } {
  return {
    x: col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    y: row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
  }
}
