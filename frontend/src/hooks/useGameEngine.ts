import { useRef, useCallback } from 'react'
import type { TDGameState, Flower, Rat, SpawnEdge, Sprite, GameEvent } from '../types'
import {
  GAME_DURATION_MS,
  TIME_SCALE_DEBUG,
  FLOWER_COUNT,
  BLOOM_STAGE_DECREMENT,
  GARDEN_WIDTH_RATIO,
  GARDEN_HEIGHT_RATIO,
  RAT_BASE_SPEED,
  RAT_SIZE,
  RAT_FLOWER_HIT_RADIUS,
  WAVES,
} from '../utils/gameConfig'
import { generateObstacles } from '../utils/obstacleGenerator'
import { buildGrid } from '../utils/grid'
import { updateAgents, isAgent, resetAgentStates } from '../utils/agentAI'

// Track previous bloom stages per flower to detect stage crossings
const prevBloomStages = new Map<number, number>()

function bloomStageIndex(progress: number): number {
  // stages at 0.2, 0.4, 0.6, 0.8, 1.0
  if (progress >= 1.0) return 5
  if (progress >= 0.8) return 4
  if (progress >= 0.6) return 3
  if (progress >= 0.4) return 2
  if (progress >= 0.2) return 1
  return 0
}

function createInitialState(): TDGameState {
  return {
    phase: 'idle',
    elapsedTime: 0,
    flowers: [],
    rats: [],
    currentWave: 0,
    ratsSpawnedThisWave: 0,
    nextRatSpawnTime: 0,
    debugMode: import.meta.env.VITE_DEBUG === 'true',
    ratIdCounter: 0,
    obstacles: [],
    agentAssignments: [],
    obstacleIdCounter: 0,
    grid: null,
    gridCols: 0,
    gridRows: 0,
    events: [],
  }
}

