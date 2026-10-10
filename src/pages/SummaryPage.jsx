import { Link, useParams } from 'react-router-dom'
import { TOPICS } from '../data/topics.js'
import { scoreOn, useSession } from '../context/SessionContext.jsx'
import { PRETEST_ITEMS } from '../data/labContent.js'
import NotFound from './NotFound.jsx'
import '../styles/paper.css'

function SummaryPage() {
  const { topicId } = useParams()
  const { getSession, getAssessment } = useSession()
  const topic = TOPICS[topicId]

  if (!topic) return <NotFound />

  const session = getSession(topicId)
  const a = getAssessment(topicId)
  const preItems = PRETEST_ITEMS[topicId] || []
  const pre = scoreOn(a.pre, preItems)
  const postSame = scoreOn(a.post, preItems)
  const fmt = (sc) => (sc ? `${sc.correct} / ${sc.total}` : 'not taken')

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
          <span>Pretest</span>
          <b>{fmt(pre)}</b>
        </div>
        <div className="sumStat">
          <span>Same questions in the posttest</span>
          <b>{fmt(postSame)}</b>
        </div>
        <div className="sumStat">
          <span>Full posttest score</span>
          <b>
            {session.quizCorrect} / {session.quizTotal}
          </b>
        </div>
        <div className="sumFooter">
          <Link className="ghostBtn" to={`/topic/${topicId}`}>
            Restart this topic
          </Link>
          <Link className="primaryBtn" to="/">
            Explore another topic
          </Link>
        </div>
      </div>
    </section>
  )
}

export default SummaryPage
