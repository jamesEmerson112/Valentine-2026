import { describe, it, expect, beforeEach } from 'vitest'
import { updateAgents, resetAgentStates } from '../agentAI'
import type { Sprite, Rat, AgentAssignment, PlayerCommand } from '../../types'
import {
  AGENT_SPEED,
  AGENT_SPRINT_SPEED,
} from '../gameConfig'

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Helper: create a minimal agent sprite centered at (x, y).
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

/**
 * Helper: compute Euclidean distance between two points.
 */
function euclidean(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Helper: compute distance the agent center moved between snapshots.
 */
function agentCenterMovement(
  before: { x: number; y: number },
  agent: Sprite,
): number {
  const afterX = agent.x + agent.width / 2
  const afterY = agent.y + agent.height / 2
  return euclidean(before.x, before.y, afterX, afterY)
}

/**
 * Standalone hitTestAgent extracted from PlaygroundPage for testability.
 * Returns the topmost agent sprite whose bounding box contains (x, y), or null.
 */
function hitTestAgent(x: number, y: number, sprites: Sprite[]): Sprite | null {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i]
    if (s.role !== 'agent') continue
    if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) {
      return s
    }
  }
  return null
}

/* ================================================================== */
/*  Existing tests -- updated to pass playerCommands arg              */
/* ================================================================== */

describe('Agent targeting (closest rat within aggro radius)', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('targets the closest rat to the agent when multiple rats exist', () => {
    // Agent at (500, 300). Rats at various distances from the AGENT:
    // Rat 1 at (400, 500) -- dist from agent ~224px
    // Rat 2 at (300, 500) -- dist from agent ~283px
    // Rat 3 at (200, 500) -- dist from agent ~361px
    // All within AGENT_AGGRO_RADIUS (450px).
    // Current implementation targets closest rat to agent = rat1 (id=1).
    const rat1 = makeRat(1, 400, 500)
    const rat2 = makeRat(2, 300, 500)
    const rat3 = makeRat(3, 200, 500)
    const rats = [rat1, rat2, rat3]

    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(1) // closest to agent
  })

  it('targets the closest rat when 2 rats exist', () => {
    const rat1 = makeRat(1, 400, 500) // closer to agent
    const rat2 = makeRat(2, 300, 500) // farther from agent
    const rats = [rat1, rat2]

    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(1) // closest to agent
  })

  it('falls back to the only rat when exactly 1 rat exists', () => {
    const rat1 = makeRat(1, 400, 500)
    const rats = [rat1]

    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(1)
  })

  it('makes no assignment when 0 rats exist', () => {
    const rats: Rat[] = []
    const agent = makeAgent('agent-1', 500, 300)
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(assignments.length).toBe(0)
  })

  it('with multiple agents, each targets the closest unassigned rat', () => {
    // Rat 1 at (400, 500) -- closest to both agents
    // Rat 2 at (300, 500) -- second closest
    // Rat 3 at (200, 500) -- farthest
    const rat1 = makeRat(1, 400, 500)
    const rat2 = makeRat(2, 300, 500)
    const rat3 = makeRat(3, 200, 500)
    const rats = [rat1, rat2, rat3]

    // Two agents in similar positions
    const agent1 = makeAgent('agent-1', 500, 300)
    const agent2 = makeAgent('agent-2', 500, 310)
    const agents = [agent1, agent2]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // Both agents should get assignments. Agent1 grabs the closest (rat1),
    // then agent2 grabs the next closest unassigned (rat2). No dogpiling.
    expect(assignments.length).toBe(2)
    const assignedRatIds = assignments.map(a => a.targetRatId)
    expect(assignedRatIds).toContain(1)
    expect(assignedRatIds).toContain(2)
  })
})

