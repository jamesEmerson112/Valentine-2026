import { useRef, useState, useCallback, useEffect } from 'react'
import { BRUSH_COLORS } from '../../utils/colors'
import { extractDrawing } from '../../utils/canvasHelpers'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  onExtract: (dataUrl: string, width: number, height: number) => void
  onClose: () => void
}

export default function DrawingCanvas({ onExtract, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushColor, setBrushColor] = useState<string>(BRUSH_COLORS[0])
  const [brushSize, setBrushSize] = useState(4)
  const [isEraser, setIsEraser] = useState(false)
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([])
  const [preview, setPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')!
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    // Save state before new stroke
    setStrokeHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)])
    setIsDrawing(true)
    lastPos.current = getPos(e)
    canvas.setPointerCapture(e.pointerId)
  }, [getPos])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    setBrushPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

    if (!isDrawing || !lastPos.current) return
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)

    ctx.save()
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = brushColor
    }
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.restore()
    lastPos.current = pos
  }, [isDrawing, brushColor, brushSize, isEraser, getPos])

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
  }, [])

  const handlePointerLeave = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
    setBrushPos(null)
  }, [])

  const handleUndo = () => {
    if (strokeHistory.length === 0) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const prev = strokeHistory[strokeHistory.length - 1]
    ctx.putImageData(prev, 0, 0)
    setStrokeHistory(h => h.slice(0, -1))
  }

  const handleClear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    setStrokeHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)])
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleBringToLife = () => {
    const canvas = canvasRef.current!
    const result = extractDrawing(canvas)
    if (result) {
      setPreview(result)
    }
  }

  const handleConfirmPreview = () => {
    if (preview) {
      onExtract(preview.dataUrl, preview.width, preview.height)
      onClose()
    }
  }

  const handleRetryPreview = () => {
    setPreview(null)
  }

  const handleColorSelect = (color: string) => {
    setBrushColor(color)
    setIsEraser(false)
  }

  return (
    <div className="drawing-overlay">
      <div className="drawing-panel">
        <div className="drawing-header">
          <h2 className="drawing-title">Draw something cute!</h2>
          <button className="drawing-close" onClick={onClose}>&times;</button>
        </div>

        {preview ? (
          <div className="drawing-preview">
            <div className="drawing-preview-checkerboard">
              <img src={preview.dataUrl} alt="Your drawing" />
            </div>
            <div className="drawing-preview-actions">
              <button className="draw-action-btn primary" onClick={handleConfirmPreview}>
                Looks Good!
              </button>
              <button className="draw-action-btn" onClick={handleRetryPreview}>
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="drawing-canvas-wrapper">
              <canvas
                ref={canvasRef}
                className="drawing-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              />
              {brushPos && (
                <div
                  className="brush-preview"
                  style={{
                    left: brushPos.x,
                    top: brushPos.y,
                    width: brushSize,
                    height: brushSize,
                    background: isEraser ? 'transparent' : brushColor,
                    borderColor: isEraser ? '#999' : brushColor,
                  }}
                />
              )}
            </div>

            <div className="drawing-tools">
              <div className="drawing-colors">
                {BRUSH_COLORS.map(color => (
                  <button
                    key={color}
                    className={`color-swatch ${color === brushColor && !isEraser ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => handleColorSelect(color)}
                    aria-label={`Color ${color}`}
                  />
                ))}
                <button
                  className={`color-swatch eraser-swatch ${isEraser ? 'active' : ''}`}
                  onClick={() => setIsEraser(!isEraser)}
                  aria-label="Eraser"
                  title="Eraser"
                >
                  <span className="eraser-icon">&#x232B;</span>
                </button>
              </div>

              <div className="drawing-size">
                <label>Size</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                />
              </div>

              <div className="drawing-actions">
                <button className="draw-action-btn" onClick={handleUndo} disabled={strokeHistory.length === 0}>
                  Undo
                </button>
                <button className="draw-action-btn" onClick={handleClear}>Clear</button>
                <button className="draw-action-btn primary" onClick={handleBringToLife}>
                  Bring to Life!
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
