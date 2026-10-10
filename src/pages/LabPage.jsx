import { useEffect, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { QUIZ, TOPICS } from '../data/topics.js'
import { LAB_CONTENT, LAB_SECTIONS, LAB_SECTION_IDS, PRETEST_ITEMS } from '../data/labContent.js'
import { scoreOn, useSession } from '../context/SessionContext.jsx'
import AssessmentRunner from '../components/AssessmentRunner.jsx'
import VideoEmbed from '../components/VideoEmbed.jsx'
import LinearRegressionPage from './LinearRegressionPage.jsx'
import KMeansPage from './KMeansPage.jsx'
import GradientDescentPage from './GradientDescentPage.jsx'
import NotFound from './NotFound.jsx'
import '../styles/paper.css'
import '../styles/lab.css'

const SIMULATIONS = {
  'linear-regression': LinearRegressionPage,
  'k-means': KMeansPage,
  'gradient-descent': GradientDescentPage,
}

const TEACHER_PATHS = {
  'linear-regression': '/teacher/linear-regression',
  'k-means': '/teacher/k-means',
  'gradient-descent': '/teacher/gradient-descent',
}

function quizItems(topicId, indices) {
  return indices.map((index) => ({ index, ...QUIZ[topicId][index] }))
}

function allIndices(topicId) {
  return QUIZ[topicId].map((_, i) => i)
}

// ---------- sidebar ----------

function LabSidebar({ topicId, topic, current }) {
  const { getAssessment } = useSession()
  const a = getAssessment(topicId)
  const done = { pretest: Boolean(a.pre), posttest: Boolean(a.post) }
  return (
    <nav className="labNav" aria-label={`${topic.name} sections`}>
      <div className="labNavHead">
        <span className="labNavIco" aria-hidden="true">
          {topic.ico}
        </span>
        <span className="labNavTopic">{topic.name}</span>
      </div>
      <ol className="labNavList">
        {LAB_SECTIONS.map((s, i) => (
          <li key={s.id}>
            <NavLink
              to={`/topic/${topicId}/${s.id}`}
              className={`labNavItem${s.id === current ? ' active' : ''}`}
              aria-current={s.id === current ? 'page' : undefined}
            >
              <span className="labNavNum">{done[s.id] ? '✓' : i + 1}</span>
              <span>{s.label}</span>
            </NavLink>
          </li>
        ))}
      </ol>
      <Link className="labNavTeacher" to={TEACHER_PATHS[topicId]}>
        Open in Teacher Mode →
      </Link>
    </nav>
  )
}

function PrevNext({ topicId, current }) {
  const i = LAB_SECTION_IDS.indexOf(current)
  const prev = LAB_SECTIONS[i - 1]
  const next = LAB_SECTIONS[i + 1]
  return (
    <div className="labPrevNext">
      {prev ? (
        <Link className="ghostBtn" to={`/topic/${topicId}/${prev.id}`}>
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="primaryBtn" to={`/topic/${topicId}/${next.id}`}>
          {next.label} →
        </Link>
      )}
    </div>
  )
}

// ---------- sections ----------

function AimSection({ topicId, topic, content }) {
  return (
    <div className="labCard">
      <p className="labKicker">Aim</p>
      <h1>{topic.name}</h1>
      <p className="labLead">{content.aim}</p>
      <div className="labTwoCol">
        <div>
          <div className="sectionLabel">Learning objectives</div>
          <ul className="objList">
            {topic.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="sectionLabel">Prerequisites</div>
          <ul className="objList">
            {topic.prereqs.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="sectionLabel">Time</div>
          <span className="pill">{topic.time}</span>
        </div>
      </div>
      <div className="labPath" aria-label="How this lab works">
        {LAB_SECTIONS.slice(1).map((s) => (
          <Link key={s.id} to={`/topic/${topicId}/${s.id}`} className="labPathStep">
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function TheorySection({ topic, content }) {
  return (
    <div className="labCard">
      <p className="labKicker">Theory</p>
      <h1>The ideas behind {topic.name.toLowerCase()}</h1>
      {topic.video?.youtubeId && (
        <details className="labVideo">
          <summary>Watch a short video first (optional)</summary>
          <VideoEmbed video={topic.video} />
        </details>
      )}
      {content.theory.map((block) => (
        <section className="theoryBlock" key={block.heading}>
          <h2>{block.heading}</h2>
          {block.text && <p>{block.text}</p>}
          {block.list && (
            <ul>
              {block.list.map((li) => (
                <li key={li}>{li}</li>
              ))}
            </ul>
          )}
          {block.formula && <div className="theoryFormula">{block.formula}</div>}
          {block.note && <p className="theoryNote">{block.note}</p>}
        </section>
      ))}
    </div>
  )
}

function ScoreBar({ label, score }) {
  const pct = score ? (score.correct / score.total) * 100 : 0
  return (
    <div className="scoreRow">
      <span className="scoreLabel">{label}</span>
      <span className="scoreTrack">
        <span className="scoreFill" style={{ width: `${pct}%` }} />
      </span>
      <b className="scoreVal">{score ? `${score.correct} / ${score.total}` : 'not taken'}</b>
    </div>
  )
}

function PretestSection({ topicId, topic }) {
  const { getAssessment, recordAssessment } = useSession()
  const items = PRETEST_ITEMS[topicId]
  const existing = getAssessment(topicId).pre
  const [running, setRunning] = useState(false)
  const score = scoreOn(existing, items)

  return (
    <div className="labCard">
      <p className="labKicker">Pretest</p>
      <h1>What do you already know?</h1>
      {running ? (
        <AssessmentRunner
          items={quizItems(topicId, items)}
          mode="pre"
          onFinish={(res) => {
            recordAssessment(topicId, 'pre', res)
            setRunning(false)
          }}
        />
      ) : existing ? (
        <>
          <p className="labLead">
            Pretest done. You will see these {items.length} questions again in the posttest, with answers, so you can see
            how much the simulation helped.
          </p>
          <ScoreBar label="Pretest" score={score} />
          <div className="labActions">
            <Link className="primaryBtn" to={`/topic/${topicId}/procedure`}>
              Continue to the procedure →
            </Link>
            <button type="button" className="ghostBtn" onClick={() => setRunning(true)}>
              Retake pretest
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="labLead">
            {items.length} quick questions about {topic.name.toLowerCase()}. Answer with your best guess: this is not
            graded and answers are not shown yet. The posttest asks the same questions after the simulation.
          </p>
          <button type="button" className="primaryBtn" onClick={() => setRunning(true)}>
            Start the pretest
          </button>
        </>
      )}
    </div>
  )
}

function ProcedureSection({ topicId, content }) {
  return (
    <div className="labCard">
      <p className="labKicker">Procedure</p>
      <h1>How to do the experiment</h1>
      <ol className="procList">
        {content.procedure.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Link className="primaryBtn" to={`/topic/${topicId}/simulation`}>
        Open the simulation →
      </Link>
    </div>
  )
}

function PosttestSection({ topicId }) {
  const { getAssessment, recordAssessment, recordQuizResult } = useSession()
  const a = getAssessment(topicId)
  const [running, setRunning] = useState(false)
  const preItems = PRETEST_ITEMS[topicId]
  const all = allIndices(topicId)
  const preScore = scoreOn(a.pre, preItems)
  const postSameScore = scoreOn(a.post, preItems)
  const postAllScore = scoreOn(a.post, all)
  const gain = preScore && postSameScore ? postSameScore.correct - preScore.correct : null

  return (
    <div className="labCard">
      <p className="labKicker">Posttest</p>
      <h1>Check your understanding</h1>
      {running ? (
        <AssessmentRunner
          items={quizItems(topicId, all)}
          mode="post"
          onFinish={(res) => {
            recordAssessment(topicId, 'post', res)
            recordQuizResult(topicId, Object.values(res).filter(Boolean).length, all.length)
            setRunning(false)
          }}
        />
      ) : a.post ? (
        <>
          <p className="labLead">
            {gain === null
              ? 'Posttest done.'
              : gain > 0
                ? `You answered ${gain} more of the pretest questions correctly after the simulation.`
                : gain === 0
                  ? 'Same score on the pretest questions as before. Revisit the theory or the simulation for the ones you missed.'
                  : 'You scored lower on the pretest questions this time. Revisit the theory and try again.'}
          </p>
          <div className="scoreCard">
            <ScoreBar label="Pretest" score={preScore} />
            <ScoreBar label="Same questions, after" score={postSameScore} />
            <ScoreBar label="Full posttest" score={postAllScore} />
          </div>
          <div className="labActions">
            <Link className="primaryBtn" to={`/topic/${topicId}/summary`}>
              See session summary
            </Link>
            <button type="button" className="ghostBtn" onClick={() => setRunning(true)}>
              Retake posttest
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="labLead">
            {all.length} questions, with the answer and an explanation after each one.
            {!a.pre && ' You skipped the pretest, so there will be no before-and-after comparison.'}
          </p>
          <button type="button" className="primaryBtn" onClick={() => setRunning(true)}>
            Start the posttest
          </button>
        </>
      )}
    </div>
  )
}

function ReferencesSection({ content }) {
  return (
    <div className="labCard">
      <p className="labKicker">References</p>
      <h1>Read and explore further</h1>
      <ul className="refList">
        {content.references.map((r) => (
          <li key={r.href + r.title}>
            <a href={r.href} target="_blank" rel="noopener noreferrer">
              {r.title}
            </a>
            <span>{r.source}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- page ----------

function LabPage() {
  const { topicId, section = 'aim' } = useParams()
  const topic = TOPICS[topicId]
  const content = LAB_CONTENT[topicId]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [topicId, section])

  if (!topic || !content || !LAB_SECTION_IDS.includes(section)) return <NotFound />

  const Simulation = SIMULATIONS[topicId]
  let body
  if (section === 'aim') body = <AimSection topicId={topicId} topic={topic} content={content} />
  else if (section === 'theory') body = <TheorySection topic={topic} content={content} />
  else if (section === 'pretest') body = <PretestSection key={topicId} topicId={topicId} topic={topic} />
  else if (section === 'procedure') body = <ProcedureSection topicId={topicId} content={content} />
  else if (section === 'simulation') body = <Simulation />
  else if (section === 'posttest') body = <PosttestSection key={topicId} topicId={topicId} />
  else body = <ReferencesSection content={content} />

  return (
    <section className="paper lab">
      <LabSidebar topicId={topicId} topic={topic} current={section} />
      <div className="labMain">
        {body}
        <PrevNext topicId={topicId} current={section} />
      </div>
    </section>
  )
}

export default LabPage