describe('Agent aggro radius sprint', () => {
  const gridRows = 60
  const gridCols = 60
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 900, y: 900 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('uses sprint speed when target rat is within aggro radius', () => {
    const agent = makeAgent('a1', 200, 500)
    const rat = makeRat(1, 280, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    expect(assignments.length).toBe(1)

    const beforeX = agent.x + agent.width / 2
    const beforeY = agent.y + agent.height / 2
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    const moved = agentCenterMovement({ x: beforeX, y: beforeY }, agent)
    const normalDistance = AGENT_SPEED * dt
    expect(moved).toBeGreaterThan(normalDistance * 1.1)
  })

  it('uses normal speed when target rat is outside aggro radius', () => {
    const agent = makeAgent('a1', 100, 500)
    const rat = makeRat(1, 500, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    expect(assignments.length).toBe(1)

    const beforeX = agent.x + agent.width / 2
    const beforeY = agent.y + agent.height / 2
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    const moved = agentCenterMovement({ x: beforeX, y: beforeY }, agent)
    const normalDistance = AGENT_SPEED * dt
    const sprintDistance = AGENT_SPRINT_SPEED * dt
    expect(moved).toBeLessThanOrEqual(normalDistance * 1.15)
    expect(moved).toBeLessThan(sprintDistance * 0.8)
  })

  it('transitions from normal to sprint speed as rat enters aggro radius', () => {
    const agent = makeAgent('a1', 100, 500)
    const rat = makeRat(1, 360, 500)
    const rats = [rat]
    const agents = [agent]
    const assignments: AgentAssignment[] = []

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    expect(assignments.length).toBe(1)

    const before1X = agent.x + agent.width / 2
    const before1Y = agent.y + agent.height / 2
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    const normalMove = agentCenterMovement({ x: before1X, y: before1Y }, agent)

    const currentAcx = agent.x + agent.width / 2
    const currentAcy = agent.y + agent.height / 2
    rat.x = currentAcx + 80
    rat.y = currentAcy

    const before2X = agent.x + agent.width / 2
    const before2Y = agent.y + agent.height / 2
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    const sprintMove = agentCenterMovement({ x: before2X, y: before2Y }, agent)

    expect(sprintMove).toBeGreaterThan(normalMove * 1.2)
  })
})

/* ================================================================== */
/*  New tests: Player-directed agent commands                          */
/* ================================================================== */

describe('Player command processing', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('creates a player-directed assignment from a move_to command', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // Should create exactly one assignment
    expect(assignments.length).toBe(1)

    const a = assignments[0]
    expect(a.spriteId).toBe('agent-1')
    expect(a.isPlayerDirected).toBe(true)
    expect(a.targetRatId).toBe(-1)
    expect(a.destination).toEqual({ x: 400, y: 400 })
    expect(a.path.length).toBeGreaterThan(0)
    expect(a.pathIndex).toBe(0)
  })

  it('drains the command queue after processing', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // Command queue should be empty after processing
    expect(commands.length).toBe(0)
  })

  it('processes multiple commands in a single frame', () => {
    const agent1 = makeAgent('agent-1', 100, 100)
    const agent2 = makeAgent('agent-2', 200, 200)
    const agents = [agent1, agent2]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
      { type: 'move_to', spriteId: 'agent-2', destX: 300, destY: 300 },
    ]

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    expect(assignments.length).toBe(2)
    expect(commands.length).toBe(0)

    const ids = assignments.map(a => a.spriteId).sort()
    expect(ids).toEqual(['agent-1', 'agent-2'])

    // Both should be player-directed
    for (const a of assignments) {
      expect(a.isPlayerDirected).toBe(true)
      expect(a.targetRatId).toBe(-1)
    }
  })

  it('ignores a command for a nonexistent agent', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'no-such-agent', destX: 400, destY: 400 },
    ]

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // Command consumed but no assignment created
    expect(assignments.length).toBe(0)
    expect(commands.length).toBe(0)
  })
})

