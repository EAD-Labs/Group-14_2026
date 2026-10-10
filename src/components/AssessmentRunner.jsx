import { useState } from 'react'

// Shuffles answer options once per question, so the correct answer is not always in the same place.
function shuffledOrder(n) {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// Runs a list of questions.
//   mode 'pre':  no feedback while answering (so the posttest stays a fair comparison)
//   mode 'post': shows right / wrong and the explanation after every answer
// items: [{ index, prompt, opts, correct, explain }], index = position in the topic's quiz bank.
function AssessmentRunner({ items, mode, onFinish }) {
  const [orders] = useState(() => items.map((q) => shuffledOrder(q.opts.length)))
  const [pos, setPos] = useState(0)
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState({})

  const q = items[pos]
  const order = orders[pos]
  const answered = selected !== null
  const isLast = pos + 1 >= items.length
  const showFeedback = mode === 'post' && answered

  function choose(optIdx) {
    if (answered) return
    setSelected(optIdx)
    setResults((r) => ({ ...r, [q.index]: optIdx === q.correct }))
  }

  function next() {
    if (isLast) {
      onFinish(results)
      return
    }
    setPos((p) => p + 1)
    setSelected(null)
  }

  return (
    <div className="qCard assess">
      <div className="assessProgress" aria-hidden="true">
        {items.map((it, i) => (
          <span key={it.index} className={`assessDot${i < pos ? ' done' : ''}${i === pos ? ' current' : ''}`} />
        ))}
      </div>
      <p className="sectionLabel">
        Question {pos + 1} of {items.length}
      </p>
      <p className="qPrompt">{q.prompt}</p>
      <div className="qOpts" role="group" aria-label="Answer options">
        {order.map((optIdx) => {
          let cls = 'qOpt'
          if (showFeedback && optIdx === q.correct) cls += ' correct'
          else if (showFeedback && optIdx === selected) cls += ' wrong'
          else if (mode === 'pre' && optIdx === selected) cls += ' picked'
          return (
            <button key={optIdx} type="button" className={cls} disabled={answered} onClick={() => choose(optIdx)}>
              {q.opts[optIdx]}
            </button>
          )
        })}
      </div>
      {showFeedback && (
        <p className="qExplain" role="status">
          <b>{selected === q.correct ? 'Correct. ' : 'Not quite. '}</b>
          {q.explain}
        </p>
      )}
      {answered && (
        <button type="button" className="primaryBtn" style={{ marginTop: 10 }} onClick={next}>
          {isLast ? 'See my score' : 'Next question'}
        </button>
      )}
    </div>
  )
}

export default AssessmentRunner
