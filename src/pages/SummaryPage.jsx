import { Link, useParams } from 'react-router-dom'
import { TOPICS } from '../data/topics.js'
import { useSession } from '../context/SessionContext.jsx'
import NotFound from './NotFound.jsx'
import '../styles/paper.css'

const BRIDGE = {
  'linear-regression': {
    text: 'Predicting a number from examples is one half of the picture. The other half is finding groups in data without being told the answer, which is exactly the kind of problem you started noticing back in the introduction.',
    to: '/topic/k-means',
    label: 'Now try grouping',
  },
  'k-means': {
    text: "You've now been through both major kinds of problems: predicting an answer from labelled examples, and finding structure yourself when nobody gives you the answer. That difference is really the heart of most of Machine Learning.",
    to: '/',
    label: 'Back to the introduction',
  },
}

function SummaryPage() {
  const { topicId } = useParams()
  const { getSession } = useSession()
  const topic = TOPICS[topicId]

  if (!topic) return <NotFound />

  const session = getSession(topicId)
  const bridge = BRIDGE[topicId]

  return (
    <section className="paper">
      <div className="board sumBox">
        <h1>Session summary</h1>
        <div className="sumStat">
          <span>Topic</span>
          <b>{topic.name}</b>
        </div>
        <div className="sumStat">
          <span>Steps taken in simulation</span>
          <b>{session.steps}</b>
        </div>
        <div className="sumStat">
          <span>Quiz score</span>
          <b>
            {session.quizCorrect} / {session.quizTotal}
          </b>
        </div>
        {bridge && <p className="storyText" style={{ marginTop: 16 }}>{bridge.text}</p>}
        <div className="sumFooter">
          <Link className="ghostBtn" to={`/topic/${topicId}`}>
            Restart this topic
          </Link>
          {bridge ? (
            <Link className="primaryBtn" to={bridge.to}>
              {bridge.label}
            </Link>
          ) : (
            <Link className="primaryBtn" to="/">
              Explore another topic
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

export default SummaryPage