describe('Player command overrides active rat chase', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('removes existing rat-chase assignment when player command arrives', () => {
    const agent = makeAgent('agent-1', 200, 200)
    const agents = [agent]
    const rat = makeRat(1, 250, 200) // within aggro radius
    const rats = [rat]
    const assignments: AgentAssignment[] = []

    // First frame: agent gets assigned to chase the rat
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    expect(assignments.length).toBe(1)
    expect(assignments[0].targetRatId).toBe(1)
    expect(assignments[0].isPlayerDirected).toBeUndefined()

    // Second frame: player overrides with a move_to command
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 800, destY: 800 },
    ]
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // The rat-chase assignment should be replaced by the player-directed one
    const agentAssignments = assignments.filter(a => a.spriteId === 'agent-1')
    expect(agentAssignments.length).toBe(1)
    expect(agentAssignments[0].isPlayerDirected).toBe(true)
    expect(agentAssignments[0].targetRatId).toBe(-1)
    expect(agentAssignments[0].destination).toEqual({ x: 800, y: 800 })
  })
})

describe('Player-directed assignments survive stale cleanup', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('does not remove a player-directed assignment during stale cleanup', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = [] // no rats at all
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]

    // Create the player-directed assignment
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)

    // Run another frame with no rats -- stale cleanup would remove a normal
    // assignment whose target rat is gone, but player-directed should survive
    updateAgents(16, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)
    expect(assignments[0].spriteId).toBe('agent-1')
  })

  it('removes a normal assignment whose target rat despawned, but keeps player-directed', () => {
    const agent1 = makeAgent('agent-1', 100, 100)
    const agent2 = makeAgent('agent-2', 200, 200)
    const agents = [agent1, agent2]
    const rat = makeRat(1, 250, 200)
    const rats = [rat]
    const assignments: AgentAssignment[] = []

    // Frame 1: agent-2 chases the rat
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // Frame 2: agent-1 gets a player command
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // Now despawn the rat
    rat.despawned = true

    // Frame 3: stale cleanup should remove agent-2's assignment but keep agent-1's
    updateAgents(16, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    const remaining = assignments.filter(a => a.spriteId === 'agent-1')
    expect(remaining.length).toBe(1)
    expect(remaining[0].isPlayerDirected).toBe(true)

    const ratChaseAssignment = assignments.filter(a => a.spriteId === 'agent-2' && !a.isPlayerDirected)
    expect(ratChaseAssignment.length).toBe(0)
  })
})

describe('Player-directed agents use sprint speed', () => {
  const gridRows = 60
  const gridCols = 60
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 900, y: 900 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('moves at AGENT_SPRINT_SPEED when player-directed', () => {
    // Agent at (100, 500), destination far away at (500, 500)
    const agent = makeAgent('agent-1', 100, 500)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 500, destY: 500 },
    ]

    // Create assignment with dt=0
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)

    // Record position before movement
    const beforeX = agent.x + agent.width / 2
    const beforeY = agent.y + agent.height / 2

    // Move with dt=100ms
    const dt = 100
    updateAgents(dt, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    const moved = agentCenterMovement({ x: beforeX, y: beforeY }, agent)

    // Expected sprint distance = AGENT_SPRINT_SPEED * dt = 0.20 * 100 = 20px
    // With waypoint discretization there may be slight variance, but it should
    // be much closer to sprint speed than normal speed
    const sprintDistance = AGENT_SPRINT_SPEED * dt
    const normalDistance = AGENT_SPEED * dt

    // Should be moving at sprint speed, not normal
    expect(moved).toBeGreaterThan(normalDistance * 1.3)
    // Should be roughly sprint speed (within tolerance for grid discretization)
    expect(moved).toBeCloseTo(sprintDistance, -1) // within 5px tolerance
  })
})