export function useGameEngine() {
  const stateRef = useRef<TDGameState>(createInitialState())

  const getGardenRect = useCallback((bounds: { width: number; height: number }) => {
    const w = bounds.width * GARDEN_WIDTH_RATIO
    const h = bounds.height * GARDEN_HEIGHT_RATIO
    const cx = bounds.width / 2
    const cy = bounds.height / 2
    return { cx, cy, w, h }
  }, [])

  const startGame = useCallback((bounds: { width: number; height: number }) => {
    const state = stateRef.current
    const { cx, cy, w, h } = getGardenRect(bounds)

    // Place flowers in a pentagon pattern within the garden
    const flowers: Flower[] = []
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const angle = (i / FLOWER_COUNT) * Math.PI * 2 - Math.PI / 2
      const rx = w * 0.3
      const ry = h * 0.3
      flowers.push({
        id: i,
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        bloomProgress: 0,
        alive: true,
      })
    }

    state.phase = 'playing'
    state.elapsedTime = 0
    state.flowers = flowers
    state.rats = []
    state.currentWave = 0
    state.ratsSpawnedThisWave = 0
    state.nextRatSpawnTime = 0
    state.ratIdCounter = 0
    state.events = []

    // Generate obstacles and navigation grid
    state.obstacles = generateObstacles(bounds, { cx, cy, w, h }, flowers)
    state.obstacleIdCounter = state.obstacles.length
    const gridData = buildGrid(bounds, state.obstacles)
    state.grid = gridData.grid
    state.gridCols = gridData.cols
    state.gridRows = gridData.rows
    state.agentAssignments = []

    // Reset agent AI state
    resetAgentStates()
    prevBloomStages.clear()
  }, [getGardenRect])

  const resetGame = useCallback(() => {
    const fresh = createInitialState()
    fresh.debugMode = stateRef.current.debugMode // preserve debug toggle
    Object.assign(stateRef.current, fresh)
    resetAgentStates()
    prevBloomStages.clear()
  }, [])

  const spawnRat = useCallback((
    state: TDGameState,
    bounds: { width: number; height: number },
    edge: SpawnEdge,
    speed: number
  ) => {
    const aliveFlowers = state.flowers.filter(f => f.alive)
    if (aliveFlowers.length === 0) return

    const targetFlower = aliveFlowers[Math.floor(Math.random() * aliveFlowers.length)]
    let x: number, y: number

    const margin = RAT_SIZE
    switch (edge) {
      case 'left':
        x = -margin
        y = Math.random() * bounds.height
        break
      case 'right':
        x = bounds.width + margin
        y = Math.random() * bounds.height
        break
      case 'top':
        x = Math.random() * bounds.width
        y = -margin
        break
      case 'bottom':
        x = Math.random() * bounds.width
        y = bounds.height + margin
        break
    }

    const dx = targetFlower.x - x
    const dy = targetFlower.y - y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const actualSpeed = RAT_BASE_SPEED * speed

    state.rats.push({
      id: state.ratIdCounter++,
      x,
      y,
      vx: (dx / dist) * actualSpeed,
      vy: (dy / dist) * actualSpeed,
      speed: actualSpeed,
      targetFlowerId: targetFlower.id,
      knockbackTimer: 0,
      knockbackVx: 0,
      knockbackVy: 0,
      size: RAT_SIZE,
      opacity: 1,
      despawned: false,
    })

    state.events.push({ type: 'rat_spawned', x, y })
  }, [])

  const update = useCallback((
    rawDt: number,
    bounds: { width: number; height: number },
    sprites: Sprite[]
  ) => {
    const state = stateRef.current
    if (state.phase !== 'playing') return

    const timeScale = state.debugMode ? TIME_SCALE_DEBUG : 1
    const gameTimeDt = rawDt * timeScale
    const physicsDt = rawDt

    // 1. Advance elapsed time
    state.elapsedTime += gameTimeDt

    // 2. Update flower bloom (fixed rate: full bloom in GAME_DURATION_MS)
    for (const flower of state.flowers) {
      if (!flower.alive) continue
      const prevProgress = flower.bloomProgress
      flower.bloomProgress += (1 / GAME_DURATION_MS) * physicsDt
      if (flower.bloomProgress > 1) flower.bloomProgress = 1

      // Check for bloom stage crossing
      const prevStage = prevBloomStages.get(flower.id) ?? bloomStageIndex(prevProgress)
      const newStage = bloomStageIndex(flower.bloomProgress)
      if (newStage > prevStage) {
        state.events.push({ type: 'bloom_stage', x: flower.x, y: flower.y, stage: newStage })
      }
      prevBloomStages.set(flower.id, newStage)
    }

    // 3. Check victory: all flowers fully bloomed
    if (state.flowers.every(f => f.alive && f.bloomProgress >= 1)) {
      state.phase = 'victory'
      state.events.push({ type: 'victory' })
      return
    }

    // 4. Check defeat: all flowers dead
    if (state.flowers.every(f => !f.alive)) {
      state.phase = 'defeat'
      state.events.push({ type: 'defeat' })
      return
    }

    // 5. Wave spawning (repeats last wave endlessly)
    let wave = WAVES.find(w =>
      state.elapsedTime >= w.startTime && state.elapsedTime < w.endTime
    )
    const lastWave = WAVES[WAVES.length - 1]
    if (!wave && state.elapsedTime >= lastWave.endTime) {
      wave = lastWave // endless last wave
    }
    if (wave) {
      if (wave.waveNumber !== state.currentWave) {
        state.currentWave = wave.waveNumber
        state.ratsSpawnedThisWave = 0
        const waveDuration = wave.endTime - wave.startTime
        state.nextRatSpawnTime = wave.startTime + waveDuration / (wave.ratCount + 1)
      }

      // For the endless last wave, use a fixed spawn interval
      const isEndless = state.elapsedTime >= lastWave.endTime
      if (isEndless) {
        const interval = (lastWave.endTime - lastWave.startTime) / (lastWave.ratCount + 1)
        state.nextRatSpawnTime -= gameTimeDt
        if (state.nextRatSpawnTime <= 0) {
          state.nextRatSpawnTime = interval
          const edge = lastWave.spawnEdges[Math.floor(Math.random() * lastWave.spawnEdges.length)]
          spawnRat(state, bounds, edge, lastWave.ratSpeed)
        }
      } else if (state.ratsSpawnedThisWave < wave.ratCount) {
        const waveDuration = wave.endTime - wave.startTime
        const interval = waveDuration / (wave.ratCount + 1)
        const nextSpawnAt = wave.startTime + interval * (state.ratsSpawnedThisWave + 1)

        if (state.elapsedTime >= nextSpawnAt) {
          const edge = wave.spawnEdges[Math.floor(Math.random() * wave.spawnEdges.length)]
          spawnRat(state, bounds, edge, wave.ratSpeed)
          state.ratsSpawnedThisWave++
        }
      }
    }

    // 6. Update rat positions
    for (const rat of state.rats) {
      if (rat.despawned) continue

      if (rat.knockbackTimer > 0) {
        rat.knockbackTimer -= physicsDt
        rat.x += rat.knockbackVx * physicsDt
        rat.y += rat.knockbackVy * physicsDt

        if (rat.knockbackTimer <= 0) {
          rat.knockbackTimer = 0
          // Re-aim at target flower
          retargetRat(rat, state)
        }
        continue
      }

      rat.x += rat.vx * physicsDt
      rat.y += rat.vy * physicsDt
    }

    // 7. Retarget rats whose flower died
    for (const rat of state.rats) {
      if (rat.despawned || rat.knockbackTimer > 0) continue
      const target = state.flowers.find(f => f.id === rat.targetFlowerId)
      if (!target || !target.alive) {
        retargetRat(rat, state)
      }
    }

    // 8. Agent AI: agents chase and catch rats via A* pathfinding
    const agentSprites = sprites.filter(s => isAgent(s))
    if (agentSprites.length > 0) {
      const { cx: gcx, cy: gcy } = getGardenRect(bounds)
      const agentEvents = updateAgents(
        physicsDt,
        agentSprites,
        state.rats,
        state.agentAssignments,
        state.grid,
        state.gridRows,
        state.gridCols,
        { x: gcx, y: gcy },
      )
      state.events.push(...agentEvents)
    }

    // 9. Collision: rat-vs-flower
    for (const rat of state.rats) {
      if (rat.despawned || rat.knockbackTimer > 0) continue

      for (const flower of state.flowers) {
        if (!flower.alive) continue
        const dx = rat.x - flower.x
        const dy = rat.y - flower.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < RAT_FLOWER_HIT_RADIUS) {
          flower.bloomProgress -= BLOOM_STAGE_DECREMENT
          if (flower.bloomProgress <= 0) {
            flower.bloomProgress = 0
            flower.alive = false
          }
          rat.despawned = true
          state.events.push({ type: 'flower_hit', x: flower.x, y: flower.y })
          // Update bloom stage tracking after hit
          prevBloomStages.set(flower.id, bloomStageIndex(flower.bloomProgress))
          break
        }
      }
    }

    // 10. Clean up despawned / off-screen rats
    const margin = RAT_SIZE * 3
    state.rats = state.rats.filter(rat => {
      if (rat.despawned) return false
      if (rat.x < -margin || rat.x > bounds.width + margin ||
          rat.y < -margin || rat.y > bounds.height + margin) {
        return false
      }
      return true
    })
  }, [spawnRat, getGardenRect])

  const handleTapRat = useCallback((x: number, y: number): boolean => {
    const state = stateRef.current
    if (state.phase !== 'playing') return false

    for (const rat of state.rats) {
      if (rat.despawned) continue
      const dx = x - rat.x
      const dy = y - rat.y
      if (dx * dx + dy * dy < rat.size * rat.size) {
        rat.despawned = true
        state.events.push({ type: 'rat_caught', x: rat.x, y: rat.y })
        return true
      }
    }
    return false
  }, [])

  return { stateRef, startGame, update, resetGame, getGardenRect, handleTapRat }
}

function retargetRat(rat: Rat, state: TDGameState) {
  const aliveFlowers = state.flowers.filter(f => f.alive)
  if (aliveFlowers.length === 0) return

  const target = aliveFlowers[Math.floor(Math.random() * aliveFlowers.length)]
  rat.targetFlowerId = target.id

  const dx = target.x - rat.x
  const dy = target.y - rat.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  rat.vx = (dx / dist) * rat.speed
  rat.vy = (dy / dist) * rat.speed
}
