import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import LinearRegression from '../components/LinearRegression.jsx'
import { useSession } from '../context/SessionContext.jsx'
import '../styles/paper.css'

const TOPIC_ID = 'linear-regression'

function LinearRegressionPage() {
  const { recordSteps } = useSession()
  const handleStepsChange = useCallback((steps) => recordSteps(TOPIC_ID, steps), [recordSteps])

  return (
    <section className="paper">
      <h1>Linear regression</h1>
      <p className="sub">Fit a line, tune parameters, see the error change.</p>
      <LinearRegression onStepsChange={handleStepsChange} />
      <div className="quizCta">
        <Link className="primaryBtn" to={`/topic/${TOPIC_ID}/quiz`}>
          Take the quiz
        </Link>
      </div>
    </section>
  )
}

export default LinearRegressionPage
