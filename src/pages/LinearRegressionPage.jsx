import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import LinearRegression from '../components/LinearRegression.jsx'
import AIAssistantPanel from '../components/AIAssistantPanel.jsx'
import RestartLessonButton from '../components/RestartLessonButton.jsx'
import { clearSessionState } from '../hooks/useSessionState.js'
import { useSession } from '../context/SessionContext.jsx'
import '../styles/paper.css'

const TOPIC_ID = 'linear-regression'

function LinearRegressionPage() {
  const { recordSteps } = useSession()
  const [stateDescription, setStateDescription] = useState('')
  const [runId, setRunId] = useState(0)
  const handleRestart = () => {
    clearSessionState(`mlx.${TOPIC_ID}.`)
    setRunId((n) => n + 1)
  }
  const handleStepsChange = useCallback((steps) => recordSteps(TOPIC_ID, steps), [recordSteps])

  return (
    <section className="paper">
      <h1>Linear regression</h1>
      <p className="sub">Fit a line, tune parameters, see the error change.</p>
      <RestartLessonButton onRestart={handleRestart} />
      <LinearRegression key={runId} onStepsChange={handleStepsChange} onStateDescription={setStateDescription} />
      <AIAssistantPanel topic={TOPIC_ID} stateDescription={stateDescription} />
      <div className="quizCta" style={{ gap: 10 }}>
        <Link className="ghostBtn" to="/linear-regression/sandbox">
          Try your own data (sandbox)
        </Link>
        <Link className="primaryBtn" to={`/topic/${TOPIC_ID}/posttest`}>
          Go to the posttest →
        </Link>
      </div>
    </section>
  )
}

export default LinearRegressionPage
