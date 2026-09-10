import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

const EXAMPLES = [
  [10, 42],
  [25, 58],
  [40, 71],
  [55, 83],
  [70, 91],
]
const NEW_CASE = 60

const GUESS_OPTIONS = [
  { key: 'low', label: 'Around 55' },
  { key: 'mid', label: 'Around 87' },
  { key: 'high', label: 'Around 95' },
]
const GUESS_FEEDBACK = {
  low: 'That seems on the low side. A junior practising 60 questions is already doing more than most people on this list, and scores have been climbing steadily with practice.',
  mid: "That fits the pattern well. 60 sits between 55 questions (score 83) and 70 questions (score 91), so something close to 87 lines up with how the scores have been climbing.",
  high: 'That might be a touch high for 60 questions. Compare it with the junior who did 70 and scored 91, a smaller jump feels more realistic.',
}

const LABEL_OPTIONS = [
  'Labelled examples, since every row already has the answer filled in',
  'Random examples, since the numbers are all different',
  'Incomplete examples, since some values are missing',
]
const LABEL_CORRECT = 0

const CLUB_OPTIONS = [
  'By whether they feel more technical or more creative',
  'Alphabetically, by name',
  'I would not group them, they all seem too different',
]

function Journey() {
  const { learnerName, setLearnerName } = useSession()
  const [stage, setStage] = useState(learnerName ? 'situation' : 'welcome')
  const [nameInput, setNameInput] = useState('')

  const [guessPick, setGuessPick] = useState(null)
  const [labelPick, setLabelPick] = useState(null)
  const [clubPick, setClubPick] = useState(null)

  if (stage === 'welcome') {
    const canStart = nameInput.trim().length > 0

    function handleStart(e) {
      e.preventDefault()
      if (!canStart) return
      setLearnerName(nameInput)
      setStage('situation')
    }

    return (
      <section className="paper">
        <div className="board journeyBox">
          <h1>Welcome to MLX Studio</h1>
          <p className="storyText">
            Before we start, what should we call you? You'll see your name here and there as you go through the
            lessons.
          </p>
          <form onSubmit={handleStart}>
            <div className="choiceRow" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <input
                type="text"
                className="nameInput"
                placeholder="Your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                maxLength={40}
              />
            </div>
            <div className="stageActions">
              <button type="submit" className="primaryBtn" disabled={!canStart}>
                Start learning
              </button>
            </div>
          </form>
        </div>
      </section>
    )
  }

  if (stage === 'situation') {
    return (
      <section className="paper">
        <div className="board journeyBox">
          <h1>Before we name anything{learnerName ? `, ${learnerName}` : ''}</h1>
          <p className="storyText">
            A junior from your department has been solving practice questions before an exam. A few seniors already
            did the same thing, and you happen to know how many questions they practised and what they scored.
          </p>
          <table className="exampleTable">
            <thead>
              <tr>
                <th>Questions practised</th>
                <th>Score (out of 100)</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map(([q, s]) => (
                <tr key={q}>
                  <td>{q}</td>
                  <td>{s}</td>
                </tr>
              ))}
              <tr className="newRow">
                <td>{NEW_CASE}</td>
                <td>?</td>
              </tr>
            </tbody>
          </table>
          <p className="storyText">
            This junior practised <b>{NEW_CASE}</b> questions. What score would you expect?
          </p>
          <div className="choiceRow">
            {GUESS_OPTIONS.map((g) => (
              <button
                key={g.key}
                className="choiceBtn"
                disabled={guessPick !== null}
                style={{ opacity: guessPick !== null && guessPick !== g.key ? 0.6 : 1 }}
                onClick={() => setGuessPick(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>
          {guessPick && (
            <>
              <div className="storyAnnotation">{GUESS_FEEDBACK[guessPick]}</div>
              <div className="stageActions">
                <button className="primaryBtn" onClick={() => setStage('revealML')}>
                  How did I actually do that?
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  if (stage === 'revealML') {
    return (
      <section className="paper">
        <div className="board journeyBox">
          <h1>You just did something worth noticing</h1>
          <p className="storyText">
            You didn't use any formula. You looked at examples you already had, noticed that score kept climbing as
            practice went up, and used that pattern to make a sensible guess for a case you had never seen before.
          </p>
          <div className="termCallout">Examples → Pattern → Prediction</div>
          <p className="storyText">
            That, in short, is the core idea behind <b>Machine Learning</b>: teaching a computer to notice patterns
            in examples, and then use those patterns to predict or decide something new, the same way you just did.
          </p>
          <div className="termCallout">Machine Learning</div>
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Machine Learning</p>
            <p>
              A computer program is said to learn from experience (data) if its performance on a task improves as
              more examples are given to it, without a human explicitly writing rules for every case.
            </p>
          </div>
          <div className="stageActions">
            <button className="ghostBtn" onClick={() => setStage('situation')}>
              Back
            </button>
            <button className="primaryBtn" onClick={() => setStage('supervised')}>
              Does a computer always learn the same way?
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (stage === 'supervised') {
    const answered = labelPick !== null
    const correct = labelPick === LABEL_CORRECT
    return (
      <section className="paper">
        <div className="board journeyBox">
          <h1>Look at those examples again</h1>
          <table className="exampleTable">
            <thead>
              <tr>
                <th>Questions practised</th>
                <th>Score (out of 100)</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map(([q, s]) => (
                <tr key={q}>
                  <td>{q}</td>
                  <td>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="storyText">Every single row already tells you the actual score. What would you call examples like this?</p>
          <div className="choiceRow">
            {LABEL_OPTIONS.map((opt, i) => (
              <button
                key={opt}
                className="choiceBtn"
                disabled={answered}
                style={{ opacity: answered && i !== labelPick ? 0.6 : 1 }}
                onClick={() => setLabelPick(i)}
              >
                {opt}
              </button>
            ))}
          </div>
          {answered && (
            <>
              <div className={`storyAnnotation ${correct ? 'fbGood' : 'fbBad'}`}>
                <span className="tag">{correct ? 'Right' : 'Have another look'}</span>
                Since every example already comes with its answer, this is called a labelled example. Learning from
                labelled examples, where the answer is already known, is called <b>supervised learning</b>. It is
                what lets you predict an answer for a brand new case.
              </div>
              <div className="termCallout">Supervised Learning</div>
              <div className="formalBox">
                <p className="formalLabel">Formal definition</p>
                <p className="formalTerm">Supervised Learning</p>
                <p>
                  Given a training set of labelled examples (x₁, y₁), (x₂, y₂), ..., (xₙ, yₙ), where each xᵢ is an
                  input and yᵢ is its known, correct output, supervised learning finds a function f so that f(xᵢ) is
                  close to yᵢ for every example, and can then predict y for a brand new x it has never seen.
                </p>
              </div>
              <div className="stageActions">
                <button className="ghostBtn" onClick={() => setStage('revealML')}>
                  Back
                </button>
                <button className="primaryBtn" onClick={() => setStage('unsupervised')}>
                  What if nobody gives you the answers?
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  if (stage === 'unsupervised') {
    const answered = clubPick !== null
    return (
      <section className="paper">
        <div className="board journeyBox">
          <h1>Now, a different kind of problem</h1>
          <p className="storyText">
            Your college has six clubs: Chess Club, Robotics Club, Debate Society, Coding Club, Drama Club, Quiz
            Club. Nobody has told you how to group them. How would you group these, if you had to?
          </p>
          <div className="choiceRow">
            {CLUB_OPTIONS.map((opt, i) => (
              <button
                key={opt}
                className="choiceBtn"
                disabled={answered}
                style={{ opacity: answered && i !== clubPick ? 0.6 : 1 }}
                onClick={() => setClubPick(i)}
              >
                {opt}
              </button>
            ))}
          </div>
          {answered && (
            <>
              <div className="storyAnnotation">
                Notice that nobody handed you a correct grouping this time. Whatever grouping you picked, you were
                looking for similarity yourself. That is <b>unsupervised learning</b>: finding structure in data
                without being told the answer up front. Grouping similar things together like this is called{' '}
                <b>clustering</b>.
              </div>
              <div className="termCallout">Unsupervised Learning</div>
              <div className="formalBox">
                <p className="formalLabel">Formal definition</p>
                <p className="formalTerm">Unsupervised Learning</p>
                <p>
                  Given only inputs x₁, x₂, ..., xₙ with no output labels attached, unsupervised learning looks for
                  structure in the data itself, such as groups of similar points, without being told in advance what
                  the "correct" grouping is. Finding such groups is called <b>clustering</b>.
                </p>
              </div>
              <div className="stageActions">
                <button className="ghostBtn" onClick={() => setStage('supervised')}>
                  Back
                </button>
                <button className="primaryBtn" onClick={() => setStage('bridge')}>
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  // stage === 'bridge'
  return (
    <section className="paper">
      <div className="board journeyBox">
        <h1>Two kinds of problems, two things to try</h1>
        <p className="storyText">
          We've now seen both. In one, the answer is already known in the examples, and you predict a new answer
          (supervised). In the other, nobody tells you the groups, and you find structure yourself (unsupervised,
          clustering being one way to do it).
        </p>
        <p className="storyText">
          Let's go deeper into each. Start with the first kind: predicting a number from examples, the same way you
          guessed that junior's score.
        </p>
        <div className="stageActions">
          <Link className="primaryBtn" to="/topic/linear-regression">
            Start: predicting a price
          </Link>
          <Link className="ghostBtn" to="/topic/k-means">
            Or try grouping first
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Journey
