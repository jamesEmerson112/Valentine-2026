const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_SPRITE_SIZE = 100

export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

export function processImageFile(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('Image must be under 10MB'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_SPRITE_SIZE / Math.max(w, h))
      const sw = Math.round(w * scale)
      const sh = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, sw, sh)

      resolve({ dataUrl: canvas.toDataURL(), width: sw, height: sh })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
