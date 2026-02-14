import { useState, useEffect } from 'react'
import './App.css'

interface ValentineData {
  message: string
  from: string
}

function App() {
  const [valentine, setValentine] = useState<ValentineData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchValentine = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/valentine')
      const data: ValentineData = await res.json()
      setValentine(data)
    } catch {
      setValentine({ message: 'You are loved!', from: 'Your Valentine' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchValentine()
  }, [])

  return (
    <div className="valentine-container">
      <div className="hearts-bg" aria-hidden="true">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="floating-heart" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            fontSize: `${14 + Math.random() * 20}px`,
            opacity: 0.3 + Math.random() * 0.4,
          }}>
            &#10084;
          </span>
        ))}
      </div>

      <div className="card">
        <h1 className="title">Happy Valentine's Day</h1>
        <div className="heart-divider">&#10084;</div>

        {loading ? (
          <p className="message">...</p>
        ) : valentine ? (
          <>
            <p className="message">"{valentine.message}"</p>
            <p className="from">&mdash; {valentine.from}</p>
          </>
        ) : null}

        <button className="btn" onClick={fetchValentine} disabled={loading}>
          Get Another Valentine
        </button>
      </div>
    </div>
  )
}

export default App
