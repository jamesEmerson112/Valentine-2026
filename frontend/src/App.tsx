import { useState, useEffect, useRef, useCallback, createContext } from 'react'
import FloatingHearts from './components/FloatingHearts'
import GrassGround from './components/GrassGround'
import FlyingBirds from './components/FlyingBirds'
import PlaygroundPage from './features/playground/PlaygroundPage'
import { generateStarterSprites } from './utils/starterSprites'
import { randomBehavior, initialVelocity, baseSpeed } from './utils/spriteAnimator'
import type { Sprite } from './types'
import './App.css'

const STORAGE_KEY = 'valentine2026_sprites'

interface SpritesContextType {
  sprites: Sprite[]
  setSprites: React.Dispatch<React.SetStateAction<Sprite[]>>
}

export const SpritesContext = createContext<SpritesContextType>({
  sprites: [],
  setSprites: () => {},
})

interface StoredSprite {
  id: string
  imageData: string
  width: number
  height: number
}

function rehydrateSprite(stored: StoredSprite): Sprite {
  const behavior = randomBehavior()
  const vel = initialVelocity(behavior)
  return {
    id: stored.id,
    imageData: stored.imageData,
    width: stored.width,
    height: stored.height,
    x: Math.random() * (window.innerWidth - stored.width),
    y: Math.random() * (window.innerHeight - stored.height),
    vx: vel.vx,
    vy: vel.vy,
    behavior,
    angle: Math.random() * Math.PI * 2,
    timer: 0,
    flipX: false,
    rotation: 0,
    speed: baseSpeed(behavior),
  }
}

function loadSprites(): Sprite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored: StoredSprite[] = JSON.parse(raw)
      if (Array.isArray(stored) && stored.length > 0) {
        return stored.map(rehydrateSprite)
      }
    }
  } catch { /* ignore corrupt data */ }

  // First visit — generate starter sprites
  const starters = generateStarterSprites()
  return starters.map((fig, i) => {
    const behavior = randomBehavior()
    const vel = initialVelocity(behavior)
    return {
      id: `starter-${i}-${Date.now()}`,
      imageData: fig.imageData,
      width: fig.width,
      height: fig.height,
      x: Math.random() * (window.innerWidth - fig.width),
      y: Math.random() * (window.innerHeight - fig.height),
      vx: vel.vx,
      vy: vel.vy,
      behavior,
      angle: Math.random() * Math.PI * 2,
      timer: 0,
      flipX: false,
      rotation: 0,
      speed: baseSpeed(behavior),
    }
  })
}

function App() {
  const [sprites, setSprites] = useState<Sprite[]>(loadSprites)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save to localStorage
  const saveSprites = useCallback((spritesToSave: Sprite[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const toStore: StoredSprite[] = spritesToSave.map(s => ({
        id: s.id,
        imageData: s.imageData,
        width: s.width,
        height: s.height,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    }, 500)
  }, [])

  useEffect(() => {
    saveSprites(sprites)
  }, [sprites, saveSprites])

  return (
    <SpritesContext value={{ sprites, setSprites }}>
      <div className="app-shell">
        <FloatingHearts />
        <FlyingBirds />
        <GrassGround />
        <main className="app-main">
          <PlaygroundPage />
        </main>
      </div>
    </SpritesContext>
  )
}

export default App
