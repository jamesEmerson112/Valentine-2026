import { useState } from 'react'

const STORAGE_KEY = 'valentine2026_visited'

export function useFirstVisit(): [boolean, () => void] {
  const [isFirstVisit] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true'
    } catch {
      return false
    }
  })

  const markVisited = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // localStorage not available
    }
  }

  return [isFirstVisit, markVisited]
}
