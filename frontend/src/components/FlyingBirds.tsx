import { useMemo } from 'react'
import './FlyingBirds.css'

interface Bird {
  key: number
  top: string
  delay: string
  duration: string
  size: number
  opacity: number
  direction: 'left' | 'right'
  flapDuration: string
}

export default function FlyingBirds() {
  const birds = useMemo<Bird[]>(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        key: i,
        top: `${10 + Math.random() * 40}%`,
        delay: `${Math.random() * 12}s`,
        duration: `${8 + Math.random() * 7}s`,
        size: 12 + Math.random() * 12,
        opacity: 0.3 + Math.random() * 0.3,
        direction: Math.random() > 0.5 ? 'right' : 'left',
        flapDuration: `${0.3 + Math.random() * 0.3}s`,
      })),
    []
  )

  return (
    <div className="flying-birds" aria-hidden="true">
      {birds.map((bird) => (
        <div
          key={bird.key}
          className="fb-bird"
          style={{
            top: bird.top,
            animationName: bird.direction === 'right' ? 'fbFlyRight' : 'fbFlyLeft',
            animationDuration: bird.duration,
            animationDelay: bird.delay,
            opacity: bird.opacity,
          }}
        >
          <svg
            className="fb-bird-svg"
            width={bird.size}
            height={bird.size * 0.5}
            viewBox="0 0 24 12"
            fill="none"
            style={{
              animationDuration: bird.flapDuration,
              transform: bird.direction === 'left' ? 'scaleX(-1)' : undefined,
            }}
          >
            <path
              d="M12 10 C8 2, 2 0, 0 4"
              stroke="var(--pink-dark)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M12 10 C16 2, 22 0, 24 4"
              stroke="var(--pink-dark)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
