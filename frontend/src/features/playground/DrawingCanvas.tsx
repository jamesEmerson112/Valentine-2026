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
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([])
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
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)

    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }, [isDrawing, brushColor, brushSize, getPos])

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
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
      onExtract(result.dataUrl, result.width, result.height)
      onClose()
    }
  }

  return (
    <div className="drawing-overlay">
      <div className="drawing-panel">
        <div className="drawing-header">
          <h2 className="drawing-title">Draw something cute!</h2>
          <button className="drawing-close" onClick={onClose}>&times;</button>
        </div>

        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        <div className="drawing-tools">
          <div className="drawing-colors">
            {BRUSH_COLORS.map(color => (
              <button
                key={color}
                className={`color-swatch ${color === brushColor ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => setBrushColor(color)}
                aria-label={`Color ${color}`}
              />
            ))}
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
      </div>
    </div>
  )
}
