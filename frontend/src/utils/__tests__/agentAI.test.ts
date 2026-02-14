import { describe, it, expect } from 'vitest'
import { updateAgents } from '../agentAI'
import type { Sprite, Rat, AgentAssignment } from '../../types'
import {
  AGENT_SPEED,
  AGENT_SPRINT_SPEED,
} from '../gameConfig'

/**
 * Helper: create a minimal agent sprite at a given position.
 */
function makeAgent(id: string, x: number, y: number): Sprite {
  return {
    id,
    imageData: '',
    width: 20,
    height: 20,
    x: x - 10, // center the sprite so center = (x, y)
    y: y - 10,
    vx: 0,
    vy: 0,
    behavior: 'wander',
    angle: 0,
    timer: 0,
    flipX: false,
    rotation: 0,
    speed: 0,
    role: 'agent',
  }
}

/**
 * Helper: create a minimal rat at a given position.
 */
function makeRat(id: number, x: number, y: number): Rat {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    speed: 0,
    targetFlowerId: 0,
    knockbackTimer: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    size: 24,
    opacity: 1,
    despawned: false,
  }
}

/**
 * Helper: create a simple open grid (all walkable).
 */
function makeGrid(rows: number, cols: number): number[][] {
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols).fill(0)
  }
  return grid
}

describe('Agent targeting (second-closest rat)', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  it('targets the second-closest rat to the garden when 3 rats exist', () => {
    // Place 3 rats at different distances from gardenCenter (500, 500)
    // Rat 1: closest to garden -- distance ~100
    const rat1 = makeRat(1, 400, 500) // dist = 100
    // Rat 2: second closest -- distance ~200
    const rat2 = makeRat(2, 300, 500) // dist = 200
    // Rat 3: farthest -- distance ~300
    const rat3 = makeRat(3, 200, 500) // dist = 300

    const rats = [rat1, rat2, rat3]

    // Place 1 agent near the center (equidistant from all rats to avoid
    // the "nearest agent to rat" selection from interfering)
    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]

    const assignments: AgentAssignment[] = []

    // Call with dt = 0 so the agent doesn't actually move -- we just want assignment
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    // Agent should be assigned to rat2 (the SECOND closest to garden),
    // not rat1 (the closest)
    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(2) // rat2, the second closest
  })

  it('targets the second-closest rat when 2 rats exist', () => {
    // Rat 1: closest (dist 100)
    const rat1 = makeRat(1, 400, 500)
    // Rat 2: second closest (dist 200)
    const rat2 = makeRat(2, 300, 500)

    const rats = [rat1, rat2]

    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(2) // second closest
  })

  it('falls back to the only rat when exactly 1 rat exists', () => {
    const rat1 = makeRat(1, 400, 500)
    const rats = [rat1]

    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    // With only 1 rat, agent must target it (fallback)
    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(1)
  })

  it('makes no assignment when 0 rats exist', () => {
    const rats: Rat[] = []
    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    expect(assignments.length).toBe(0)
  })

  it('with multiple agents and 3+ rats, skips the closest rat entirely', () => {
    // Rat 1: closest (dist 100)
    const rat1 = makeRat(1, 400, 500)
    // Rat 2: second closest (dist 200)
    const rat2 = makeRat(2, 300, 500)
    // Rat 3: farthest (dist 300)
    const rat3 = makeRat(3, 200, 500)

    const rats = [rat1, rat2, rat3]

    // Two agents in similar positions
    const agent1 = makeAgent('agent-1', 500, 300)
    const agent2 = makeAgent('agent-2', 500, 310)
    const agents = [agent1, agent2]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    // With the new logic: skip closest rat (rat1), assign from remaining.
    // So agents should get rat2 and rat3. Rat1 should NOT be assigned.
    expect(assignments.length).toBe(2)

    const assignedRatIds = assignments.map(a => a.targetRatId)
    expect(assignedRatIds).not.toContain(1) // closest rat should be skipped
    expect(assignedRatIds).toContain(2)     // second closest should be assigned
    expect(assignedRatIds).toContain(3)     // third closest should be assigned
  })
})

