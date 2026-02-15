import type { Sprite, Rat, AgentAssignment, GameEvent, PlayerCommand } from '../types'
import { findPath } from './pathfinding'
import {
  AGENT_SPEED,
  AGENT_SPRINT_SPEED,
  AGENT_AGGRO_RADIUS,
  AGENT_SPRINT_RADIUS,
  AGENT_RAT_CATCH_DISTANCE,
  AGENT_REPATH_INTERVAL,
  AGENT_REPATH_THRESHOLD,
  GRID_CELL_SIZE,
} from './gameConfig'

export interface AgentConfig {
  agentSpeed: number
  agentSprintSpeed: number
  agentAggroRadius: number
  agentSprintRadius: number
  agentRatCatchDistance: number
  agentRepathThreshold: number
  cellSize: number
}

// Per-agent state: wandering (no target) or chasing (has assignment)
const agentStates = new Map<string, 'wandering' | 'chasing'>()

export function resetAgentStates() {
  agentStates.clear()
}

export function isAgent(sprite: Sprite): boolean {
  return sprite.role === 'agent'
}

/** Move agent along waypoints at given speed, returns remaining movement budget */
function moveAlongPath(agent: Sprite, assignment: AgentAssignment, dt: number, speed: number): number {
  let remaining = speed * dt
  while (remaining > 0 && assignment.pathIndex < assignment.path.length) {
    const wp = assignment.path[assignment.pathIndex]
    const dx = wp.x - (agent.x + agent.width / 2)
    const dy = wp.y - (agent.y + agent.height / 2)
    const d = Math.sqrt(dx * dx + dy * dy)

    if (d <= remaining) {
      agent.x = wp.x - agent.width / 2
      agent.y = wp.y - agent.height / 2
      remaining -= d
      assignment.pathIndex++
    } else {
      const ratio = remaining / d
      agent.x += dx * ratio
      agent.y += dy * ratio
      remaining = 0
    }

    if (Math.abs(dx) > 0.5) {
      agent.flipX = dx < 0
    }
  }
  return remaining
}

/**
 * Core agent AI update, called once per frame during gameplay.
 * Agents wander until a rat enters their aggro radius,
 * then chase to kill. Once chasing, they never give up.
 * Returns events for rat catches.
 */
