import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState.js'

const SessionContext = createContext(null)

const NAME_KEY = 'mlx-learner-name'
const ASSESSMENT_KEY = 'mlx.assessments'

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

// { [topicId]: { pre?: Result, post?: Result } }, Result = { correctByItem: { [questionIndex]: boolean } }
function isAssessmentStore(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState({})
  const [learnerName, setLearnerNameState] = useState(getStoredName)
  const [assessments, setAssessments] = useSessionState(ASSESSMENT_KEY, {}, isAssessmentStore)

  const recordSteps = useCallback((topicId, steps) => {
    setSessions((prev) => ({ ...prev, [topicId]: { ...emptySession(), ...prev[topicId], steps } }))
  }, [])

  const recordQuizResult = useCallback((topicId, quizCorrect, quizTotal) => {
    setSessions((prev) => ({ ...prev, [topicId]: { ...emptySession(), ...prev[topicId], quizCorrect, quizTotal } }))
  }, [])

  // kind is 'pre' or 'post'; correctByItem maps a question index in QUIZ[topicId] to true or false.
  const recordAssessment = useCallback(
    (topicId, kind, correctByItem) => {
      setAssessments((prev) => ({
        ...prev,
        [topicId]: { ...(prev[topicId] || {}), [kind]: { correctByItem, at: Date.now() } },
      }))
    },
    [setAssessments],
  )

  const getAssessment = useCallback((topicId) => assessments[topicId] || {}, [assessments])

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
    () => ({
      recordSteps,
      recordQuizResult,
      getSession,
      learnerName,
      setLearnerName,
      recordAssessment,
      getAssessment,
    }),
    [recordSteps, recordQuizResult, getSession, learnerName, setLearnerName, recordAssessment, getAssessment],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}

// Score on a list of question indices, or null if that assessment has not been taken.
export function scoreOn(result, items) {
  if (!result || !result.correctByItem) return null
  const answered = items.filter((i) => i in result.correctByItem)
  if (answered.length === 0) return null
  return { correct: answered.filter((i) => result.correctByItem[i]).length, total: answered.length }
}