describe('Arrival detection for player-directed movement', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('removes assignment when path is exhausted and agent is within 15px of destination', () => {
    // Place agent very close to destination so it arrives in one frame
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 120, destY: 100 },
    ]

    // Create the assignment
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)
    expect(assignments.length).toBe(1)

    // Move with a large dt so the agent overshoots the path
    // AGENT_SPRINT_SPEED = 0.20, dt = 500 => budget = 100px, destination only ~20px away
    updateAgents(500, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // After arrival, assignment should be removed
    expect(assignments.length).toBe(0)
  })

  it('keeps assignment when path is not yet exhausted', () => {
    // Place agent far from destination
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 800, destY: 800 },
    ]

    // Create the assignment
    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)
    expect(assignments.length).toBe(1)

    // Move with a small dt -- agent won't reach destination
    // AGENT_SPRINT_SPEED = 0.20, dt = 16 => budget = 3.2px
    updateAgents(16, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // Assignment should still be active
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)
  })

  it('does not remove assignment when agent is near destination but path has remaining waypoints', () => {
    // This tests that BOTH conditions are required: path exhausted AND within 15px
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []

    // Manually create a player-directed assignment with remaining waypoints
    // but the agent happens to be within 15px of the destination
    const assignments: AgentAssignment[] = [{
      spriteId: 'agent-1',
      targetRatId: -1,
      path: [
        { x: 200, y: 100 },
        { x: 300, y: 100 },
        { x: 105, y: 100 },  // close to current position
      ],
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: 105, y: 100 },
    }]

    // With pathIndex=0 and 3 waypoints, the path is NOT exhausted
    // Even though destination (105, 100) is within 15px of agent center (100, 100)
    updateAgents(1, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // Assignment should still exist because path is not yet exhausted
    expect(assignments.length).toBe(1)
  })
})

describe('No grid returns early', () => {
  beforeEach(() => {
    resetAgentStates()
  })

  it('returns empty events when grid is null', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]

    const events = updateAgents(0, agents, rats, assignments, null, 0, 0, { x: 500, y: 500 }, commands)

    expect(events.length).toBe(0)
    // Commands should not be processed when grid is null
    expect(assignments.length).toBe(0)
  })
})

/* ================================================================== */
/*  hitTestAgent (bounding box hit test)                               */
/* ================================================================== */

describe('hitTestAgent', () => {
  it('returns the agent whose bounding box contains the point', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const sprites = [agent]

    // Agent center is (100, 100), width/height = 20
    // Bounding box: x=90..110, y=90..110
    const result = hitTestAgent(100, 100, sprites)
    expect(result).toBe(agent)
  })

  it('returns null when the point is outside all agents', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const sprites = [agent]

    const result = hitTestAgent(200, 200, sprites)
    expect(result).toBeNull()
  })

  it('returns null for an empty sprite list', () => {
    const result = hitTestAgent(100, 100, [])
    expect(result).toBeNull()
  })

  it('skips non-agent sprites', () => {
    const decorative: Sprite = {
      id: 'deco-1',
      imageData: '',
      width: 100,
      height: 100,
      x: 50,
      y: 50,
      vx: 0,
      vy: 0,
      behavior: 'wander',
      angle: 0,
      timer: 0,
      flipX: false,
      rotation: 0,
      speed: 0,
      // no role -- decorative
    }
    const sprites = [decorative]

    // Point is inside decorative sprite's bounding box but it's not an agent
    const result = hitTestAgent(75, 75, sprites)
    expect(result).toBeNull()
  })

  it('returns the topmost (last in array) agent when overlapping', () => {
    // Two agents at the same position -- agent-2 is drawn on top (later in array)
    const agent1 = makeAgent('agent-1', 100, 100)
    const agent2 = makeAgent('agent-2', 100, 100)
    const sprites = [agent1, agent2]

    const result = hitTestAgent(100, 100, sprites)
    expect(result).toBe(agent2) // reverse iteration finds agent-2 first
  })

  it('handles edge of bounding box inclusively', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const sprites = [agent]

    // Bounding box: x=90..110, y=90..110
    // Test exact corners
    expect(hitTestAgent(90, 90, sprites)).toBe(agent)    // top-left corner
    expect(hitTestAgent(110, 110, sprites)).toBe(agent)  // bottom-right corner
    expect(hitTestAgent(89, 90, sprites)).toBeNull()      // just outside left
    expect(hitTestAgent(111, 100, sprites)).toBeNull()    // just outside right
  })

  it('finds the correct agent among a mix of agents and decoratives', () => {
    const deco: Sprite = {
      id: 'deco-1',
      imageData: '',
      width: 200,
      height: 200,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      behavior: 'float',
      angle: 0,
      timer: 0,
      flipX: false,
      rotation: 0,
      speed: 0,
    }
    const agent1 = makeAgent('agent-1', 50, 50)   // bounding box 40..60, 40..60
    const agent2 = makeAgent('agent-2', 150, 150)  // bounding box 140..160, 140..160
    const sprites = [deco, agent1, agent2]

    // Click inside agent1's box
    expect(hitTestAgent(50, 50, sprites)).toBe(agent1)
    // Click inside agent2's box
    expect(hitTestAgent(150, 150, sprites)).toBe(agent2)
    // Click inside deco's box but not any agent
    expect(hitTestAgent(10, 10, sprites)).toBeNull()
  })
})

