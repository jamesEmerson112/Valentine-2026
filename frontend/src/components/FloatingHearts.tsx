import { useMemo } from 'react'
import './FloatingHearts.css'

export default function FloatingHearts() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${3 + Math.random() * 4}s`,
        size: `${14 + Math.random() * 20}px`,
        opacity: 0.2 + Math.random() * 0.3,
      })),
    []
  )

  return (
    <div className="floating-hearts-bg" aria-hidden="true">
      {hearts.map((h) => (
        <span
          key={h.key}
          className="fh-heart"
          style={{
            left: h.left,
            animationDelay: h.delay,
            animationDuration: h.duration,
            fontSize: h.size,
            opacity: h.opacity,
          }}
        >
          &#10084;
        </span>
      ))}
    </div>
  )
}
