import { MinHeap } from './minHeap'
import { worldToGrid, gridToWorld } from './grid'
import { GRID_CELL_SIZE } from './gameConfig'

const SQRT2 = Math.SQRT2

// 8-directional neighbors: [dRow, dCol, cost]
const NEIGHBORS: [number, number, number][] = [
  [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],         // cardinal
  [-1, -1, SQRT2], [-1, 1, SQRT2], [1, -1, SQRT2], [1, 1, SQRT2], // diagonal
]

interface AStarNode {
  row: number
  col: number
  g: number // accumulated cost from start
  f: number // g + heuristic (priority)
}

/** Euclidean distance heuristic (admissible for 8-directional movement). */
function heuristic(row: number, col: number, goalRow: number, goalCol: number): number {
  const dr = row - goalRow
  const dc = col - goalCol
  return Math.sqrt(dr * dr + dc * dc)
}

/**
 * A* shortest path on the navigation grid.
 * Returns an array of world-coordinate waypoints from start to goal.
 * Returns empty array if unreachable.
 */
export function findPath(
  grid: number[][],
  rows: number,
  cols: number,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  cellSize: number = GRID_CELL_SIZE,
): { x: number; y: number }[] {
  const start = worldToGrid(startX, startY, cellSize)
  let goal = worldToGrid(goalX, goalY, cellSize)

  // Clamp to grid bounds
  start.col = Math.max(0, Math.min(cols - 1, start.col))
  start.row = Math.max(0, Math.min(rows - 1, start.row))
  goal.col = Math.max(0, Math.min(cols - 1, goal.col))
  goal.row = Math.max(0, Math.min(rows - 1, goal.row))

  // If goal cell is blocked, find nearest walkable cell
  if (grid[goal.row][goal.col] === 1) {
    goal = findNearestWalkable(grid, rows, cols, goal.row, goal.col)
    if (goal.row === -1) return [] // completely blocked
  }

  // If start is blocked, find nearest walkable
  if (grid[start.row][start.col] === 1) {
    const alt = findNearestWalkable(grid, rows, cols, start.row, start.col)
    if (alt.row === -1) return []
    start.row = alt.row
    start.col = alt.col
  }

  // Early out: already at goal
  if (start.row === goal.row && start.col === goal.col) {
    const w = gridToWorld(goal.row, goal.col, cellSize)
    return [w]
  }

  // A*
  const gCost: number[][] = []
  const cameFrom: Int32Array = new Int32Array(rows * cols).fill(-1)
  for (let r = 0; r < rows; r++) {
    gCost[r] = new Array(cols).fill(Infinity)
  }
  gCost[start.row][start.col] = 0

  const h0 = heuristic(start.row, start.col, goal.row, goal.col)
  const heap = new MinHeap<AStarNode>((a, b) => a.f - b.f)
  heap.push({ row: start.row, col: start.col, g: 0, f: h0 })

  while (heap.size > 0) {
    const cur = heap.pop()!
    if (cur.row === goal.row && cur.col === goal.col) break
    if (cur.g > gCost[cur.row][cur.col]) continue

    for (const [dr, dc, cost] of NEIGHBORS) {
      const nr = cur.row + dr
      const nc = cur.col + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (grid[nr][nc] === 1) continue

      // Prevent diagonal cutting through blocked corners
      if (dr !== 0 && dc !== 0) {
        if (grid[cur.row + dr][cur.col] === 1 || grid[cur.row][cur.col + dc] === 1) continue
      }

      const newG = cur.g + cost
      if (newG < gCost[nr][nc]) {
        gCost[nr][nc] = newG
        cameFrom[nr * cols + nc] = cur.row * cols + cur.col
        const f = newG + heuristic(nr, nc, goal.row, goal.col)
        heap.push({ row: nr, col: nc, g: newG, f })
      }
    }
  }

  // Reconstruct path
  if (gCost[goal.row][goal.col] === Infinity) return []

  const path: { x: number; y: number }[] = []
  let cur = goal.row * cols + goal.col
  const startKey = start.row * cols + start.col
  while (cur !== startKey && cur !== -1) {
    const r = Math.floor(cur / cols)
    const c = cur % cols
    path.push(gridToWorld(r, c, cellSize))
    cur = cameFrom[cur]
  }
  path.reverse()

  return path
}

function findNearestWalkable(
  grid: number[][],
  rows: number,
  cols: number,
  row: number,
  col: number,
): { row: number; col: number } {
  // BFS outward in expanding rings
  for (let radius = 1; radius < Math.max(rows, cols); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
          return { row: nr, col: nc }
        }
      }
    }
  }
  return { row: -1, col: -1 }
}
