import { useState, useRef, useCallback, useContext } from 'react'
import { useAnimationFrame } from '../../hooks/useAnimationFrame'
import { useWindowSize } from '../../hooks/useWindowSize'
import { updateSprite } from '../../utils/spriteAnimator'
import { randomBehavior, initialVelocity } from '../../utils/spriteAnimator'
import { SpritesContext } from '../../App'
import DrawingCanvas from './DrawingCanvas'
import CatCompanion from './CatCompanion'
import type { Sprite } from '../../types'
import './PlaygroundPage.css'

const MAX_SPRITES = 15

export default function PlaygroundPage() {
  const { sprites, setSprites } = useContext(SpritesContext)
  const [showDrawing, setShowDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    }

    setSprites(prev => [...prev, newSprite])
  }, [size, setSprites])

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
      if (sprite.flipX) {
        ctx.translate(sprite.x + sprite.width, sprite.y)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, sprite.width, sprite.height)
      } else {
        ctx.drawImage(img, sprite.x, sprite.y, sprite.width, sprite.height)
      }
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

      <div className="playground-ui">
        <button
          className="playground-draw-btn"
          onClick={() => setShowDrawing(true)}
        >
          Draw
        </button>

        {sprites.length > 0 && (
          <div className="playground-sprite-count">
            {sprites.length} / {MAX_SPRITES} creatures
          </div>
        )}
      </div>

      {showDrawing && (
        <DrawingCanvas
          onExtract={handleExtract}
          onClose={() => setShowDrawing(false)}
        />
      )}

      <CatCompanion />

      {sprites.length === 0 && !showDrawing && (
        <div className="playground-hint">
          <p>Tap <strong>Draw</strong> to create a character!</p>
          <p className="playground-hint-sub">Draw Miffy, a cat, a heart... anything you like</p>
        </div>
      )}
    </div>
  )
}
