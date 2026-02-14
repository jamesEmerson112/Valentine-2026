import type { Sprite, Rat, AgentAssignment } from '../types'
import { MinHeap } from './minHeap'
import { findPath } from './pathfinding'
import {
  AGENT_SPEED,
  AGENT_SPRINT_SPEED,
  AGENT_AGGRO_RADIUS,
  AGENT_RAT_CATCH_DISTANCE,
  AGENT_REPATH_INTERVAL,
  AGENT_REPATH_THRESHOLD,
} from './gameConfig'

export function isAgent(sprite: Sprite): boolean {
  return sprite.role === 'agent'
}

/**
 * Core agent AI update, called once per frame during gameplay.
 * Agents chase the second-closest-to-garden rat using A* pathfinding.
 * The closest rat is skipped (players tend to tap it themselves).
 * Falls back to the only rat if just one exists.
 */
export function updateAgents(
  dt: number,
  agents: Sprite[],
  rats: Rat[],
  assignments: AgentAssignment[],
  grid: number[][] | null,
  gridRows: number,
  gridCols: number,
  gardenCenter: { x: number; y: number },
) {
  if (!grid) return

  // 1. Clean stale assignments (target rat despawned or gone)
  for (let i = assignments.length - 1; i >= 0; i--) {
    const a = assignments[i]
    const rat = rats.find(r => r.id === a.targetRatId)
    if (!rat || rat.despawned) {
      assignments.splice(i, 1)
    }
  }

  // 2. Build rat priority queue — unassigned alive rats sorted by distance to garden
  const assignedRatIds = new Set(assignments.map(a => a.targetRatId))
  const aliveRats = rats.filter(r => !r.despawned && !assignedRatIds.has(r.id))

  const ratQueue = new MinHeap<Rat>((a, b) => {
    const da = distSq(a.x, a.y, gardenCenter.x, gardenCenter.y)
    const db = distSq(b.x, b.y, gardenCenter.x, gardenCenter.y)
    return da - db
  })
  for (const rat of aliveRats) {
    ratQueue.push(rat)
  }

  // Skip the closest-to-garden rat (players tend to tap it themselves).
  // Agents target the second-closest instead. Fall back to the only rat if just 1.
  if (ratQueue.size > 1) {
    ratQueue.pop() // discard the closest rat
  }

  // 3. Assign unassigned agents to second-closest-to-garden rats
  const assignedAgentIds = new Set(assignments.map(a => a.spriteId))
  const availableAgents = agents.filter(a => !assignedAgentIds.has(a.id))

  while (ratQueue.size > 0 && availableAgents.length > 0) {
    const rat = ratQueue.pop()!

    // Find nearest available agent to this rat
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < availableAgents.length; i++) {
      const agent = availableAgents[i]
      const acx = agent.x + agent.width / 2
      const acy = agent.y + agent.height / 2
      const d = distSq(acx, acy, rat.x, rat.y)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    if (bestIdx === -1) break

    const agent = availableAgents[bestIdx]
    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2
    const path = findPath(grid, gridRows, gridCols, acx, acy, rat.x, rat.y)
    if (path.length === 0) continue // no path found, skip

    assignments.push({
      spriteId: agent.id,
      targetRatId: rat.id,
      path,
      pathIndex: 0,
      repathTimer: 0,
    })

    availableAgents.splice(bestIdx, 1)
  }

  // 4. Move assigned agents along waypoints & handle repath/catch
  for (const assignment of assignments) {
    const agent = agents.find(a => a.id === assignment.spriteId)
    const rat = rats.find(r => r.id === assignment.targetRatId)
    if (!agent || !rat || rat.despawned) continue

    const acx = agent.x + agent.width / 2
    const acy = agent.y + agent.height / 2

    // 5. Repath check
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

    // Move along waypoints — sprint if target rat is within aggro radius
    const distToRat = Math.sqrt(distSq(acx, acy, rat.x, rat.y))
    const speed = distToRat <= AGENT_AGGRO_RADIUS ? AGENT_SPRINT_SPEED : AGENT_SPEED
    let remaining = speed * dt
    while (remaining > 0 && assignment.pathIndex < assignment.path.length) {
      const wp = assignment.path[assignment.pathIndex]
      const dx = wp.x - acx
      const dy = wp.y - acy
      const d = Math.sqrt(dx * dx + dy * dy)

      if (d <= remaining) {
        // Reached this waypoint
        agent.x = wp.x - agent.width / 2
        agent.y = wp.y - agent.height / 2
        remaining -= d
        assignment.pathIndex++
      } else {
        // Move toward waypoint
        const ratio = remaining / d
        agent.x += dx * ratio
        agent.y += dy * ratio
        remaining = 0
      }

      // Set facing direction
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

    // 6. Catch check
    const finalAcx = agent.x + agent.width / 2
    const finalAcy = agent.y + agent.height / 2
    const catchDist = Math.sqrt(distSq(finalAcx, finalAcy, rat.x, rat.y))
    if (catchDist < AGENT_RAT_CATCH_DISTANCE) {
      rat.despawned = true
      // Assignment will be cleaned next frame
    }
  }
}

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}
