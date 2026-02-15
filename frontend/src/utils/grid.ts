import type { Obstacle } from '../types'
import { GRID_CELL_SIZE } from './gameConfig'

/**
 * Build a 2D navigation grid. 0 = walkable, 1 = blocked.
 * Obstacles are inflated by `inflation` px so sprites don't clip them.
 */
export function buildGrid(
  bounds: { width: number; height: number },
  obstacles: Obstacle[],
  cellSize: number = GRID_CELL_SIZE,
  inflation: number = 35,
): { grid: number[][]; cols: number; rows: number } {
  const cols = Math.ceil(bounds.width / cellSize)
  const rows = Math.ceil(bounds.height / cellSize)

  // Initialize all walkable
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(0)
  }

  // Mark cells overlapping inflated obstacles as blocked
  for (const obs of obstacles) {
    const left = obs.x - inflation
    const top = obs.y - inflation
    const right = obs.x + obs.width + inflation
    const bottom = obs.y + obs.height + inflation

    const minCol = Math.max(0, Math.floor(left / cellSize))
    const maxCol = Math.min(cols - 1, Math.floor(right / cellSize))
    const minRow = Math.max(0, Math.floor(top / cellSize))
    const maxRow = Math.min(rows - 1, Math.floor(bottom / cellSize))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        grid[r][c] = 1
      }
    }
  }

  return { grid, cols, rows }
}

export function worldToGrid(x: number, y: number, cellSize: number = GRID_CELL_SIZE): { col: number; row: number } {
  return {
    col: Math.floor(x / cellSize),
    row: Math.floor(y / cellSize),
  }
}

export function gridToWorld(row: number, col: number, cellSize: number = GRID_CELL_SIZE): { x: number; y: number } {
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  }
}
