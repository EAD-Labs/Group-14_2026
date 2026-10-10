import { useState } from 'react'
import { Link } from 'react-router-dom'
import AIAssistantPanel from '../components/AIAssistantPanel.jsx'
import ExperimentLog from '../components/ExperimentLog.jsx'
import GoFurtherPanel from '../components/GoFurtherPanel.jsx'
import GradientDescent from '../components/GradientDescent.jsx'
import RestartLessonButton from '../components/RestartLessonButton.jsx'
import { useExperimentLog } from '../hooks/useExperimentLog.js'
import { clearSessionState } from '../hooks/useSessionState.js'
import '../styles/paper.css'

const TOPIC_ID = 'gradient-descent'

function GradientDescentPage() {
  const [stateDescription, setStateDescription] = useState('')
  const [runId, setRunId] = useState(0)
  const { entries, addEntry, clear } = useExperimentLog(TOPIC_ID)
  const handleRestart = () => {
    clearSessionState(`mlx.${TOPIC_ID}.`)
    setRunId((n) => n + 1)
  }
  return (
    <section className="paper">
      <h1>Gradient descent — finding the bottom of the bowl</h1>
      <p className="sub">
        Linear Regression&apos;s guided lesson jumps straight to the exact formula (OLS). This is the other way to solve
        the same problem: start anywhere, and repeatedly nudge downhill until you reach the lowest error. The surface
        below plots every possible slope and intercept against how wrong that line would be.
      </p>
      <RestartLessonButton onRestart={handleRestart} />
      <GradientDescent key={runId} onStateDescription={setStateDescription} onExperiment={addEntry} />
      <ExperimentLog topicKey={TOPIC_ID} entries={entries} onClear={clear} />
      <GoFurtherPanel topic="gradientDescent" />
      <AIAssistantPanel
        topic={TOPIC_ID}
        stateDescription={stateDescription}
        history={entries.slice(-6).map((e) => e.text)}
      />
      <p className="sub" style={{ margin: '16px 0 0', fontSize: '12px' }}>
        Same dataset as the Linear Regression lesson: area (100 sq ft) vs. price (₹ lakh), 10 listings. The star marks
        the exact answer OLS computes directly.
      </p>
      <div className="quizCta">
        <Link className="primaryBtn" to={`/topic/${TOPIC_ID}/posttest`}>
          Go to the posttest →
        </Link>
      </div>
    </section>
  )
}

export default GradientDescentPage
