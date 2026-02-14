import { useState, useRef, useCallback, useContext } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import { useWindowSize } from '../../hooks/useWindowSize'
import { updateSprite, randomBehavior, initialVelocity, baseSpeed } from '../../utils/spriteAnimator'
import { processImageFile } from '../../utils/imageUpload'
import { SpritesContext } from '../../App'
import DrawingCanvas from './DrawingCanvas'
import CatCompanion from './CatCompanion'
import type { Sprite } from '../../types'
import './PlaygroundPage.css'

const MAX_SPRITES = 15
const STORAGE_KEY = 'valentine2026_sprites'

export default function PlaygroundPage() {
  const { sprites, setSprites } = useContext(SpritesContext)
  const [showDrawing, setShowDrawing] = useState(false)
  const [spawnTrigger, setSpawnTrigger] = useState(0)
  const [uploadPreview, setUploadPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const spritesRef = useRef<Sprite[]>(sprites)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const size = useWindowSize()

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

  // Animation loop
  useAnimationFrame((dt) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size.width
    canvas.height = size.height

    // Update and draw each sprite
    const currentSprites = spritesRef.current
    for (const sprite of currentSprites) {
      updateSprite(sprite, dt, { width: size.width, height: size.height })

      const img = ensureImage(sprite)
      if (!img.complete) continue

      ctx.save()
      // Translate to sprite center, apply rotation, then draw centered
      const cx = sprite.x + sprite.width / 2
      const cy = sprite.y + sprite.height / 2
      ctx.translate(cx, cy)
      ctx.rotate(Math.sin(sprite.rotation) * 0.15)
      if (sprite.flipX) ctx.scale(-1, 1)
      ctx.drawImage(img, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height)
      ctx.restore()
    }
  })

  return (
    <div className="playground-page">
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

      <CatCompanion spriteSpawnTrigger={spawnTrigger} />

      {sprites.length === 0 && !showDrawing && (
        <div className="playground-hint">
          <p>Tap <strong>Draw</strong> to create a character!</p>
          <p className="playground-hint-sub">Draw Miffy, a cat, a heart... anything you like</p>
        </div>
      )}
    </div>
  )
}
