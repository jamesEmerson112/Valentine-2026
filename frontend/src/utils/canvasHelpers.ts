/**
 * Scan ImageData for bounding box of non-transparent pixels.
 */
export function getBoundingBox(imageData: ImageData): { x: number; y: number; w: number; h: number } | null {
  const { data, width, height } = imageData
  let minX = width, minY = height, maxX = 0, maxY = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 10) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!found) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/**
 * Extract a drawing from canvas, cropping to bounding box. Returns data URL.
 */
export function extractDrawing(canvas: HTMLCanvasElement): { dataUrl: string; width: number; height: number } | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const box = getBoundingBox(imageData)
  if (!box) return null

  const padding = 4
  const x = Math.max(0, box.x - padding)
  const y = Math.max(0, box.y - padding)
  const w = Math.min(canvas.width - x, box.w + padding * 2)
  const h = Math.min(canvas.height - y, box.h + padding * 2)

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h)

  // Scale down if too large (max 100px on longest side for sprites)
  const maxSize = 100
  const scale = Math.min(1, maxSize / Math.max(w, h))
  if (scale < 1) {
    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = Math.round(w * scale)
    scaledCanvas.height = Math.round(h * scale)
    const scaledCtx = scaledCanvas.getContext('2d')!
    scaledCtx.drawImage(tempCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
    return { dataUrl: scaledCanvas.toDataURL(), width: scaledCanvas.width, height: scaledCanvas.height }
  }

  return { dataUrl: tempCanvas.toDataURL(), width: w, height: h }
}

/**
 * Draw a heart shape on a canvas context using bezier curves.
 */
export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.beginPath()
  ctx.translate(x, y)

  const topCurveHeight = size * 0.3
  ctx.moveTo(0, topCurveHeight)
  // Left side
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight)
  ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, (size + topCurveHeight) / 2, 0, size)
  // Right side
  ctx.bezierCurveTo(0, (size + topCurveHeight) / 2, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight)
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight)

  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}
