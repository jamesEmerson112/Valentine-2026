import { describe, it, expect } from 'vitest'
import { findPath } from '../pathfinding'
import { GRID_CELL_SIZE } from '../gameConfig'

/**
 * Helper: convert grid coords to world coords (center of cell).
 */
function cellCenter(row: number, col: number): { x: number; y: number } {
  return {
    x: col * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    y: row * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
  }
}

/**
 * Helper: create a rows x cols grid filled with 0 (all walkable).
 */
function makeGrid(rows: number, cols: number): number[][] {
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(0)
  }
  return grid
}

/**
 * Helper: compute Euclidean distance between two points.
 */
function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

describe('findPath (A* pathfinding)', () => {
  it('returns a valid path on an open grid', () => {
    // 10x10 grid, all walkable
    const rows = 10
    const cols = 10
    const grid = makeGrid(rows, cols)

    const start = cellCenter(0, 0)
    const goal = cellCenter(9, 9)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Path should not be empty
    expect(path.length).toBeGreaterThan(0)

    // Path should end at the goal cell center
    const last = path[path.length - 1]
    expect(last.x).toBeCloseTo(goal.x, 0)
    expect(last.y).toBeCloseTo(goal.y, 0)
  })

  it('finds the optimal path length on a straight cardinal line', () => {
    // 1x10 grid (single row), start at col 0, goal at col 9
    const rows = 1
    const cols = 10
    const grid = makeGrid(rows, cols)

    const start = cellCenter(0, 0)
    const goal = cellCenter(0, 9)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Path should have 9 waypoints (one per cell from col 1 to col 9, start excluded)
    expect(path.length).toBe(9)

    // Each waypoint should step one cell to the right
    for (let i = 0; i < path.length; i++) {
      const expected = cellCenter(0, i + 1)
      expect(path[i].x).toBeCloseTo(expected.x, 0)
      expect(path[i].y).toBeCloseTo(expected.y, 0)
    }
  })

  it('uses diagonal movement for a diagonal path', () => {
    // 10x10 grid, start (0,0), goal (4,4) -- pure diagonal
    const rows = 10
    const cols = 10
    const grid = makeGrid(rows, cols)

    const start = cellCenter(0, 0)
    const goal = cellCenter(4, 4)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Optimal diagonal path from (0,0) to (4,4) = 4 diagonal steps
    expect(path.length).toBe(4)

    // Path cost should be 4 * sqrt(2) * GRID_CELL_SIZE
    let totalDist = 0
    let prev = start
    for (const wp of path) {
      totalDist += euclidean(prev, wp)
      prev = wp
    }
    const expectedDist = 4 * Math.SQRT2 * GRID_CELL_SIZE
    expect(totalDist).toBeCloseTo(expectedDist, 1)
  })

  it('navigates around a wall obstacle', () => {
    // 5x5 grid with a vertical wall at col 2, rows 0-3 (leaving row 4 open)
    //   0 1 2 3 4
    // 0 . . X . .
    // 1 . . X . .
    // 2 . . X . .
    // 3 . . X . .
    // 4 . . . . .
    const rows = 5
    const cols = 5
    const grid = makeGrid(rows, cols)
    grid[0][2] = 1
    grid[1][2] = 1
    grid[2][2] = 1
    grid[3][2] = 1

    const start = cellCenter(0, 0)
    const goal = cellCenter(0, 4)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Path should exist
    expect(path.length).toBeGreaterThan(0)

    // Path must not pass through any blocked cell
    for (const wp of path) {
      const gridCol = Math.floor(wp.x / GRID_CELL_SIZE)
      const gridRow = Math.floor(wp.y / GRID_CELL_SIZE)
      expect(grid[gridRow][gridCol]).toBe(0)
    }

    // Path should end at goal
    const last = path[path.length - 1]
    expect(last.x).toBeCloseTo(goal.x, 0)
    expect(last.y).toBeCloseTo(goal.y, 0)
  })

  it('handles blocked goal by finding nearest walkable cell', () => {
    // 5x5 grid, goal cell (2,2) is blocked
    const rows = 5
    const cols = 5
    const grid = makeGrid(rows, cols)
    grid[2][2] = 1

    const start = cellCenter(0, 0)
    const goal = cellCenter(2, 2)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Path should exist (fallback to nearest walkable)
    expect(path.length).toBeGreaterThan(0)

    // The last waypoint should NOT be the blocked cell; it should be an adjacent walkable cell
    const last = path[path.length - 1]
    const lastGridCol = Math.floor(last.x / GRID_CELL_SIZE)
    const lastGridRow = Math.floor(last.y / GRID_CELL_SIZE)
    expect(grid[lastGridRow][lastGridCol]).toBe(0)
  })

  it('returns empty array when goal is completely unreachable', () => {
    // 5x5 grid, start at (0,0), goal at (4,4), but blocked by full wall
    // Block row 2 completely + col 2 completely to create isolated regions
    const rows = 5
    const cols = 5
    const grid = makeGrid(rows, cols)
    // Block entire row 2 and entire col 2
    for (let c = 0; c < cols; c++) grid[2][c] = 1
    for (let r = 0; r < rows; r++) grid[r][2] = 1

    const start = cellCenter(0, 0)
    const goal = cellCenter(4, 4)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Goal is unreachable -- the fallback finds nearest walkable to the blocked goal
    // but that walkable cell is in an isolated region from start
    // Actually, nearest walkable to (4,4) could be (3,3) which IS accessible from bottom-right
    // but start (0,0) is in top-left region. Let me re-think the isolation.
    // With row 2 and col 2 fully blocked, (0,0) can reach (0,1) and (1,0) and (1,1)
    // but NOT (3,3) because both row 2 and col 2 are blocked.
    // The nearest walkable to (4,4) might be (4,3), (3,4), or (3,3) -- all in the bottom-right
    // which is isolated from top-left. So path should be empty.
    expect(path).toEqual([])
  })

  it('returns single-point path when start equals goal', () => {
    const rows = 5
    const cols = 5
    const grid = makeGrid(rows, cols)

    const point = cellCenter(2, 2)

    const path = findPath(grid, rows, cols, point.x, point.y, point.x, point.y)

    // Should return exactly 1 waypoint (the goal)
    expect(path.length).toBe(1)
    expect(path[0].x).toBeCloseTo(point.x, 0)
    expect(path[0].y).toBeCloseTo(point.y, 0)
  })

  it('prevents corner-cutting through diagonally adjacent blocked cells', () => {
    // 5x5 grid with two blocked cells at (1,1) and (2,2)
    // An agent at (1,2) heading to (2,1) should NOT cut diagonally
    // because that would clip through the blocked corner of (1,1) or (2,2)
    const rows = 5
    const cols = 5
    const grid = makeGrid(rows, cols)
    grid[1][2] = 1  // blocked
    grid[2][1] = 1  // blocked

    const start = cellCenter(1, 1)
    const goal = cellCenter(2, 2)

    const path = findPath(grid, rows, cols, start.x, start.y, goal.x, goal.y)

    // Path should exist but must go around (not diagonally through the blocked cells)
    expect(path.length).toBeGreaterThan(0)

    // Path should be longer than a simple diagonal (1 step)
    // A direct diagonal from (1,1) to (2,2) would be 1 waypoint.
    // With corner-cutting prevention it must take a longer route.
    expect(path.length).toBeGreaterThan(1)
  })
})
