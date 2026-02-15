import { useState, useRef, useCallback, useContext } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import { useWindowSize } from '../../hooks/useWindowSize'
import { useGameEngine } from '../../hooks/useGameEngine'
import { updateSprite, randomBehavior, initialVelocity, baseSpeed } from '../../utils/spriteAnimator'
import { drawFlower, drawRat, drawGardenBoundary, drawObstacle, drawNavGrid, drawAgentDebug, drawAgentPaths, drawDebugHUD } from '../../utils/gameRenderers'
import { isAgent } from '../../utils/agentAI'
import { drawHeart } from '../../utils/canvasHelpers'
import { processImageFile } from '../../utils/imageUpload'
import { soundEngine } from '../../utils/soundEngine'
import { particles, emitRatCaughtParticles, emitBloomParticles, emitVictoryParticles } from '../../utils/particleSystem'
import { getGameScale } from '../../utils/gameConfig'
import { SpritesContext } from '../../App'
import DrawingCanvas from './DrawingCanvas'
import CatCompanion from './CatCompanion'
import type { Sprite, TDGamePhase } from '../../types'
import './PlaygroundPage.css'

const MAX_SPRITES = 15
const STORAGE_KEY = 'valentine2026_sprites'
const DRAG_THRESHOLD = 20 // px minimum drag distance
const AGENT_SIZE_FACTOR = 0.8 // agents render 20% smaller than raw sprite size

interface DragState {
  spriteId: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  agentCenterX: number
  agentCenterY: number
}

function hitTestAgent(x: number, y: number, sprites: Sprite[], scale: number = 1): Sprite | null {
  // Iterate in reverse for topmost-drawn
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i]
    if (s.role !== 'agent') continue
    const drawW = s.width * scale * AGENT_SIZE_FACTOR
    const drawH = s.height * scale * AGENT_SIZE_FACTOR
    const drawX = s.x + s.width / 2 - drawW / 2
    const drawY = s.y + s.height / 2 - drawH / 2
    if (x >= drawX && x <= drawX + drawW && y >= drawY && y <= drawY + drawH) {
      return s
    }
  }
  return null
}

interface HudState {
  phase: TDGamePhase
  elapsedTime: number
  currentWave: number
  flowerStates: { bloomProgress: number; alive: boolean }[]
  debugMode: boolean
}

