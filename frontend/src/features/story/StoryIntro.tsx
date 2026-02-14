import { useState, useEffect } from 'react'
import './StoryIntro.css'

interface StoryIntroProps {
  onComplete: () => void
}

export default function StoryIntro({ onComplete }: StoryIntroProps) {
  const [phase, setPhase] = useState<'playing' | 'done'>('playing')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('done')
      setTimeout(onComplete, 1000) // fade out then complete
    }, 8000)
    return () => clearTimeout(timer)
  }, [onComplete])

  const handleSkip = () => {
    setPhase('done')
    setTimeout(onComplete, 300)
  }

  return (
    <div className={`story-overlay ${phase === 'done' ? 'story-fade-out' : ''}`}>
      {/* Stage */}
      <div className="story-stage">
        {/* Ground */}
        <div className="story-ground" />

        {/* Miffy bunny */}
        <div className="story-bunny">
          <svg viewBox="0 0 80 120" width="80" height="120">
            {/* Ears */}
            <ellipse cx="30" cy="20" rx="8" ry="28" fill="white" stroke="#ffc2d1" strokeWidth="1.5"/>
            <ellipse cx="50" cy="20" rx="8" ry="28" fill="white" stroke="#ffc2d1" strokeWidth="1.5"/>
            <ellipse cx="30" cy="20" rx="4" ry="22" fill="#ffc2d1" opacity="0.5"/>
            <ellipse cx="50" cy="20" rx="4" ry="22" fill="#ffc2d1" opacity="0.5"/>
            {/* Head */}
            <circle cx="40" cy="55" r="24" fill="white" stroke="#ffc2d1" strokeWidth="1"/>
            {/* Eyes */}
            <circle cx="33" cy="52" r="2.5" fill="#333"/>
            <circle cx="47" cy="52" r="2.5" fill="#333"/>
            {/* X mouth (Miffy style) */}
            <line x1="37" y1="60" x2="43" y2="64" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="43" y1="60" x2="37" y2="64" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Body */}
            <ellipse cx="40" cy="95" rx="18" ry="22" fill="white" stroke="#ffc2d1" strokeWidth="1"/>
            {/* Little pink dress/bow */}
            <path d="M28 85 Q40 78 52 85 Q52 92 40 90 Q28 92 28 85Z" fill="#ffb3c1"/>
          </svg>
        </div>

        {/* Cat */}
        <div className="story-cat">
          <svg viewBox="0 0 80 100" width="70" height="88">
            {/* Tail */}
            <path d="M65 70 Q80 55 72 40" fill="none" stroke="#ffb3c1" strokeWidth="3.5" strokeLinecap="round"/>
            {/* Body */}
            <ellipse cx="40" cy="72" rx="22" ry="16" fill="#ffb3c1"/>
            {/* Head */}
            <circle cx="40" cy="45" r="20" fill="#ffb3c1"/>
            {/* Ears */}
            <polygon points="24,30 18,12 34,26" fill="#ffb3c1"/>
            <polygon points="26,29 21,16 32,27" fill="#ff8fa3"/>
            <polygon points="56,30 62,12 46,26" fill="#ffb3c1"/>
            <polygon points="54,29 59,16 48,27" fill="#ff8fa3"/>
            {/* Eyes */}
            <circle cx="33" cy="43" r="2.5" fill="#333"/>
            <circle cx="47" cy="43" r="2.5" fill="#333"/>
            <circle cx="34" cy="42" r="0.8" fill="white"/>
            <circle cx="48" cy="42" r="0.8" fill="white"/>
            {/* Nose */}
            <ellipse cx="40" cy="49" rx="2" ry="1.5" fill="#ff6b81"/>
            {/* Mouth */}
            <path d="M37 51 Q40 54 43 51" fill="none" stroke="#333" strokeWidth="1.2" strokeLinecap="round"/>
            {/* Blush */}
            <ellipse cx="28" cy="50" rx="4" ry="2.5" fill="#ff8fa3" opacity="0.4"/>
            <ellipse cx="52" cy="50" rx="4" ry="2.5" fill="#ff8fa3" opacity="0.4"/>
          </svg>
        </div>

        {/* Hearts burst */}
        <div className="story-hearts-burst">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="story-burst-heart" style={{ '--i': i } as React.CSSProperties}>
              &#10084;
            </span>
          ))}
        </div>

        {/* Love text */}
        <div className="story-text">
          <span className="story-text-line1">A little bunny...</span>
          <span className="story-text-line2">met a little cat...</span>
          <span className="story-text-line3">and it was love &#10084;</span>
        </div>
      </div>

      <button className="story-skip" onClick={handleSkip}>
        Skip &rarr;
      </button>
    </div>
  )
}
