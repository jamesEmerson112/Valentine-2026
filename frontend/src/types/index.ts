export interface Sprite {
  id: string
  imageData: string // data URL from canvas extraction
  width: number
  height: number
  x: number
  y: number
  vx: number
  vy: number
  behavior: 'wander' | 'bounce' | 'float' | 'dance'
  angle: number // for wander direction changes
  timer: number // behavior-specific timer
  flipX: boolean
  rotation: number
  speed: number
  role?: 'agent' // present only on bunny/cat; omitted = decorative
}

export interface ValentineData {
  message: string
  from: string
}

// Tower Defense types

export type BloomStage = 0 | 1 | 2 | 3 | 4

export interface Flower {
  id: number
  x: number
  y: number
  bloomProgress: number // 0-1, maps to BloomStage 0-4
  alive: boolean
}

export interface Rat {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  targetFlowerId: number
  knockbackTimer: number
  knockbackVx: number
  knockbackVy: number
  size: number
  opacity: number
  despawned: boolean
}

export type SpawnEdge = 'left' | 'right' | 'top' | 'bottom'

export interface WaveConfig {
  waveNumber: number
  startTime: number // ms into game
  endTime: number
  ratCount: number
  ratSpeed: number
  spawnEdges: SpawnEdge[]
}

export interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'rock' | 'bush'
}

export interface AgentAssignment {
  spriteId: string
  targetRatId: number
  path: { x: number; y: number }[]
  pathIndex: number
  repathTimer: number
}

export type TDGamePhase = 'idle' | 'playing' | 'victory' | 'defeat'

export interface TDGameState {
  phase: TDGamePhase
  elapsedTime: number
  flowers: Flower[]
  rats: Rat[]
  currentWave: number
  ratsSpawnedThisWave: number
  nextRatSpawnTime: number
  debugMode: boolean
  debugTapCount: number
  debugTapTimer: number
  ratIdCounter: number
  obstacles: Obstacle[]
  agentAssignments: AgentAssignment[]
  obstacleIdCounter: number
  grid: number[][] | null
  gridCols: number
  gridRows: number
}