/* ================================================================== */
/*  moveAlongPath behavior (tested via updateAgents + player-directed) */
/* ================================================================== */

describe('moveAlongPath (via player-directed movement)', () => {
  const gridRows = 50
  const gridCols = 50
  const grid = makeGrid(gridRows, gridCols)
  const gardenCenter = { x: 500, y: 500 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('advances pathIndex through multiple waypoints when budget exceeds segment distances', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []

    // Manually craft an assignment with short waypoint segments
    // Each segment is 10px apart, sprint budget at dt=200 is 0.20*200=40px
    // so the agent should pass through 4 waypoints in one frame
    const assignments: AgentAssignment[] = [{
      spriteId: 'agent-1',
      targetRatId: -1,
      path: [
        { x: 110, y: 100 },  // 10px from agent center (100,100)
        { x: 120, y: 100 },  // 10px from previous
        { x: 130, y: 100 },  // 10px
        { x: 140, y: 100 },  // 10px -- total 40px = exactly the budget
        { x: 200, y: 100 },  // 60px more -- agent won't reach this
      ],
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: 200, y: 100 },
    }]

    // dt=200ms, AGENT_SPRINT_SPEED=0.20 => budget=40px
    updateAgents(200, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    // The agent should have advanced through the first 4 waypoints (40px total)
    // and stopped partway to the 5th
    const cx = agent.x + agent.width / 2
    expect(cx).toBeCloseTo(140, 0) // reached waypoint 4 exactly
    // Assignment should still exist (not arrived at destination yet)
    expect(assignments.length).toBe(1)
    expect(assignments[0].pathIndex).toBe(4) // consumed 4 waypoints
  })

  it('stops mid-segment when budget runs out before reaching next waypoint', () => {
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []

    // One far waypoint: 100px away. Budget = 0.20*100 = 20px.
    // Agent should move 20px toward the waypoint but not reach it.
    const assignments: AgentAssignment[] = [{
      spriteId: 'agent-1',
      targetRatId: -1,
      path: [
        { x: 200, y: 100 },  // 100px to the right
      ],
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: 200, y: 100 },
    }]

    updateAgents(100, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    const cx = agent.x + agent.width / 2
    // Should have moved 20px (0.20 * 100ms) from 100 toward 200
    expect(cx).toBeCloseTo(120, 0)
    expect(assignments[0].pathIndex).toBe(0) // waypoint not yet reached
  })

  it('sets flipX=true when agent moves leftward', () => {
    const agent = makeAgent('agent-1', 200, 100)
    agent.flipX = false
    const agents = [agent]
    const rats: Rat[] = []

    // Waypoint to the LEFT of the agent
    const assignments: AgentAssignment[] = [{
      spriteId: 'agent-1',
      targetRatId: -1,
      path: [
        { x: 100, y: 100 },  // 100px to the left
      ],
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: 100, y: 100 },
    }]

    updateAgents(100, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(agent.flipX).toBe(true)
  })

  it('sets flipX=false when agent moves rightward', () => {
    const agent = makeAgent('agent-1', 100, 100)
    agent.flipX = true // start flipped
    const agents = [agent]
    const rats: Rat[] = []

    // Waypoint to the RIGHT of the agent
    const assignments: AgentAssignment[] = [{
      spriteId: 'agent-1',
      targetRatId: -1,
      path: [
        { x: 200, y: 100 },  // 100px to the right
      ],
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: 200, y: 100 },
    }]

    updateAgents(100, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, [])

    expect(agent.flipX).toBe(false)
  })
})

