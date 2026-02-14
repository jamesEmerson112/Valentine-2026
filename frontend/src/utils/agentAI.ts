import type { Sprite, Rat, AgentAssignment, GameEvent } from '../types'
import { findPath } from './pathfinding'
import {
  AGENT_SPEED,
  AGENT_SPRINT_SPEED,
  AGENT_AGGRO_RADIUS,
  AGENT_SPRINT_RADIUS,
  AGENT_RAT_CATCH_DISTANCE,
  AGENT_REPATH_INTERVAL,
  AGENT_REPATH_THRESHOLD,
} from './gameConfig'

// Per-agent state: wandering (no target) or chasing (has assignment)
const agentStates = new Map<string, 'wandering' | 'chasing'>()

export function resetAgentStates() {
  agentStates.clear()
}

export function isAgent(sprite: Sprite): boolean {
  return sprite.role === 'agent'
}

/**
 * Core agent AI update, called once per frame during gameplay.
 * Agents wander until a rat enters their aggro radius (450px),
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
): GameEvent[] {
  const events: GameEvent[] = []
  if (!grid) return events

  // 1. Clean stale assignments (target rat despawned or gone)
  for (let i = assignments.length - 1; i >= 0; i--) {
    const a = assignments[i]
    const rat = rats.find(r => r.id === a.targetRatId)
    if (!rat || rat.despawned) {
      agentStates.set(a.spriteId, 'wandering')
      assignments.splice(i, 1)
    }
  }

  // 2. Build set of already-assigned rat IDs (prevent dogpiling)
  const assignedRatIds = new Set(assignments.map(a => a.targetRatId))
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
      if (dist <= AGENT_AGGRO_RADIUS && dist < bestDist) {
        bestDist = dist
        bestRat = rat
      }
    }

    if (bestRat) {
      const path = findPath(grid, gridRows, gridCols, acx, acy, bestRat.x, bestRat.y)
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
    const rat = rats.find(r => r.id === assignment.targetRatId)
    if (!agent || !rat || rat.despawned) continue

    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2

    // Repath check
    assignment.repathTimer += dt
    const pathEnd = assignment.path[assignment.path.length - 1]
    const ratMoved = pathEnd
      ? Math.sqrt(distSq(pathEnd.x, pathEnd.y, rat.x, rat.y)) > AGENT_REPATH_THRESHOLD
      : true

    if (assignment.repathTimer >= AGENT_REPATH_INTERVAL && ratMoved) {
      assignment.repathTimer = 0
      const newPath = findPath(grid, gridRows, gridCols, acx, acy, rat.x, rat.y)
      if (newPath.length > 0) {
        assignment.path = newPath
        assignment.pathIndex = 0
      }
    }

    // Move along waypoints — sprint if target rat is within sprint radius
    const distToRat = Math.sqrt(distSq(acx, acy, rat.x, rat.y))
    const speed = distToRat <= AGENT_SPRINT_RADIUS ? AGENT_SPRINT_SPEED : AGENT_SPEED
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
    if (catchDist < AGENT_RAT_CATCH_DISTANCE) {
      rat.despawned = true
      events.push({ type: 'rat_caught', x: rat.x, y: rat.y })
      // Assignment will be cleaned next frame
    }
  }

  return events
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}