/* ------------------------------------------------------------------ */
/*  Helper: compute Euclidean distance between two points              */
/* ------------------------------------------------------------------ */
function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

/* ------------------------------------------------------------------ */
/*  Helper: compute distance the agent center moved between snapshots  */
/* ------------------------------------------------------------------ */
function agentCenterMovement(
  before: { x: number; y: number },
  agent: Sprite,
): number {
  const afterX = agent.x + agent.width / 2
  const afterY = agent.y + agent.height / 2
  return euclidean(before.x, before.y, afterX, afterY)
}

describe('Agent aggro radius sprint', () => {
  // Large open grid so A* paths are essentially straight lines
  const gridRows = 60
  const gridCols = 60
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 900, y: 900 } // far away so targeting logic is predictable

  it('uses sprint speed when target rat is within aggro radius', () => {
    // Agent at (200, 500), rat at (280, 500) -- 80px apart, well within 150px radius
    const agent = makeAgent('a1', 200, 500)
    const rat = makeRat(1, 280, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    // First call with dt=0 to create assignment without moving
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)
    expect(assignments.length).toBe(1)

    // Record agent center before movement
    const beforeX = agent.x + agent.width / 2
    const beforeY = agent.y + agent.height / 2

    // Now move with dt=100ms
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    const moved = agentCenterMovement({ x: beforeX, y: beforeY }, agent)

    // Sprint distance = AGENT_SPRINT_SPEED * 100 = 20px
    // Normal distance = AGENT_SPEED * 100 = 12px
    // Agent should have moved at sprint speed (within aggro radius)
    // Use a generous lower bound to account for waypoint discretization
    const normalDistance = AGENT_SPEED * dt
    expect(moved).toBeGreaterThan(normalDistance * 1.1)
  })

  it('uses normal speed when target rat is outside aggro radius', () => {
    // Agent at (100, 500), rat at (500, 500) -- 400px apart, outside 150px radius
    const agent = makeAgent('a1', 100, 500)
    const rat = makeRat(1, 500, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    // Assign with dt=0
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)
    expect(assignments.length).toBe(1)

    const beforeX = agent.x + agent.width / 2
    const beforeY = agent.y + agent.height / 2

    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)

    const moved = agentCenterMovement({ x: beforeX, y: beforeY }, agent)

    // Normal distance = AGENT_SPEED * 100 = 12px
    // Sprint distance = AGENT_SPRINT_SPEED * 100 = 20px
    // Agent should have moved at normal speed (outside aggro radius)
    const normalDistance = AGENT_SPEED * dt
    const sprintDistance = AGENT_SPRINT_SPEED * dt
    expect(moved).toBeLessThanOrEqual(normalDistance * 1.15) // allow small tolerance
    expect(moved).toBeLessThan(sprintDistance * 0.8) // definitely not sprinting
  })

  it('transitions from normal to sprint speed as rat enters aggro radius', () => {
    // Agent at (100, 500), rat starts at (360, 500) -- 260px apart, outside radius
    const agent = makeAgent('a1', 100, 500)
    const rat = makeRat(1, 360, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    // Assign
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)
    expect(assignments.length).toBe(1)

    // Step 1: normal speed (rat is 260px away, outside AGENT_AGGRO_RADIUS)
    const before1X = agent.x + agent.width / 2
    const before1Y = agent.y + agent.height / 2
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)
    const normalMove = agentCenterMovement({ x: before1X, y: before1Y }, agent)

    // Step 2: move rat close to agent so it is within aggro radius
    const currentAcx = agent.x + agent.width / 2
    const currentAcy = agent.y + agent.height / 2
    rat.x = currentAcx + 80 // 80px away, inside 150px radius
    rat.y = currentAcy

    const before2X = agent.x + agent.width / 2
    const before2Y = agent.y + agent.height / 2
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter)
    const sprintMove = agentCenterMovement({ x: before2X, y: before2Y }, agent)

    // The sprint movement should be noticeably larger than the normal movement
    expect(sprintMove).toBeGreaterThan(normalMove * 1.2)
  })
})