export default function PlaygroundPage() {
  const { sprites, setSprites } = useContext(SpritesContext)
  const [showDrawing, setShowDrawing] = useState(false)
  const [spawnTrigger, setSpawnTrigger] = useState(0)
  const [uploadPreview, setUploadPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [hudState, setHudState] = useState<HudState>({
    phase: 'idle', elapsedTime: 0, currentWave: 0, flowerStates: [], debugMode: false,
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const spritesRef = useRef<Sprite[]>(sprites)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const hudUpdateTimerRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const hoveredAgentRef = useRef<string | null>(null)
  const size = useWindowSize()
  const game = useGameEngine()

  // Keep ref in sync
  spritesRef.current = sprites

  // Preload sprite images
  const ensureImage = useCallback((sprite: Sprite) => {
    if (!imagesRef.current.has(sprite.id)) {
      const img = new Image()
      img.src = sprite.imageData
      imagesRef.current.set(sprite.id, img)
    }
    return imagesRef.current.get(sprite.id)!
  }, [])

  const handleExtract = useCallback((dataUrl: string, width: number, height: number) => {
    if (spritesRef.current.length >= MAX_SPRITES) {
      // Remove oldest
      const oldest = spritesRef.current[0]
      imagesRef.current.delete(oldest.id)
      spritesRef.current = spritesRef.current.slice(1)
    }

    const scale = getGameScale({ width: size.width, height: size.height })
    const behavior = randomBehavior()
    const vel = initialVelocity(behavior, scale)
    const newSprite: Sprite = {
      id: `sprite-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      imageData: dataUrl,
      width,
      height,
      x: Math.random() * (size.width - width),
      y: Math.random() * (size.height - height),
      vx: vel.vx,
      vy: vel.vy,
      behavior,
      angle: Math.random() * Math.PI * 2,
      timer: 0,
      flipX: false,
      rotation: 0,
      speed: baseSpeed(behavior),
      role: 'agent',
    }

    setSprites(prev => [...prev, newSprite])
    setSpawnTrigger(t => t + 1)
  }, [size, setSprites])

  const handleClearAll = useCallback(() => {
    imagesRef.current.clear()
    setSprites([])
    localStorage.removeItem(STORAGE_KEY)
  }, [setSprites])

  const handleDeleteLast = useCallback(() => {
    setSprites(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      imagesRef.current.delete(last.id)
      return prev.slice(0, -1)
    })
  }, [setSprites])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so the same file can be re-selected
    e.target.value = ''
    try {
      const result = await processImageFile(file)
      setUploadPreview(result)
    } catch {
      // silently ignore invalid files
    }
  }, [])

  const handleUploadConfirm = useCallback(() => {
    if (uploadPreview) {
      handleExtract(uploadPreview.dataUrl, uploadPreview.width, uploadPreview.height)
      setUploadPreview(null)
    }
  }, [uploadPreview, handleExtract])

  const handleStartGame = useCallback(() => {
    soundEngine.init()
    soundEngine.startMusic()
    game.startGame({ width: size.width, height: size.height })
  }, [game, size])

  const handlePlayAgain = useCallback(() => {
    particles.clear()
    soundEngine.stopMusic()
    game.resetGame()
  }, [game])

  const handleTryAgain = useCallback(() => {
    particles.clear()
    soundEngine.stopMusic()
    game.resetGame()
  }, [game])

  const handleToggleMute = useCallback(() => {
    soundEngine.init()
    const muted = soundEngine.toggleMute()
    setIsMuted(muted)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (game.stateRef.current.phase !== 'playing') return
    const x = e.clientX
    const y = e.clientY

    const scale = getGameScale({ width: size.width, height: size.height })
    const agent = hitTestAgent(x, y, spritesRef.current, scale)
    if (agent) {
      dragRef.current = {
        spriteId: agent.id,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        agentCenterX: agent.x + agent.width / 2,
        agentCenterY: agent.y + agent.height / 2,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      document.body.style.cursor = 'grabbing'
    } else {
      // No agent hit — try rat tap
      game.handleTapRat(x, y)
    }
  }, [game, size])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current.currentX = e.clientX
      dragRef.current.currentY = e.clientY
      // Update agent center for live tracking
      const agent = spritesRef.current.find(s => s.id === dragRef.current!.spriteId)
      if (agent) {
        dragRef.current.agentCenterX = agent.x + agent.width / 2
        dragRef.current.agentCenterY = agent.y + agent.height / 2
      }
    } else if (game.stateRef.current.phase === 'playing') {
      const scale = getGameScale({ width: size.width, height: size.height })
      const agent = hitTestAgent(e.clientX, e.clientY, spritesRef.current, scale)
      hoveredAgentRef.current = agent ? agent.id : null
    }
  }, [game, size])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    document.body.style.cursor = ''
    hoveredAgentRef.current = null

    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const scale = getGameScale({ width: size.width, height: size.height })
    if (dist < DRAG_THRESHOLD * scale) return // short tap — do nothing

    game.directAgentTo(drag.spriteId, e.clientX, e.clientY)
  }, [game, size])

  // Format mm:ss timer
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Animation loop
  useAnimationFrame((dt, time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size.width
    canvas.height = size.height
    const bounds = { width: size.width, height: size.height }
    const currentSprites = spritesRef.current
    const state = game.stateRef.current
    const scale = getGameScale(bounds)

    // Update game engine
    if (state.phase === 'playing') {
      game.update(dt, bounds, currentSprites)
    }

    // Update particles
    particles.update(dt)

    // Drain events
    for (const event of state.events) {
      switch (event.type) {
        case 'rat_caught':
          soundEngine.playRatCaught()
          if (event.x != null && event.y != null) emitRatCaughtParticles(event.x, event.y, scale)
          break
        case 'rat_spawned':
          soundEngine.playRatSpawn()
          break
        case 'bloom_stage':
          if (event.stage != null) soundEngine.playBloomStage(event.stage)
          if (event.x != null && event.y != null && event.stage != null) emitBloomParticles(event.x, event.y, event.stage, scale)
          break
        case 'victory':
          soundEngine.playVictory()
          soundEngine.stopMusic()
          emitVictoryParticles(bounds.width, bounds.height, scale)
          break
        case 'defeat':
          soundEngine.playDefeat()
          soundEngine.stopMusic()
          break
        case 'flower_hit':
          break
      }
    }
    state.events = []

    // Draw garden boundary (idle + playing)
    if (state.phase === 'idle' || state.phase === 'playing') {
      const { cx, cy, w, h } = game.getGardenRect(bounds)
      drawGardenBoundary(ctx, cx, cy, w, h, time, scale)

      // Draw obstacles
      for (const obs of state.obstacles) {
        drawObstacle(ctx, obs, time, scale)
      }

      // Draw flowers
      for (const flower of state.flowers) {
        drawFlower(ctx, flower, time, scale)
      }

      // Draw rats
      for (const rat of state.rats) {
        drawRat(ctx, rat, time)
      }

      // Draw assignment lines
      if (state.phase === 'playing') {
        ctx.save()
        ctx.lineWidth = 1.5 * scale
        ctx.setLineDash([6 * scale, 4 * scale])
        for (const assignment of state.agentAssignments) {
          const agent = currentSprites.find(s => s.id === assignment.spriteId)
          if (!agent) continue
          const acx = agent.x + agent.width / 2
          const acy = agent.y + agent.height / 2

          if (assignment.isPlayerDirected && assignment.destination) {
            // Blue dashed line to destination
            ctx.strokeStyle = 'rgba(100, 149, 237, 0.45)'
            ctx.beginPath()
            ctx.moveTo(acx, acy)
            ctx.lineTo(assignment.destination.x, assignment.destination.y)
            ctx.stroke()
            // Small dot at destination
            ctx.fillStyle = 'rgba(100, 149, 237, 0.6)'
            ctx.beginPath()
            ctx.arc(assignment.destination.x, assignment.destination.y, 4 * scale, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Pink dashed line to target rat
            const rat = state.rats.find(r => r.id === assignment.targetRatId)
            if (!rat || rat.despawned) continue
            ctx.strokeStyle = 'rgba(255, 107, 129, 0.3)'
            ctx.beginPath()
            ctx.moveTo(acx, acy)
            ctx.lineTo(rat.x, rat.y)
            ctx.stroke()
          }
        }
        ctx.setLineDash([])
        ctx.restore()
      }

      // Debug overlays
      if (state.debugMode) {
        const sc = state.scaledConfig
        const cellSize = sc ? sc.gridCellSize : undefined
        const aggroRadius = sc ? sc.agentAggroRadius : undefined
        const catchDistance = sc ? sc.agentRatCatchDistance : undefined
        drawNavGrid(ctx, state.grid, state.gridRows, state.gridCols, cellSize)
        drawAgentDebug(ctx, currentSprites, state.agentAssignments, state.rats, time, aggroRadius, catchDistance)
        drawAgentPaths(ctx, currentSprites, state.agentAssignments)
        const agentCount = currentSprites.filter(s => s.role === 'agent').length
        const ratCount = state.rats.filter(r => !r.despawned).length
        drawDebugHUD(ctx, agentCount, ratCount, state.agentAssignments.length, state.gridCols, state.gridRows)
      }
    }

    // Update and draw sprites (always)
    for (const sprite of currentSprites) {
      // Skip updateSprite for agents with active assignments during gameplay
      const hasAssignment = state.phase === 'playing' &&
        isAgent(sprite) &&
        state.agentAssignments.some(a => a.spriteId === sprite.id)
      if (!hasAssignment) {
        updateSprite(sprite, dt, bounds, scale)
      }

      const img = ensureImage(sprite)
      if (!img.complete) continue

      ctx.save()
      const cx = sprite.x + sprite.width / 2
      const cy = sprite.y + sprite.height / 2
      ctx.translate(cx, cy)
      ctx.rotate(Math.sin(sprite.rotation) * 0.15)
      if (sprite.flipX) ctx.scale(-1, 1)
      const sizeFactor = isAgent(sprite) ? AGENT_SIZE_FACTOR : 1
      const drawW = sprite.width * scale * sizeFactor
      const drawH = sprite.height * scale * sizeFactor
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    }

    // Visual feedback: hover glow + drag indicator
    if (state.phase === 'playing') {
      // Hover glow ring
      const hovId = hoveredAgentRef.current
      if (hovId && !dragRef.current) {
        const hSprite = currentSprites.find(s => s.id === hovId)
        if (hSprite) {
          const hcx = hSprite.x + hSprite.width / 2
          const hcy = hSprite.y + hSprite.height / 2
          const r = Math.max(hSprite.width, hSprite.height) * 0.6 * scale * AGENT_SIZE_FACTOR
          ctx.save()
          ctx.strokeStyle = 'rgba(100, 149, 237, 0.35)'
          ctx.lineWidth = 2 * scale
          ctx.shadowColor = 'rgba(100, 149, 237, 0.5)'
          ctx.shadowBlur = 10 * scale
          ctx.beginPath()
          ctx.arc(hcx, hcy, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }

      // Drag indicator
      const drag = dragRef.current
      if (drag) {
        const dSprite = currentSprites.find(s => s.id === drag.spriteId)
        if (dSprite) {
          const dcx = dSprite.x + dSprite.width / 2
          const dcy = dSprite.y + dSprite.height / 2

          ctx.save()
          // Glow ring around selected agent
          const r = Math.max(dSprite.width, dSprite.height) * 0.6 * scale * AGENT_SIZE_FACTOR
          ctx.strokeStyle = 'rgba(100, 149, 237, 0.5)'
          ctx.lineWidth = 2.5 * scale
          ctx.shadowColor = 'rgba(100, 149, 237, 0.6)'
          ctx.shadowBlur = 14 * scale
          ctx.beginPath()
          ctx.arc(dcx, dcy, r, 0, Math.PI * 2)
          ctx.stroke()
          ctx.shadowBlur = 0

          // Dashed blue line from agent to cursor
          ctx.strokeStyle = 'rgba(100, 149, 237, 0.5)'
          ctx.lineWidth = 2 * scale
          ctx.setLineDash([8 * scale, 5 * scale])
          ctx.beginPath()
          ctx.moveTo(dcx, dcy)
          ctx.lineTo(drag.currentX, drag.currentY)
          ctx.stroke()
          ctx.setLineDash([])

          // Pulsing circle + crosshair at cursor
          const pulse = 0.7 + 0.3 * Math.sin(time * 0.005)
          ctx.globalAlpha = pulse
          ctx.strokeStyle = 'rgba(100, 149, 237, 0.7)'
          ctx.lineWidth = 2 * scale
          ctx.beginPath()
          ctx.arc(drag.currentX, drag.currentY, 12 * scale, 0, Math.PI * 2)
          ctx.stroke()
          // Crosshair
          const ch = 6 * scale
          ctx.beginPath()
          ctx.moveTo(drag.currentX - ch, drag.currentY)
          ctx.lineTo(drag.currentX + ch, drag.currentY)
          ctx.moveTo(drag.currentX, drag.currentY - ch)
          ctx.lineTo(drag.currentX, drag.currentY + ch)
          ctx.stroke()
          ctx.globalAlpha = 1
          ctx.restore()
        }
      }
    }

    // Render particles (after sprites, before HUD)
    particles.render(ctx)

    // Throttled HUD sync (~250ms)
    hudUpdateTimerRef.current += dt
    if (hudUpdateTimerRef.current >= 250) {
      hudUpdateTimerRef.current = 0
      setHudState({
        phase: state.phase,
        elapsedTime: state.elapsedTime,
        currentWave: state.currentWave,
        flowerStates: state.flowers.map(f => ({ bloomProgress: f.bloomProgress, alive: f.alive })),
        debugMode: state.debugMode,
      })
    }
  })

  return (
    <div className="playground-page" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <canvas
        ref={canvasRef}
        className="playground-canvas"
        width={size.width}
        height={size.height}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Game HUD — visible during playing */}
      {hudState.phase === 'playing' && (
        <div className="game-hud">
          <div className="game-timer">
            {formatTime(hudState.elapsedTime)}
            {hudState.debugMode && <span className="debug-badge">10x</span>}
          </div>
          {hudState.currentWave > 0 && (
            <div className="game-wave">Wave {hudState.currentWave}</div>
          )}
          <div className="game-flowers">
            {hudState.flowerStates.map((f, i) => (
              <div key={i} className={`flower-pip ${f.alive ? '' : 'dead'}`}>
                <div
                  className="flower-pip-fill"
                  style={{ height: `${Math.max(0, Math.min(100, f.bloomProgress * 100))}%` }}
                />
              </div>
            ))}
          </div>
          <button className="mute-btn" onClick={(e) => { e.stopPropagation(); handleToggleMute() }} onPointerDown={(e) => e.stopPropagation()} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Start button + instructions — visible when idle */}
      {hudState.phase === 'idle' && (
        <>
          <button className="playground-start-btn" onClick={handleStartGame}>
            Defend the Garden!
          </button>
          <div className="playground-instructions">
            <p>Draw or upload creatures to defend your flowers</p>
            <p>Tap rats to scare them away</p>
            <p>Drag your defenders to direct them</p>
            <p>Protect the garden until all flowers bloom!</p>
          </div>
        </>
      )}

      <div className="playground-ui">
        <button
          className="playground-draw-btn"
          onClick={() => setShowDrawing(true)}
        >
          Draw
        </button>
        <button
          className="playground-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </button>

        {sprites.length > 0 && (
          <>
            <div className="playground-sprite-count">
              {sprites.length} / {MAX_SPRITES} creatures
            </div>
            <div className="playground-manage-btns">
              <button className="playground-manage-btn" onClick={handleDeleteLast}>
                Delete Last
              </button>
              <button className="playground-manage-btn danger" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </>
        )}
      </div>

      {showDrawing && (
        <DrawingCanvas
          onExtract={handleExtract}
          onClose={() => setShowDrawing(false)}
        />
      )}

      {uploadPreview && (
        <div className="drawing-overlay">
          <div className="drawing-panel">
            <div className="drawing-header">
              <h2 className="drawing-title">Upload Preview</h2>
              <button className="drawing-close" onClick={() => setUploadPreview(null)}>&times;</button>
            </div>
            <div className="drawing-preview">
              <div className="drawing-preview-checkerboard">
                <img src={uploadPreview.dataUrl} alt="Upload preview" />
              </div>
              <div className="drawing-preview-actions">
                <button className="draw-action-btn primary" onClick={handleUploadConfirm}>
                  Looks Good!
                </button>
                <button className="draw-action-btn" onClick={() => setUploadPreview(null)}>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Victory modal */}
      {hudState.phase === 'victory' && (
        <div className="drawing-overlay">
          <div className="valentine-card">
            <ValentineCardDecoration />
            <h1 className="valentine-card-title">Happy Valentine, baby Jen.</h1>
            <p className="valentine-card-message">
              Your garden bloomed beautifully.<br />
              Love conquers all &mdash; even rats.
            </p>
            <p className="valentine-card-from">From James</p>
            <button className="draw-action-btn primary" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Defeat modal */}
      {hudState.phase === 'defeat' && (
        <div className="drawing-overlay">
          <div className="defeat-card">
            <h2 className="defeat-card-title">The rats got through...</h2>
            <p className="defeat-card-message">
              Your garden needs more defenders!
            </p>
            <div className="defeat-card-actions">
              <button className="draw-action-btn primary" onClick={handleTryAgain}>
                Try Again
              </button>
              <button className="draw-action-btn" onClick={() => { handleTryAgain(); setShowDrawing(true) }}>
                Draw More
              </button>
            </div>
          </div>
        </div>
      )}

      <CatCompanion spriteSpawnTrigger={spawnTrigger} scale={getGameScale({ width: size.width, height: size.height })} />

      {sprites.length === 0 && !showDrawing && hudState.phase === 'idle' && (
        <div className="playground-hint">
          <p>Tap <strong>Draw</strong> to create a character!</p>
          <p className="playground-hint-sub">Draw Miffy, a cat, a heart... anything you like</p>
        </div>
      )}
    </div>
  )
}

function ValentineCardDecoration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useAnimationFrame((_, time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    // Floating hearts
    for (let i = 0; i < 6; i++) {
      const x = (w * 0.15) + (i / 5) * (w * 0.7)
      const y = h * 0.5 + Math.sin(time * 0.001 + i * 1.2) * (h * 0.3)
      const sz = 10 + Math.sin(time * 0.002 + i) * 3
      const alpha = 0.3 + Math.sin(time * 0.0015 + i) * 0.15
      ctx.globalAlpha = alpha
      drawHeart(ctx, x, y, sz, '#ff6b81')
    }
    ctx.globalAlpha = 1
  })

  return <canvas ref={canvasRef} className="valentine-card-deco" />
}
