export interface Sprite {
  id: string
  imageData: string // data URL from canvas extraction
  width: number
  height: number
  x: number
  y: number
  vx: number
  vy: number
  behavior: 'wander' | 'bounce' | 'float'
  angle: number // for wander direction changes
  timer: number // behavior-specific timer
  flipX: boolean
}

export interface ValentineData {
  message: string
  from: string
}

export interface GameState {
  score: number
  highScore: number
  lives: number
  isPlaying: boolean
  isGameOver: boolean
}

export interface FallingHeart {
  id: number
  x: number
  y: number
  speed: number
  size: number
  rotation: number
}
