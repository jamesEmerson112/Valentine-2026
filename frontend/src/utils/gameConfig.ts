import type { WaveConfig, SpawnEdge } from '../types'

// Durations
export const GAME_DURATION_MS = 60_000 // 1 minute
export const TIME_SCALE_DEBUG = 10

// Flowers
export const FLOWER_COUNT = 5
export const BLOOM_STAGE_DECREMENT = 0.2 // one full stage

// Garden sizing (ratio of canvas)
export const GARDEN_WIDTH_RATIO = 0.30
export const GARDEN_HEIGHT_RATIO = 0.30

// Rats
export const RAT_BASE_SPEED = 0.04 // px per ms
export const RAT_SIZE = 48
export const RAT_KNOCKBACK_SPEED = 0.15 // px per ms
export const RAT_KNOCKBACK_DURATION = 400 // ms

// Collision
export const DEFENDER_RAT_COLLISION_DISTANCE = 35 // center-to-center px
export const RAT_FLOWER_HIT_RADIUS = 20 // center-to-center px

// Agent AI
export const AGENT_SPEED = 0.12 // px per ms (3x rat speed)
export const AGENT_SPRINT_SPEED = 0.20 // px per ms (~5x rat speed, used inside aggro radius)
export const AGENT_AGGRO_RADIUS = 450 // px — agents activate when rat enters this radius
export const AGENT_SPRINT_RADIUS = 150 // px — sprint when target rat is within this distance
export const AGENT_RAT_CATCH_DISTANCE = 30 // center-to-center px
export const AGENT_REPATH_INTERVAL = 500 // ms
export const AGENT_REPATH_THRESHOLD = 40 // px — repath if rat moved this far

// Grid / pathfinding
export const GRID_CELL_SIZE = 20 // px per cell

// Obstacles
export const OBSTACLE_COUNT_MIN = 8
export const OBSTACLE_COUNT_MAX = 15
export const OBSTACLE_SIZE_MIN = 30 // px
export const OBSTACLE_SIZE_MAX = 60 // px
export const OBSTACLE_GARDEN_CLEARANCE = 40 // px
export const OBSTACLE_FLOWER_CLEARANCE = 60 // px

// Wave definitions
const SIDES: SpawnEdge[] = ['left', 'right']
const ALL_EDGES: SpawnEdge[] = ['left', 'right', 'top', 'bottom']

export const WAVES: WaveConfig[] = [
  { waveNumber: 1, startTime: 0,       endTime: 60_000,   ratCount: 3,  ratSpeed: 0.8,  spawnEdges: SIDES },
  { waveNumber: 2, startTime: 60_000,  endTime: 120_000,  ratCount: 4,  ratSpeed: 0.9,  spawnEdges: SIDES },
  { waveNumber: 3, startTime: 120_000, endTime: 200_000,  ratCount: 6,  ratSpeed: 1.0,  spawnEdges: [...SIDES, 'top'] },
  { waveNumber: 4, startTime: 200_000, endTime: 260_000,  ratCount: 8,  ratSpeed: 1.15, spawnEdges: ALL_EDGES },
  { waveNumber: 5, startTime: 260_000, endTime: 300_000,  ratCount: 10, ratSpeed: 1.3,  spawnEdges: ALL_EDGES },
]

// ─── Proportional Scaling ────────────────────────────────────────────

const REFERENCE_WIDTH = 1200

export function getGameScale(bounds: { width: number; height: number }): number {
  const effective = Math.min(bounds.width, bounds.height * 1.5)
  return Math.max(0.35, Math.min(1.0, effective / REFERENCE_WIDTH))
}

export interface ScaledConfig {
  scale: number
  ratSize: number
  ratBaseSpeed: number
  ratKnockbackSpeed: number
  defenderRatCollisionDistance: number
  ratFlowerHitRadius: number
  agentSpeed: number
  agentSprintSpeed: number
  agentAggroRadius: number
  agentSprintRadius: number
  agentRatCatchDistance: number
  agentRepathThreshold: number
  gridCellSize: number
  inflation: number
  obstacleSizeMin: number
  obstacleSizeMax: number
  obstacleGardenClearance: number
  obstacleFlowerClearance: number
  obstacleMargin: number
  obstacleOverlapPadding: number
}

export function getScaledConfig(bounds: { width: number; height: number }): ScaledConfig {
  const scale = getGameScale(bounds)
  return {
    scale,
    ratSize: RAT_SIZE * scale,
    ratBaseSpeed: RAT_BASE_SPEED * scale,
    ratKnockbackSpeed: RAT_KNOCKBACK_SPEED * scale,
    defenderRatCollisionDistance: DEFENDER_RAT_COLLISION_DISTANCE * scale,
    ratFlowerHitRadius: RAT_FLOWER_HIT_RADIUS * scale,
    agentSpeed: AGENT_SPEED * scale,
    agentSprintSpeed: AGENT_SPRINT_SPEED * scale,
    agentAggroRadius: AGENT_AGGRO_RADIUS * scale,
    agentSprintRadius: AGENT_SPRINT_RADIUS * scale,
    agentRatCatchDistance: AGENT_RAT_CATCH_DISTANCE * scale,
    agentRepathThreshold: AGENT_REPATH_THRESHOLD * scale,
    gridCellSize: Math.max(15, Math.floor(GRID_CELL_SIZE * scale)),
    inflation: 35 * scale,
    obstacleSizeMin: OBSTACLE_SIZE_MIN * scale,
    obstacleSizeMax: OBSTACLE_SIZE_MAX * scale,
    obstacleGardenClearance: OBSTACLE_GARDEN_CLEARANCE * scale,
    obstacleFlowerClearance: OBSTACLE_FLOWER_CLEARANCE * scale,
    obstacleMargin: 20 * scale,
    obstacleOverlapPadding: 10 * scale,
  }
}
