import { useState, useRef, useCallback, useContext } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import { useWindowSize } from '../../hooks/useWindowSize'
import { useGameEngine } from '../../hooks/useGameEngine'
import { updateSprite, randomBehavior, initialVelocity, baseSpeed } from '../../utils/spriteAnimator'
import { drawFlower, drawRat, drawGardenBoundary, drawObstacle } from '../../utils/gameRenderers'
import { isAgent } from '../../utils/agentAI'
import { drawHeart } from '../../utils/canvasHelpers'
import { GAME_DURATION_MS } from '../../utils/gameConfig'
import { processImageFile } from '../../utils/imageUpload'
import { SpritesContext } from '../../App'
import DrawingCanvas from './DrawingCanvas'
import CatCompanion from './CatCompanion'
import type { Sprite, TDGamePhase } from '../../types'
import './PlaygroundPage.css'

const MAX_SPRITES = 15
const STORAGE_KEY = 'valentine2026_sprites'

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
  const [hudState, setHudState] = useState<HudState>({
    phase: 'idle', elapsedTime: 0, currentWave: 0, flowerStates: [], debugMode: false,
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const spritesRef = useRef<Sprite[]>(sprites)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const hudUpdateTimerRef = useRef(0)
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

    const behavior = randomBehavior()
    const vel = initialVelocity(behavior)
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
    game.startGame({ width: size.width, height: size.height })
  }, [game, size])

  const handlePlayAgain = useCallback(() => {
    game.resetGame()
  }, [game])

  const handleTryAgain = useCallback(() => {
    game.resetGame()
  }, [game])

  const handlePageClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (game.stateRef.current.phase !== 'playing') return
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY
    game.handleTapRat(x, y)
  }, [game])

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

    // Update game engine
    if (state.phase === 'playing') {
      game.update(dt, bounds, currentSprites)
    }

    // Draw garden boundary (idle + playing)
    if (state.phase === 'idle' || state.phase === 'playing') {
      const { cx, cy, w, h } = game.getGardenRect(bounds)
      drawGardenBoundary(ctx, cx, cy, w, h, time)

      // Draw obstacles
      for (const obs of state.obstacles) {
        drawObstacle(ctx, obs, time)
      }

      // Draw flowers
      for (const flower of state.flowers) {
        drawFlower(ctx, flower, time)
      }

      // Draw rats
      for (const rat of state.rats) {
        drawRat(ctx, rat, time)
      }

      // Draw assignment lines (subtle dashed pink lines from agent to target rat)
      if (state.phase === 'playing') {
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 107, 129, 0.3)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 4])
        for (const assignment of state.agentAssignments) {
          const agent = currentSprites.find(s => s.id === assignment.spriteId)
          const rat = state.rats.find(r => r.id === assignment.targetRatId)
          if (!agent || !rat || rat.despawned) continue
          const acx = agent.x + agent.width / 2
          const acy = agent.y + agent.height / 2
          ctx.beginPath()
          ctx.moveTo(acx, acy)
          ctx.lineTo(rat.x, rat.y)
          ctx.stroke()
        }
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // Update and draw sprites (always)
    for (const sprite of currentSprites) {
      // Skip updateSprite for agents with active assignments during gameplay
      const hasAssignment = state.phase === 'playing' &&
        isAgent(sprite) &&
        state.agentAssignments.some(a => a.spriteId === sprite.id)
      if (!hasAssignment) {
        updateSprite(sprite, dt, bounds)
      }

      const img = ensureImage(sprite)
      if (!img.complete) continue

      ctx.save()
      const cx = sprite.x + sprite.width / 2
      const cy = sprite.y + sprite.height / 2
      ctx.translate(cx, cy)
      ctx.rotate(Math.sin(sprite.rotation) * 0.15)
      if (sprite.flipX) ctx.scale(-1, 1)
      ctx.drawImage(img, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height)
      ctx.restore()
    }

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
    <div className="playground-page" onClick={handlePageClick}>
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
          <button className="game-timer" onClick={game.handleTimerTap}>
            {formatTime(hudState.elapsedTime)} / {formatTime(GAME_DURATION_MS)}
            {hudState.debugMode && <span className="debug-badge">10x</span>}
          </button>
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
        </div>
      )}

      {/* Start button — visible when idle */}
      {hudState.phase === 'idle' && (
        <button className="playground-start-btn" onClick={handleStartGame}>
          Defend the Garden!
        </button>
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
            <h1 className="valentine-card-title">Happy Valentine&apos;s Day!</h1>
            <p className="valentine-card-message">
              Your garden bloomed beautifully.<br />
              Love conquers all &mdash; even rats.
            </p>
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

      <CatCompanion spriteSpawnTrigger={spawnTrigger} />

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
