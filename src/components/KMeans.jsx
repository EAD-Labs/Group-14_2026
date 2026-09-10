import { useEffect, useRef, useState } from 'react'
import './KMeans.css'

const POINTS = [
  [2, 2],
  [3, 2],
  [2, 3],
  [3, 3],
  [1.5, 2.5],
  [2.5, 1.5],
  [3.5, 2.8],
  [2, 3.6],
  [7, 7],
  [8, 7],
  [7, 8],
  [8, 8],
  [6.5, 7.5],
  [7.5, 6.2],
  [8.3, 7.6],
  [7, 6.3],
]

// K = 3 deliberately puts two starting centres inside the same bottom-left
// group, so the learner can see a real group get sliced into two pieces.
const START_CENTROIDS_BY_K = {
  2: [
    [1.5, 1.5],
    [3.8, 3.5],
  ],
  3: [
    [1.3, 1.3],
    [2.8, 2.6],
    [7.5, 7.2],
  ],
}

const COLOR_NAMES = ['Blue', 'Rust', 'Green']
const COLORS = ['var(--blue)', 'var(--rust)', 'var(--good)']

const MAX_ITERS = 6
const CONVERGENCE_EPS = 0.01
const RUN_DELAY_MS = 700

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function makeScale(xMin, xMax, yMin, yMax, padL, padR, padT, padB, W, H) {
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  return {
    px: (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW,
    py: (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH,
  }
}

const SCALE = makeScale(0, 10, 0, 10, 44, 16, 14, 36, 560, 340)

function makeInitialSim(k) {
  return {
    centroids: START_CENTROIDS_BY_K[k].map((c) => c.slice()),
    assign: POINTS.map(() => null),
    iter: 0,
    converged: false,
  }
}

function focusIndexForIter(iter) {
  return (iter * 5 + 3) % POINTS.length
}

function computeStep(sim, guess, focusIdx) {
  const centroids = sim.centroids.map((c) => c.slice())
  const newAssign = POINTS.map((p) => {
    let best = 0
    let bestD = Infinity
    centroids.forEach((c, i) => {
      const d = dist(p, c)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  })

  const groups = centroids.map((_, i) => POINTS.filter((_, idx) => newAssign[idx] === i))
  const means = groups.map((g, i) =>
    g.length ? [g.reduce((a, p) => a + p[0], 0) / g.length, g.reduce((a, p) => a + p[1], 0) / g.length] : centroids[i],
  )
  const moved = means.reduce((s, mn, i) => s + dist(mn, centroids[i]), 0)
  const nextIter = sim.iter + 1
  const converged = moved < CONVERGENCE_EPS || nextIter >= MAX_ITERS
  const sizes = groups.map((g) => g.length)

  let kind = null
  let prefix = ''
  if (guess !== null && guess !== undefined && focusIdx !== null && focusIdx !== undefined) {
    const correct = newAssign[focusIdx] === guess
    kind = correct ? 'fbGood' : 'fbBad'
    prefix = `<span class="tag">${correct ? 'Correct' : 'Not quite'}</span>`
  }

  let html = `${prefix}<span class="tag">Iteration ${nextIter}</span>Points reassigned to their nearest centre (${sizes.join(', ')} points respectively). Each centre moved to the average position of its own group.`
  if (converged) html += ' Centres have stopped moving. That is convergence.'

  return {
    sim: { centroids: means, assign: newAssign, iter: nextIter, converged },
    annotation: { html, kind },
  }
}

function ChartFrame({ children }) {
  return (
    <svg viewBox="0 0 560 340" role="img" aria-label="Interactive k-means clustering chart">
      <line x1={SCALE.px(0)} y1={SCALE.py(0)} x2={SCALE.px(0)} y2={SCALE.py(10)} stroke="#C9C1A8" />
      <line x1={SCALE.px(0)} y1={SCALE.py(0)} x2={SCALE.px(10)} y2={SCALE.py(0)} stroke="#C9C1A8" />
      <text className="axLbl" x={SCALE.px(5)} y="332" textAnchor="middle">
        x
      </text>
      <text className="axLbl" x="12" y={SCALE.py(5)} textAnchor="middle" transform={`rotate(-90 12 ${SCALE.py(5)})`}>
        y
      </text>
      {children}
    </svg>
  )
}

function PointDots({ assign, highlightIdx }) {
  return POINTS.map((p, i) => {
    const cIdx = assign[i]
    const color = cIdx === null || cIdx === undefined ? '#9C9584' : COLORS[cIdx]
    return (
      <g key={`point-${i}`}>
        {highlightIdx === i && (
          <circle cx={SCALE.px(p[0])} cy={SCALE.py(p[1])} r="10" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        )}
        <circle cx={SCALE.px(p[0])} cy={SCALE.py(p[1])} r="5" fill={color} />
      </g>
    )
  })
}

function CentroidMarks({ centroids }) {
  return centroids.map((c, i) => (
    <rect
      key={`centroid-${i}`}
      x={SCALE.px(c[0]) - 6}
      y={SCALE.py(c[1]) - 6}
      width="12"
      height="12"
      fill="none"
      stroke={COLORS[i]}
      strokeWidth="2.5"
      transform={`rotate(45 ${SCALE.px(c[0])} ${SCALE.py(c[1])})`}
    />
  ))
}

function KMeans({ onStepsChange } = {}) {
  const [stage, setStage] = useState('table')
  const [k, setK] = useState(null)
  const [groupNote, setGroupNote] = useState(false)

  const [sim, setSim] = useState(() => makeInitialSim(2))
  const [running, setRunning] = useState(false)
  const [annotation, setAnnotation] = useState(null)
  const [awaitingGuess, setAwaitingGuess] = useState(false)
  const [focusIdx, setFocusIdx] = useState(null)
  const [reflectPick, setReflectPick] = useState(null)

  const simRef = useRef(sim)
  const timerRef = useRef(null)

  useEffect(() => {
    simRef.current = sim
  }, [sim])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    onStepsChange?.(sim.iter)
  }, [sim.iter, onStepsChange])

  function pickK(chosenK) {
    setK(chosenK)
    setGroupNote(true)
  }

  function startCentres() {
    const fresh = makeInitialSim(k)
    simRef.current = fresh
    setSim(fresh)
    setAnnotation({
      html: 'Press "Step forward" to begin. Watch which point you are asked to predict for.',
      kind: null,
    })
    setStage('centres')
  }

  function beginStepping() {
    setStage('stepping')
  }

  function doStep(guess, idx) {
    const result = computeStep(simRef.current, guess, idx)
    simRef.current = result.sim
    setSim(result.sim)
    setAnnotation(result.annotation)
    return result.sim.converged
  }

  function handleStepClick() {
    const idx = focusIndexForIter(simRef.current.iter)
    setFocusIdx(idx)
    setAwaitingGuess(true)
  }

  function handleGuess(colorIdx) {
    setAwaitingGuess(false)
    doStep(colorIdx, focusIdx)
    setFocusIdx(null)
  }

  function handleRun() {
    if (running || simRef.current.converged) return
    setAwaitingGuess(false)
    setFocusIdx(null)
    setRunning(true)
    const tick = () => {
      const done = doStep(null, null)
      if (!done) {
        timerRef.current = setTimeout(tick, RUN_DELAY_MS)
      } else {
        setRunning(false)
      }
    }
    tick()
  }

  function handleReset() {
    clearTimeout(timerRef.current)
    const fresh = makeInitialSim(k)
    simRef.current = fresh
    setSim(fresh)
    setRunning(false)
    setAwaitingGuess(false)
    setFocusIdx(null)
    setReflectPick(null)
    setAnnotation({ html: 'Press "Step forward" to begin.', kind: null })
  }

  function startOver() {
    clearTimeout(timerRef.current)
    setStage('group')
    setK(null)
    setGroupNote(false)
    setReflectPick(null)
  }

  // ---------- stage: table (get familiar with the raw data first) ----------
  if (stage === 'table') {
    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">
            Before grouping anything, let's get familiar with the raw data. Each row below is one point, described
            by two numbers.
          </p>
          <p className="note">
            <b>x</b> and <b>y</b> are just its coordinates, the same way you'd plot a point on graph paper.
          </p>
          <div className="stageActions">
            <button className="btnP" onClick={() => setStage('group')}>
              Now plot these on a graph
            </button>
          </div>
        </div>
        <div className="kmeans-main">
          <table className="exampleTable">
            <thead>
              <tr>
                <th>Point</th>
                <th>x</th>
                <th>y</th>
              </tr>
            </thead>
            <tbody>
              {POINTS.map((p, i) => (
                <tr key={i}>
                  <td>#{i + 1}</td>
                  <td>{p[0]}</td>
                  <td>{p[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---------- stage: group (choose K) ----------
  if (stage === 'group') {
    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">
            You just saw this as a table of numbers. Here it is plotted as a graph instead, 16 points, no groups
            yet. How would you group them?
          </p>
          <p className="note">Pick how many groups feels natural to you.</p>
          <div className="choiceRow">
            <button className={`guessBtn${k === 2 ? ' active' : ''}`} onClick={() => pickK(2)}>
              2 groups
            </button>
            <button className={`guessBtn${k === 3 ? ' active' : ''}`} onClick={() => pickK(3)}>
              3 groups
            </button>
          </div>
          {groupNote && (
            <div className="stageActions">
              <button className="btnP" onClick={startCentres}>
                Continue
              </button>
            </div>
          )}
        </div>
        <div className="kmeans-main">
          <div className="chartRow">
            <span className="chartTitle">16 points, no groups yet</span>
          </div>
          <ChartFrame>
            <PointDots assign={POINTS.map(() => null)} />
          </ChartFrame>
          {groupNote && (
            <div className="annotation">
              {k === 2
                ? 'Two groups looks like a fair call here, there does seem to be a cluster bottom-left and one top-right.'
                : "Three groups is more than the two clusters that stand out visually. Let's see what K-Means does with that extra one."}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- stage: centres ----------
  if (stage === 'centres') {
    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">
            What you're setting up is called <b>K-Means Clustering</b>. Before it can assign anything, it needs some
            starting centres.
          </p>
          <p className="note">
            {k === 2
              ? 'Both starting centres here are placed close together on purpose, instead of one near each group.'
              : 'Two of the three starting centres are placed inside the same bottom-left group on purpose.'}
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={startOver}>
              Back
            </button>
            <button className="btnP" onClick={() => setStage('distance')}>
              Continue
            </button>
          </div>
        </div>
        <div className="kmeans-main">
          <div className="chartRow">
            <span className="chartTitle">{`${POINTS.length} points, ${k} starting centres`}</span>
          </div>
          <ChartFrame>
            <PointDots assign={POINTS.map(() => null)} />
            <CentroidMarks centroids={sim.centroids} />
          </ChartFrame>
          <div className="annotation">
            Where a centre starts can matter. Watch what happens once assignment begins.
          </div>
        </div>
      </div>
    )
  }

  // ---------- stage: distance (formal assignment rule, worked example) ----------
  if (stage === 'distance') {
    const p0 = POINTS[0]
    const dists = sim.centroids.map((c) => dist(p0, c))
    const nearest = dists.indexOf(Math.min(...dists))

    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">How does K-Means actually decide which centre a point joins? With distance.</p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('centres')}>
              Back
            </button>
            <button className="btnP" onClick={beginStepping}>
              Start assigning points
            </button>
          </div>
        </div>
        <div className="kmeans-main">
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Euclidean distance</p>
            <span className="formula">
              d(p, c) = √((x<sub>p</sub> − x<sub>c</sub>)² + (y<sub>p</sub> − y<sub>c</sub>)²)
            </span>
            <p>Just the straight-line distance between two points, nothing fancier.</p>
          </div>
          <div className="formalBox">
            <p className="formalLabel">Worked example</p>
            <p className="formalTerm">
              Point ({p0[0]}, {p0[1]})
            </p>
            {sim.centroids.map((c, i) => (
              <p key={i}>
                Distance to {COLOR_NAMES[i]} centre ({c[0].toFixed(1)}, {c[1].toFixed(1)}): d = √(
                {(p0[0] - c[0]).toFixed(1)}² + {(p0[1] - c[1]).toFixed(1)}²) = <b>{dists[i].toFixed(2)}</b>
              </p>
            ))}
            <p>
              The smallest distance is to <b>{COLOR_NAMES[nearest]}</b>, so this point will join the{' '}
              {COLOR_NAMES[nearest]} cluster. That's the whole assignment rule: every point joins whichever centre it
              is nearest to.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------- stage: stepping (main simulation) ----------
  return (
    <div className="kmeans">
      <div className="kmeans-controls">
        <p className="note">Dataset: preset, fixed for this prototype.</p>
        {!awaitingGuess ? (
          <div className="btnCol">
            <button className="btnP" onClick={handleStepClick} disabled={sim.converged || running}>
              Step forward
            </button>
            <button className="btnG" onClick={handleRun} disabled={sim.converged || running}>
              {running ? 'Running…' : 'Run to convergence'}
            </button>
            <button className="btnG" onClick={handleReset}>
              Reset to step 0
            </button>
          </div>
        ) : (
          <div className="btnCol">
            <p className="note" style={{ margin: '0 0 2px' }}>
              Which centre do you think the ringed point will join?
            </p>
            {sim.centroids.map((_, i) => (
              <button key={i} className="guessBtn" onClick={() => handleGuess(i)}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: COLORS[i],
                    marginRight: 7,
                  }}
                />
                {COLOR_NAMES[i]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="kmeans-main">
        <div className="chartRow">
          <span className="chartTitle">{`${POINTS.length} points, ${k} clusters`}</span>
          <div className="readouts">
            <span>
              Iteration <b>{sim.iter}</b>
            </span>
          </div>
        </div>

        <ChartFrame>
          <PointDots assign={sim.assign} highlightIdx={awaitingGuess ? focusIdx : null} />
          <CentroidMarks centroids={sim.centroids} />
        </ChartFrame>

        {annotation && (
          <div
            className={`annotation${annotation.kind ? ` ${annotation.kind}` : ''}`}
            dangerouslySetInnerHTML={{ __html: annotation.html }}
          />
        )}

        {sim.converged && (
          <div className="reflectBox">
            <p className="sectionLabel">What just happened</p>
            <ol className="termList">
              <li>Started with {POINTS.length} points and no groups</li>
              <li>
                Chose K = {k}
              </li>
              <li>Placed {k} starting centres</li>
              <li>Assigned every point to its nearest centre</li>
              <li>Moved each centre to the average of its own points</li>
              <li>Repeated assign and update until nothing changed</li>
            </ol>
            <div className="formalBox">
              <p className="formalLabel">Formal definition</p>
              <p className="formalTerm">Centroid update</p>
              <span className="formula">
                c<sub>k</sub> = (1 / |C<sub>k</sub>|) × Σ<sub>x∈C<sub>k</sub></sub> x
              </span>
              <p>
                The new centre is just the average (mean) position of every point currently in that group, exactly
                what you watched happen each iteration above.
              </p>
            </div>
            <div className="formalBox">
              <p className="formalLabel">Formal definition</p>
              <p className="formalTerm">Objective of K-Means</p>
              <p>
                K-Means tries to minimise the total squared distance from every point to its own cluster's centre.
                Smaller total distance means tighter, more compact clusters. Assign, then update, then repeat, is
                exactly how it searches for that minimum.
              </p>
            </div>
            <p className="sectionLabel">Quick check-in</p>
            <div className="choiceRow">
              <button className="guessBtn" onClick={() => setReflectPick('good')}>
                This is making sense
              </button>
              <button className="guessBtn" onClick={startOver}>
                Try a different K
              </button>
              <button className="guessBtn" onClick={() => setReflectPick('confused')}>
                Still a bit confusing
              </button>
            </div>
            {reflectPick === 'good' && <p className="note">Good. Try the quiz below whenever you are ready.</p>}
            {reflectPick === 'confused' && (
              <p className="note">
                Reset to step 0 and go one step at a time, guessing each point's cluster before it is revealed. That
                usually makes the assignment rule click.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default KMeans
