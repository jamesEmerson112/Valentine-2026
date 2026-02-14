import { useState, useCallback, createContext } from 'react'
import FloatingHearts from './components/FloatingHearts'
import StoryIntro from './features/story/StoryIntro'
import { useFirstVisit } from './features/story/useFirstVisit'
import PlaygroundPage from './features/playground/PlaygroundPage'
import type { Sprite } from './types'
import './App.css'

interface SpritesContextType {
  sprites: Sprite[]
  setSprites: React.Dispatch<React.SetStateAction<Sprite[]>>
}

export const SpritesContext = createContext<SpritesContextType>({
  sprites: [],
  setSprites: () => {},
})

function App() {
  const [isFirstVisit, markVisited] = useFirstVisit()
  const [showIntro, setShowIntro] = useState(isFirstVisit)
  const [sprites, setSprites] = useState<Sprite[]>([])

  const handleIntroComplete = useCallback(() => {
    markVisited()
    setShowIntro(false)
  }, [markVisited])

  if (showIntro) {
    return <StoryIntro onComplete={handleIntroComplete} />
  }

  return (
    <SpritesContext value={{ sprites, setSprites }}>
      <div className="app-shell">
        <FloatingHearts />
        <main className="app-main">
          <PlaygroundPage />
        </main>
      </div>
    </SpritesContext>
  )
}

export default App
