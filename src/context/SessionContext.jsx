import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const SessionContext = createContext(null)

const NAME_KEY = 'mlx-learner-name'

function emptySession() {
  return { steps: 0, quizCorrect: 0, quizTotal: 0 }
}

function getStoredName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState({})
  const [learnerName, setLearnerNameState] = useState(getStoredName)

  const recordSteps = useCallback((topicId, steps) => {
    setSessions((prev) => ({ ...prev, [topicId]: { ...emptySession(), ...prev[topicId], steps } }))
  }, [])

  const recordQuizResult = useCallback((topicId, quizCorrect, quizTotal) => {
    setSessions((prev) => ({ ...prev, [topicId]: { ...emptySession(), ...prev[topicId], quizCorrect, quizTotal } }))
  }, [])

  const getSession = useCallback((topicId) => sessions[topicId] ?? emptySession(), [sessions])

  const setLearnerName = useCallback((name) => {
    const trimmed = name.trim()
    setLearnerNameState(trimmed)
    try {
      if (trimmed) localStorage.setItem(NAME_KEY, trimmed)
      else localStorage.removeItem(NAME_KEY)
    } catch {
      // ignore storage errors (private browsing etc.)
    }
  }, [])

  const value = useMemo(
    () => ({ recordSteps, recordQuizResult, getSession, learnerName, setLearnerName }),
    [recordSteps, recordQuizResult, getSession, learnerName, setLearnerName],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
