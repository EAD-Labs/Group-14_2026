import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QUIZ, TOPICS } from '../data/topics.js'
import { useSession } from '../context/SessionContext.jsx'
import NotFound from './NotFound.jsx'
import '../styles/paper.css'

function QuizPage() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const { recordQuizResult } = useSession()
  const topic = TOPICS[topicId]
  const bank = QUIZ[topicId]

  const [index, setIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState(null)

  if (!topic || !bank) return <NotFound />

  const question = bank[index]
  const answered = selected !== null
  const isLastQuestion = index + 1 >= bank.length

  function handleAnswer(optionIdx) {
    if (answered) return
    setSelected(optionIdx)
    if (optionIdx === question.correct) setCorrectCount((c) => c + 1)
  }

  function handleNext() {
    if (isLastQuestion) {
      recordQuizResult(topicId, correctCount, bank.length)
      navigate(`/topic/${topicId}/summary`)
    } else {
      setIndex((i) => i + 1)
      setSelected(null)
    }
  }

  return (
    <section className="paper">
      <div className="board quizBox">
        <h1>{topic.name} — check your understanding</h1>
        <p className="sub">
          Question {index + 1} of {bank.length}
        </p>
        <div className="qCard">
          <p className="qPrompt">{question.prompt}</p>
          <div className="qOpts">
            {question.opts.map((opt, i) => {
              let cls = 'qOpt'
              if (answered && i === question.correct) cls += ' correct'
              else if (answered && i === selected) cls += ' wrong'
              return (
                <button key={opt} className={cls} disabled={answered} onClick={() => handleAnswer(i)}>
                  {opt}
                </button>
              )
            })}
          </div>
          {answered && (
            <>
              <p className="qExplain">{question.explain}</p>
              <button className="primaryBtn" style={{ marginTop: 10 }} onClick={handleNext}>
                {isLastQuestion ? 'See results' : 'Next question'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default QuizPage