/* ================================================================== */
/*  Edge case: player command to unreachable destination               */
/* ================================================================== */

describe('Player command edge cases', () => {
  const gridRows = 10
  const gridCols = 10
  const gardenCenter = { x: 100, y: 100 }

  beforeEach(() => {
    resetAgentStates()
  })

  it('does not create assignment when destination is unreachable', () => {
    // Create a grid with two disconnected walkable regions separated by a wall.
    // Region A: rows 0-3, cols 0-3 (agent starts here)
    // Region B: rows 6-9, cols 6-9 (destination is here)
    // Wall: row 4 and col 4 are fully blocked, isolating the regions.
    const grid = makeGrid(gridRows, gridCols)
    // Block entire row 4 and entire col 4
    for (let c = 0; c < gridCols; c++) grid[4][c] = 1
    for (let r = 0; r < gridRows; r++) grid[r][4] = 1
    // Also block row 5 and col 5 to prevent diagonal cutting around the wall
    for (let c = 0; c < gridCols; c++) grid[5][c] = 1
    for (let r = 0; r < gridRows; r++) grid[r][5] = 1

    // Agent in region A: cell (1,1), center = (30, 30) with GRID_CELL_SIZE=20
    const agent = makeAgent('agent-1', 30, 30)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []
    // Destination in region B: cell (8,8), center = (170, 170)
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 170, destY: 170 },
    ]

    updateAgents(0, agents, rats, assignments, grid, gridRows, gridCols, gardenCenter, commands)

    // Command should be consumed but no assignment created (path is empty)
    expect(commands.length).toBe(0)
    expect(assignments.length).toBe(0)
  })

  it('player-directed agent is not reassigned to chase a rat', () => {
    const grid = makeGrid(50, 50)
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    // Place a rat within aggro radius
    const rat = makeRat(1, 150, 100)
    const rats = [rat]
    const assignments: AgentAssignment[] = []

    // Issue player command first
    const commands: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 800, destY: 800 },
    ]
    updateAgents(0, agents, rats, assignments, grid, 50, 50, gardenCenter, commands)

    // Agent should have a player-directed assignment, NOT a rat-chase
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)
    expect(assignments[0].targetRatId).toBe(-1)

    // On subsequent frames, agent should NOT be re-targeted to the rat
    updateAgents(16, agents, rats, assignments, grid, 50, 50, gardenCenter, [])
    expect(assignments.length).toBe(1)
    expect(assignments[0].isPlayerDirected).toBe(true)
  })

  it('a second player command to the same agent replaces the first', () => {
    const grid = makeGrid(50, 50)
    const agent = makeAgent('agent-1', 100, 100)
    const agents = [agent]
    const rats: Rat[] = []
    const assignments: AgentAssignment[] = []

    // First command
    const cmd1: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 400, destY: 400 },
    ]
    updateAgents(0, agents, rats, assignments, grid, 50, 50, gardenCenter, cmd1)
    expect(assignments.length).toBe(1)
    expect(assignments[0].destination).toEqual({ x: 400, y: 400 })

    // Second command (different destination)
    const cmd2: PlayerCommand[] = [
      { type: 'move_to', spriteId: 'agent-1', destX: 200, destY: 200 },
    ]
    updateAgents(0, agents, rats, assignments, grid, 50, 50, gardenCenter, cmd2)

    // Should have exactly one assignment with the NEW destination
    const agentAssignments = assignments.filter(a => a.spriteId === 'agent-1')
    expect(agentAssignments.length).toBe(1)
    expect(agentAssignments[0].destination).toEqual({ x: 200, y: 200 })
    expect(agentAssignments[0].isPlayerDirected).toBe(true)
  })
})