export function updateAgents(
  dt: number,
  agents: Sprite[],
  rats: Rat[],
  assignments: AgentAssignment[],
  grid: number[][] | null,
  gridRows: number,
  gridCols: number,
  _gardenCenter: { x: number; y: number },
  playerCommands: PlayerCommand[],
  config?: AgentConfig,
): GameEvent[] {
  const events: GameEvent[] = []
  if (!grid) return events

  const speed = config?.agentSpeed ?? AGENT_SPEED
  const sprintSpeed = config?.agentSprintSpeed ?? AGENT_SPRINT_SPEED
  const aggroRadius = config?.agentAggroRadius ?? AGENT_AGGRO_RADIUS
  const sprintRadius = config?.agentSprintRadius ?? AGENT_SPRINT_RADIUS
  const catchDistance = config?.agentRatCatchDistance ?? AGENT_RAT_CATCH_DISTANCE
  const repathThreshold = config?.agentRepathThreshold ?? AGENT_REPATH_THRESHOLD
  const cellSize = config?.cellSize ?? GRID_CELL_SIZE

  // 0. Process player commands
  while (playerCommands.length > 0) {
    const cmd = playerCommands.shift()!
    if (cmd.type !== 'move_to') continue

    const agent = agents.find(a => a.id === cmd.spriteId)
    if (!agent) continue

    // Remove any existing assignment for this agent
    for (let i = assignments.length - 1; i >= 0; i--) {
      if (assignments[i].spriteId === cmd.spriteId) {
        assignments.splice(i, 1)
      }
    }

    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2
    const path = findPath(grid, gridRows, gridCols, acx, acy, cmd.destX, cmd.destY, cellSize)
    if (path.length === 0) continue

    assignments.push({
      spriteId: cmd.spriteId,
      targetRatId: -1,
      path,
      pathIndex: 0,
      repathTimer: 0,
      isPlayerDirected: true,
      destination: { x: cmd.destX, y: cmd.destY },
    })
    agentStates.set(cmd.spriteId, 'chasing')
  }

  // 1. Clean stale assignments (target rat despawned or gone)
  for (let i = assignments.length - 1; i >= 0; i--) {
    const a = assignments[i]
    // Skip player-directed assignments (they have no rat target to check)
    if (a.isPlayerDirected) continue
    const rat = rats.find(r => r.id === a.targetRatId)
    if (!rat || rat.despawned) {
      agentStates.set(a.spriteId, 'wandering')
      assignments.splice(i, 1)
    }
  }

  // 2. Build set of already-assigned rat IDs (prevent dogpiling)
  const assignedRatIds = new Set(assignments.filter(a => !a.isPlayerDirected).map(a => a.targetRatId))
  const assignedAgentIds = new Set(assignments.map(a => a.spriteId))

  // 3. For each unassigned agent, scan for rats within aggro radius
  for (const agent of agents) {
    if (assignedAgentIds.has(agent.id)) continue

    // Ensure state exists
    if (!agentStates.has(agent.id)) {
      agentStates.set(agent.id, 'wandering')
    }

    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2

    // Find closest unassigned alive rat within aggro radius
    let bestRat: Rat | null = null
    let bestDist = Infinity
    for (const rat of rats) {
      if (rat.despawned || assignedRatIds.has(rat.id)) continue
      const dx = acx - rat.x
      const dy = acy - rat.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= aggroRadius && dist < bestDist) {
        bestDist = dist
        bestRat = rat
      }
    }

    if (bestRat) {
      const path = findPath(grid, gridRows, gridCols, acx, acy, bestRat.x, bestRat.y, cellSize)
      if (path.length === 0) continue

      assignments.push({
        spriteId: agent.id,
        targetRatId: bestRat.id,
        path,
        pathIndex: 0,
        repathTimer: 0,
      })
      assignedRatIds.add(bestRat.id)
      assignedAgentIds.add(agent.id)
      agentStates.set(agent.id, 'chasing')
    }
  }

  // 4. Move assigned agents along waypoints & handle repath/catch
  for (const assignment of assignments) {
    const agent = agents.find(a => a.id === assignment.spriteId)
    if (!agent) continue

    // --- Player-directed movement ---
    if (assignment.isPlayerDirected && assignment.destination) {
      moveAlongPath(agent, assignment, dt, sprintSpeed)

      // Check arrival: path exhausted and close to destination
      if (assignment.pathIndex >= assignment.path.length) {
        const acx = agent.x + agent.width / 2
        const acy = agent.y + agent.height / 2
        const dx = assignment.destination.x - acx
        const dy = assignment.destination.y - acy
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          agentStates.set(assignment.spriteId, 'wandering')
          // Mark for removal
          assignment.targetRatId = -2
        }
      }
      continue
    }

    // --- Rat-chase movement ---
    const rat = rats.find(r => r.id === assignment.targetRatId)
    if (!rat || rat.despawned) continue

    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2

    // Repath check
    assignment.repathTimer += dt
    const pathEnd = assignment.path[assignment.path.length - 1]
    const ratMoved = pathEnd
      ? Math.sqrt(distSq(pathEnd.x, pathEnd.y, rat.x, rat.y)) > repathThreshold
      : true

    if (assignment.repathTimer >= AGENT_REPATH_INTERVAL && ratMoved) {
      assignment.repathTimer = 0
      const newPath = findPath(grid, gridRows, gridCols, acx, acy, rat.x, rat.y, cellSize)
      if (newPath.length > 0) {
        assignment.path = newPath
        assignment.pathIndex = 0
      }
    }

    // Move along waypoints — sprint if target rat is within sprint radius
    const distToRat = Math.sqrt(distSq(acx, acy, rat.x, rat.y))
    const moveSpeed = distToRat <= sprintRadius ? sprintSpeed : speed
    const remaining = moveAlongPath(agent, assignment, dt, moveSpeed)

    // If we've exhausted waypoints, move directly toward rat
    if (assignment.pathIndex >= assignment.path.length) {
      const updatedAcx = agent.x + agent.width / 2
      const updatedAcy = agent.y + agent.height / 2
      const dx = rat.x - updatedAcx
      const dy = rat.y - updatedAcy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 1 && remaining > 0) {
        const move = Math.min(remaining, d)
        agent.x += (dx / d) * move
        agent.y += (dy / d) * move
        if (Math.abs(dx) > 0.5) {
          agent.flipX = dx < 0
        }
      }
    }

    // Catch check
    const finalAcx = agent.x + agent.width / 2
    const finalAcy = agent.y + agent.height / 2
    const catchDist = Math.sqrt(distSq(finalAcx, finalAcy, rat.x, rat.y))
    if (catchDist < catchDistance) {
      rat.despawned = true
      events.push({ type: 'rat_caught', x: rat.x, y: rat.y })
      // Assignment will be cleaned next frame
    }
  }

  // 5. Remove arrived player-directed assignments (marked with targetRatId -2)
  for (let i = assignments.length - 1; i >= 0; i--) {
    if (assignments[i].isPlayerDirected && assignments[i].targetRatId === -2) {
      assignments.splice(i, 1)
    }
  }

  return events
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}
