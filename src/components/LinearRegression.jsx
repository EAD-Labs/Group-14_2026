import { useEffect, useState } from 'react'
import './LinearRegression.css'

const X = [1, 2, 3, 4, 5, 6, 6.5, 7, 8, 9]
const Y = [2.1, 2.9, 4.2, 4.8, 6.1, 6.9, 7.3, 7.8, 8.6, 9.4]
const N = X.length

const NEW_AREA = 9.5
const GUESS_OPTIONS = [
  { key: 'low', label: '₹5 lakh or so' },
  { key: 'mid', label: '₹10 lakh or so' },
  { key: 'high', label: '₹14 lakh or so' },
]
const GUESS_FEEDBACK = {
  low: 'That is on the lower side. Notice how steadily the prices have been climbing as area goes up, want to nudge your guess higher?',
  mid: 'That keeps pace with how the other prices have been climbing. A reasonable guess, going purely by the pattern.',
  high: 'That is a big jump for just a little more area. Look at how gradually prices have been rising so far, maybe reconsider?',
}

const OBSERVE_OPTIONS = [
  'Price generally goes up as area goes up',
  'Price generally goes down as area goes up',
  'No relationship, the prices look random',
]
const OBSERVE_CORRECT = 0

function mse(m, b) {
  let s = 0
  for (let i = 0; i < N; i++) {
    const e = m * X[i] + b - Y[i]
    s += e * e
  }
  return s / N
}

// Ordinary Least Squares, the closed-form solution (no trial and error).
function computeOLS(xs, ys) {
  const n = xs.length
  const xbar = xs.reduce((a, x) => a + x, 0) / n
  const ybar = ys.reduce((a, y) => a + y, 0) / n
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - xbar) * (ys[i] - ybar)
    sxx += (xs[i] - xbar) ** 2
  }
  const b1 = sxy / sxx
  const b0 = ybar - b1 * xbar
  return { xbar, ybar, sxy, sxx, b1, b0 }
}

const OLS = computeOLS(X, Y)
const OLS_MSE = mse(OLS.b1, OLS.b0)

const DERIVATION_STEPS = [
  {
    label: 'Write the error as a function of b₀ and b₁',
    formula: 'MSE(b₀, b₁) = (1/n) × Σ (yᵢ − b₀ − b₁xᵢ)²',
    text: "This is the same MSE from before, just written out fully so b₀ and b₁ appear in it directly. We want to find the exact b₀ and b₁ that make this as small as possible.",
    connect: 'This is the exact same error number you were watching drop in the playground a moment ago.',
  },
  {
    label: 'Use calculus: the minimum has zero slope',
    formula: '∂MSE/∂b₀ = 0    and    ∂MSE/∂b₁ = 0',
    text: 'At the bottom of a bowl-shaped curve, the slope is flat. MSE behaves like a bowl in terms of b₀ and b₁, so its lowest point is exactly where both partial derivatives are zero.',
    connect: 'This is exactly what you were chasing in the playground: nudging sliders until both tiny curves went flat (green) at once.',
  },
  {
    label: 'Differentiate with respect to b₀',
    formula: '−(2/n) × Σ (yᵢ − b₀ − b₁xᵢ) = 0   ⟹   b₀ = ȳ − b₁x̄',
    text: 'Simplify and rearrange. In words: the average residual must be zero, which means the line has to pass through the point (x̄, ȳ), the "average" point of the whole dataset.',
    connect: 'For our flats, this means the perfect line must pass exactly through the average flat: average area, average price.',
  },
  {
    label: 'Differentiate with respect to b₁',
    formula: '−(2/n) × Σ xᵢ(yᵢ − b₀ − b₁xᵢ) = 0   ⟹   Σxᵢyᵢ = b₀Σxᵢ + b₁Σxᵢ²',
    text: 'A second equation, in the same two unknowns b₀ and b₁. Two equations, two unknowns, so they can now be solved together.',
    connect: 'This gives a second condition tying b₀ and b₁ together, using the actual areas and prices of our 10 flats.',
  },
  {
    label: 'Solve the two equations together',
    formula: 'b₁ = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²',
    text: 'Substituting the b₀ equation into the second one and simplifying gives this formula for b₁, computed directly from the data. Once b₁ is known, b₀ = ȳ − b₁x̄ falls right out.',
    connect: 'Plug in the real areas and prices of our 10 flats here, and out comes one exact number for b₁, no guessing needed.',
  },
]

// Curve of MSE against b1, holding b0 fixed — for the interactive playground.
function sampleB1Curve(b0) {
  const pts = []
  for (let b1 = -0.5; b1 <= 3; b1 += 0.1) {
    pts.push({ x: b1, y: mse(b1, b0) })
  }
  return pts
}

// Curve of MSE against b0, holding b1 fixed — for the interactive playground.
function sampleB0Curve(b1) {
  const pts = []
  for (let b0 = -2; b0 <= 8; b0 += 0.2) {
    pts.push({ x: b0, y: mse(b1, b0) })
  }
  return pts
}

function slopeAt(fn, x, h = 0.01) {
  return (fn(x + h) - fn(x - h)) / (2 * h)
}

function makeScale(xMin, xMax, yMin, yMax, padL, padR, padT, padB, W, H) {
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  return {
    px: (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW,
    py: (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH,
  }
}

const SCALE = makeScale(0, 10, 0, 11, 48, 16, 14, 36, 560, 340)

function ChartFrame({ children }) {
  return (
    <svg viewBox="0 0 560 340" role="img" aria-label="Area vs price chart">
      <line x1={SCALE.px(0)} y1={SCALE.py(0)} x2={SCALE.px(0)} y2={SCALE.py(11)} stroke="#C9C1A8" />
      <line x1={SCALE.px(0)} y1={SCALE.py(0)} x2={SCALE.px(10)} y2={SCALE.py(0)} stroke="#C9C1A8" />
      <text className="axLbl" x={SCALE.px(5)} y="332" textAnchor="middle">
        Area (100 sq ft)
      </text>
      <text
        className="axLbl"
        x="14"
        y={SCALE.py(5.5)}
        textAnchor="middle"
        transform={`rotate(-90 14 ${SCALE.py(5.5)})`}
      >
        Price (₹ lakh)
      </text>
      {children}
    </svg>
  )
}

function Points() {
  return X.map((x, i) => <circle key={`point-${i}`} cx={SCALE.px(x)} cy={SCALE.py(Y[i])} r="4" fill="var(--ink)" />)
}

function Residuals({ m, b }) {
  return X.map((x, i) => {
    const predicted = m * x + b
    return (
      <line
        key={`residual-${i}`}
        x1={SCALE.px(x)}
        y1={SCALE.py(Y[i])}
        x2={SCALE.px(x)}
        y2={SCALE.py(predicted)}
        stroke="var(--rust)"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.55"
      />
    )
  })
}

function FitLine({ m, b }) {
  return (
    <line
      x1={SCALE.px(0)}
      y1={SCALE.py(b)}
      x2={SCALE.px(10)}
      y2={SCALE.py(m * 10 + b)}
      stroke="var(--blue)"
      strokeWidth="2.5"
    />
  )
}

function TinyCurve({ data, currentX, currentY, slope, label }) {
  const W = 240
  const H = 128
  const padL = 10
  const padR = 10
  const padT = 10
  const padB = 10
  const xs = data.map((d) => d.x)
  const ys = data.map((d) => d.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const px = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW
  const py = (y) => padT + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(d.x).toFixed(1)} ${py(d.y).toFixed(1)}`).join(' ')

  const cx = px(currentX)
  const cy = py(currentY)
  const flat = Math.abs(slope) < 0.15
  const dotColor = flat ? 'var(--good)' : 'var(--rust)'

  // Tangent segment: convert the true-units slope into screen-space slope, since the
  // vertical axis is flipped and the two axes are scaled differently in pixels.
  const scaleX = plotW / (xMax - xMin)
  const scaleY = plotH / (yMax - yMin || 1)
  const screenSlope = -slope * (scaleY / scaleX)
  const tanLen = 26
  const segDx = tanLen / Math.sqrt(1 + screenSlope * screenSlope)
  const segDy = screenSlope * segDx

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tinyCurve" role="img" aria-label={label}>
      <path d={path} fill="none" stroke="var(--blue)" strokeWidth="2" />
      <line x1={cx - segDx} y1={cy - segDy} x2={cx + segDx} y2={cy + segDy} stroke={dotColor} strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="4.5" fill={dotColor} />
    </svg>
  )
}

function NewFlatMarker() {
  if (NEW_AREA > 10) return null
  return (
    <line
      x1={SCALE.px(NEW_AREA)}
      y1={SCALE.py(0)}
      x2={SCALE.px(NEW_AREA)}
      y2={SCALE.py(11)}
      stroke="var(--rust)"
      strokeWidth="1.5"
      strokeDasharray="4 3"
    />
  )
}

function LinearRegression({ onStepsChange } = {}) {
  const [stage, setStage] = useState('context')

  // discovery-stage state
  const [guessPick, setGuessPick] = useState(null)
  const [observePick, setObservePick] = useState(null)
  const [manualM, setManualM] = useState(0.4)
  const [manualB, setManualB] = useState(2)
  const [manualBest, setManualBest] = useState(Infinity)
  const [reflectPick, setReflectPick] = useState(null)

  // derivation-stage state
  const [deriveStep, setDeriveStep] = useState(0)
  const [stepsSeen, setStepsSeen] = useState(0)

  useEffect(() => {
    onStepsChange?.(stepsSeen)
  }, [stepsSeen, onStepsChange])

  const manualMse = mse(manualM, manualB)
  useEffect(() => {
    if (manualMse < manualBest) setManualBest(manualMse)
  }, [manualMse, manualBest])

  function goToStage(next) {
    setStepsSeen((s) => s + 1)
    setStage(next)
  }

  // ---------- discovery stages ----------

  if (stage === 'context') {
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            A friend is about to sell a flat and wants some idea of a <b>fair price</b> before listing it. They do
            not know the price yet, only the area.
          </p>
          <p className="storyText">
            They do have a few recent sales nearby though: the area of each flat, and what it actually sold for.
          </p>
          <div className="stageActions">
            <button className="btnP" onClick={() => goToStage('table')}>
              Show me the recent sales
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="termCallout" style={{ opacity: 0.6 }}>
            Data coming up next
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'table') {
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            Before jumping into any graph, let's get comfortable with the numbers themselves. Each row below is one
            flat that got sold recently.
          </p>
          <p className="storyText">
            The first column is its <b>area</b> (in hundreds of sq ft), the second is the <b>price</b> it actually
            sold for (in ₹ lakh).
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('context')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('observe')}>
              Now plot these on a graph
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <table className="exampleTable">
            <thead>
              <tr>
                <th>Area (100 sq ft)</th>
                <th>Price (₹ lakh)</th>
              </tr>
            </thead>
            <tbody>
              {X.map((x, i) => (
                <tr key={x}>
                  <td>{x}</td>
                  <td>{Y[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (stage === 'observe') {
    const answered = observePick !== null
    const correct = observePick === OBSERVE_CORRECT
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            You just saw this as a table. Let's plot the exact same 10 listings on a graph, it makes the pattern far
            easier to see.
          </p>
          <p className="storyText">As area increases, what happens to price in this data?</p>
          <div className="choiceRow" style={{ flexDirection: 'column' }}>
            {OBSERVE_OPTIONS.map((opt, i) => (
              <button
                key={opt}
                className="guessBtn"
                disabled={answered}
                onClick={() => setObservePick(i)}
                style={{ opacity: answered && i !== observePick ? 0.6 : 1 }}
              >
                {opt}
              </button>
            ))}
          </div>
          {answered && (
            <div className="stageActions">
              <button className="btnG" onClick={() => setObservePick(null)}>
                Back
              </button>
              <button className="btnP" onClick={() => goToStage('predict')}>
                Continue
              </button>
            </div>
          )}
        </div>
        <div className="linreg-main">
          <div className="chartRow">
            <span className="chartTitle">Area vs. price, 10 sampled listings</span>
          </div>
          <ChartFrame>
            <Points />
          </ChartFrame>
          {answered && (
            <div className={`annotation ${correct ? 'fbGood' : 'fbBad'}`}>
              <span className="tag">{correct ? 'Right' : 'Have another look'}</span>
              {correct
                ? 'As area goes up, price climbs along with it. That upward pattern is exactly what we are going to use to predict new prices.'
                : "Look again at the points from left to right. As you move right (bigger area), the points sit higher up (bigger price) too. That climbing pattern is what we'll use to predict."}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (stage === 'predict') {
    const answered = guessPick !== null
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            A new flat, {NEW_AREA} (hundred sq ft), is about to be listed. Going purely by the pattern in the chart,
            what price would you expect?
          </p>
          <div className="choiceRow" style={{ flexDirection: 'column' }}>
            {GUESS_OPTIONS.map((g) => (
              <button
                key={g.key}
                className="guessBtn"
                disabled={answered}
                onClick={() => setGuessPick(g.key)}
                style={{ opacity: answered && g.key !== guessPick ? 0.6 : 1 }}
              >
                {g.label}
              </button>
            ))}
          </div>
          {answered && (
            <div className="stageActions">
              <button className="btnG" onClick={() => setGuessPick(null)}>
                Back
              </button>
              <button className="btnP" onClick={() => goToStage('trend')}>
                Continue to find the trend
              </button>
            </div>
          )}
        </div>
        <div className="linreg-main">
          <div className="chartRow">
            <span className="chartTitle">Area vs. price, 10 sampled listings</span>
          </div>
          <ChartFrame>
            <Points />
            <NewFlatMarker />
          </ChartFrame>
          {answered && <div className="annotation">{GUESS_FEEDBACK[guessPick]}</div>}
        </div>
      </div>
    )
  }

  if (stage === 'trend') {
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">Can you draw a line that roughly follows the pattern of points?</p>
          <div className="field">
            <label htmlFor="manM">
              Steepness: <span className="value">{manualM.toFixed(2)}</span>
            </label>
            <input
              id="manM"
              type="range"
              min="-0.5"
              max="3"
              step="0.05"
              value={manualM}
              onChange={(e) => setManualM(parseFloat(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="manB">
              Vertical position: <span className="value">{manualB.toFixed(1)}</span>
            </label>
            <input
              id="manB"
              type="range"
              min="-2"
              max="8"
              step="0.1"
              value={manualB}
              onChange={(e) => setManualB(parseFloat(e.target.value))}
            />
          </div>
          <p className="note">
            Drag steepness until the line follows the points, then use vertical position to nudge it up or down.
            Watch the error, lower is better.
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('predict')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('concept')}>
              Continue
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="chartRow">
            <span className="chartTitle">Area vs. price, 10 sampled listings</span>
            <div className="readouts">
              <span>
                Error (MSE) <b className={`mseVal${manualMse <= manualBest ? ' improving' : ''}`}>{manualMse.toFixed(3)}</b>
              </span>
            </div>
          </div>
          <ChartFrame>
            <Residuals m={manualM} b={manualB} />
            <FitLine m={manualM} b={manualB} />
            <Points />
          </ChartFrame>
          <div className="annotation">
            The dashed lines are the gap between each real price and your line's prediction. That gap is the error
            for that point.
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'concept') {
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">You just did the basic move behind a well known technique.</p>
          <p className="note">
            Fitting a line by hand works, but it is slow, and there is no guarantee you found the best possible
            line. Next, let's actually work out the formula that finds it exactly.
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('trend')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('math')}>
              Continue
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="termCallout">Linear Regression</div>
          <ul className="termList">
            <li>
              <b>Input (x):</b> area of the flat, what you already know
            </li>
            <li>
              <b>Output (y):</b> price, what you are trying to predict
            </li>
            <li>
              <b>Regression line:</b> the line you were just adjusting
            </li>
            <li>
              <b>Slope:</b> what you called steepness, how fast price rises per unit of area
            </li>
            <li>
              <b>Intercept:</b> what you called vertical position, where the line sits when area is 0
            </li>
          </ul>
          <div className="eqBox">
            ŷ = b<sub>0</sub> + b<sub>1</sub>x
          </div>
          <p className="note">
            b<sub>1</sub> is the slope you dragged, b<sub>0</sub> is the intercept you dragged. ŷ is just the price
            the line predicts for a given area x.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'math') {
    const worked_x = X[4]
    const worked_y = Y[4]
    const worked_yhat = manualM * worked_x + manualB
    const worked_e = worked_y - worked_yhat

    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            Let's put a number on how good your line actually is, using the exact line you just dragged.
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('concept')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('playground')}>
              Try to beat your own error
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Residual (prediction error)</p>
            <p>For any point, the residual is the actual value minus what the line predicts: e = y − ŷ.</p>
            <p>
              Take the flat at x = {worked_x} (that's {worked_x}00 sq ft), actual price y = {worked_y}. Your line
              predicts ŷ = {manualM.toFixed(2)} × {worked_x} + {manualB.toFixed(1)} = {worked_yhat.toFixed(2)}. So its
              residual is e = {worked_y} − {worked_yhat.toFixed(2)} = {worked_e.toFixed(2)}.
            </p>
          </div>
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Mean Squared Error (MSE)</p>
            <span className="formula">
              MSE = (1/n) × Σ (y<sub>i</sub> − ŷ<sub>i</sub>)²
            </span>
            <p>
              Square every residual first (so a gap above the line and a gap below the line both count, and big
              gaps are punished more than small ones), then average across all n points.
            </p>
            <p>
              Right now, across all 10 listings, your line's MSE works out to <b>{manualMse.toFixed(3)}</b>.
            </p>
          </div>
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Objective of Linear Regression</p>
            <p>
              Find the b₀ and b₁ that make MSE as small as possible. Searching for that minimum is called{' '}
              <b>optimisation</b>. Instead of dragging sliders and hoping, this exact minimum can be worked out with
              a bit of calculus.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'playground') {
    const b1Curve = sampleB1Curve(manualB)
    const b0Curve = sampleB0Curve(manualM)
    const slopeB1 = slopeAt((b1) => mse(b1, manualB), manualM)
    const slopeB0 = slopeAt((b0) => mse(manualM, b0), manualB)
    const ratio = manualMse / OLS_MSE
    let warmth
    if (ratio <= 1.05) warmth = { label: '🔥 Nailed it', cls: 'fbGood' }
    else if (ratio <= 1.3) warmth = { label: 'Hot', cls: 'fbGood' }
    else if (ratio <= 2) warmth = { label: 'Warmer', cls: '' }
    else warmth = { label: 'Cold', cls: 'fbBad' }

    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            Your turn to play. Push the error as low as you possibly can by dragging both sliders. Watch the two
            little curves on the right, when the dot sits at the very bottom of <b>both</b> of them at once, you
            cannot do any better.
          </p>
          <div className="field">
            <label htmlFor="pgM">
              Slope, b<sub>1</sub>: <span className="value">{manualM.toFixed(2)}</span>
            </label>
            <input
              id="pgM"
              type="range"
              min="-0.5"
              max="3"
              step="0.02"
              value={manualM}
              onChange={(e) => setManualM(parseFloat(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pgB">
              Intercept, b<sub>0</sub>: <span className="value">{manualB.toFixed(2)}</span>
            </label>
            <input
              id="pgB"
              type="range"
              min="-2"
              max="8"
              step="0.05"
              value={manualB}
              onChange={(e) => setManualB(parseFloat(e.target.value))}
            />
          </div>
          <div className={`annotation ${warmth.cls}`}>
            <span className="tag">{warmth.label}</span>
            Current error (MSE): <b>{manualMse.toFixed(3)}</b>
          </div>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('math')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('derive')}>
              Show me the shortcut formula
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="chartRow">
            <span className="chartTitle">Real flats, real error, your line</span>
          </div>
          <ChartFrame>
            <Residuals m={manualM} b={manualB} />
            <FitLine m={manualM} b={manualB} />
            <Points />
          </ChartFrame>

          <div className="playgroundGrid">
            <div>
              <p className="tinyChartLabel">Error vs slope, intercept held fixed</p>
              <TinyCurve data={b1Curve} currentX={manualM} currentY={manualMse} slope={slopeB1} label="MSE against slope" />
            </div>
            <div>
              <p className="tinyChartLabel">Error vs intercept, slope held fixed</p>
              <TinyCurve data={b0Curve} currentX={manualB} currentY={manualMse} slope={slopeB0} label="MSE against intercept" />
            </div>
          </div>
          <p className="note">
            Green means the curve is flat right where you are standing, that direction cannot be improved further.
            Red means it still slopes, nudge the slider the way that sends the dot downhill.
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'derive') {
    const step = DERIVATION_STEPS[deriveStep]
    const isLast = deriveStep === DERIVATION_STEPS.length - 1

    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">Here's how the best b₀ and b₁ are actually worked out, step by step.</p>
          <div className="stepDots">
            {DERIVATION_STEPS.map((_, i) => (
              <span
                key={i}
                className={`stepDot${i === deriveStep ? ' active' : ''}${i < deriveStep ? ' done' : ''}`}
              />
            ))}
          </div>
          <p className="note">
            Step {deriveStep + 1} of {DERIVATION_STEPS.length}
          </p>
          <div className="stageActions">
            <button
              className="btnG"
              onClick={() => (deriveStep === 0 ? setStage('playground') : setDeriveStep((s) => s - 1))}
            >
              Back
            </button>
            {!isLast ? (
              <button className="btnP" onClick={() => setDeriveStep((s) => s + 1)}>
                Next
              </button>
            ) : (
              <button className="btnP" onClick={() => goToStage('reveal')}>
                What is this formula called?
              </button>
            )}
          </div>
        </div>
        <div className="linreg-main">
          <div className="formalBox">
            <p className="formalLabel">{`Step ${deriveStep + 1}`}</p>
            <p className="formalTerm">{step.label}</p>
            <span className="formula">{step.formula}</span>
            <p>{step.text}</p>
            {step.connect && <p className="connectNote">{step.connect}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'reveal') {
    return (
      <div className="linreg">
        <div className="linreg-controls">
          <p className="storyText">
            No trial and error, no guessing which direction to nudge the line. This formula jumps straight to the
            best line in one shot.
          </p>
          <div className="stageActions">
            <button className="btnG" onClick={() => setStage('derive')}>
              Back
            </button>
            <button className="btnP" onClick={() => goToStage('bestfit')}>
              See it computed on our data
            </button>
          </div>
        </div>
        <div className="linreg-main">
          <div className="termCallout">Ordinary Least Squares</div>
          <div className="formalBox">
            <p className="formalLabel">Formal definition</p>
            <p className="formalTerm">Ordinary Least Squares (OLS)</p>
            <span className="formula">
              b<sub>1</sub> = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)², &nbsp; b<sub>0</sub> = ȳ − b<sub>1</sub>x̄
            </span>
            <p>
              Also called the <b>Normal Equation</b>. This closed-form solution is exactly what most statistics and
              machine learning libraries use under the hood when you call something like "fit a linear regression".
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------- stage: bestfit (OLS computed on the real dataset) ----------
  const olsMse = OLS_MSE
  return (
    <div className="linreg">
      <div className="linreg-controls">
        <p className="storyText">Let's plug in the real numbers from all 10 listings.</p>
        <div className="stageActions">
          <button className="btnG" onClick={() => setStage('reveal')}>
            Back
          </button>
        </div>
      </div>
      <div className="linreg-main">
        <div className="formalBox">
          <p className="formalLabel">Worked example</p>
          <p className="formalTerm">Computing b₁ and b₀ from the data</p>
          <p>
            x̄ = {OLS.xbar.toFixed(2)}, ȳ = {OLS.ybar.toFixed(2)}
          </p>
          <p>
            Σ(xᵢ − x̄)(yᵢ − ȳ) = {OLS.sxy.toFixed(2)}, &nbsp; Σ(xᵢ − x̄)² = {OLS.sxx.toFixed(2)}
          </p>
          <p>
            b<sub>1</sub> = {OLS.sxy.toFixed(2)} / {OLS.sxx.toFixed(2)} = <b>{OLS.b1.toFixed(3)}</b>
          </p>
          <p>
            b<sub>0</sub> = {OLS.ybar.toFixed(2)} − {OLS.b1.toFixed(3)} × {OLS.xbar.toFixed(2)} = <b>{OLS.b0.toFixed(3)}</b>
          </p>
          <div className="eqBox">
            ŷ = {OLS.b0.toFixed(2)} + {OLS.b1.toFixed(2)}x
          </div>
        </div>

        <div className="chartRow">
          <span className="chartTitle">Area vs. price, 10 sampled listings</span>
          <div className="readouts">
            <span>
              Error (MSE) <b className="mseVal improving">{olsMse.toFixed(3)}</b>
            </span>
          </div>
        </div>
        <ChartFrame>
          <Residuals m={OLS.b1} b={OLS.b0} />
          <FitLine m={OLS.b1} b={OLS.b0} />
          <Points />
        </ChartFrame>
        <div className="annotation fbGood">
          <span className="tag">Best possible fit</span>
          Remember your hand-fitted line from earlier? It had an MSE of {manualBest.toFixed(3)}. This formula-computed
          line has an MSE of {olsMse.toFixed(3)}, the lowest MSE any straight line can achieve for this data, worked
          out exactly rather than guessed.
        </div>

        <div className="reflectBox">
          <p className="sectionLabel">Quick check-in</p>
          <div className="choiceRow">
            <button className="guessBtn" onClick={() => setReflectPick('good')}>
              This is making sense
            </button>
            <button
              className="guessBtn"
              onClick={() => {
                setReflectPick('again')
                setDeriveStep(0)
                setStage('derive')
              }}
            >
              Show the derivation again
            </button>
            <button className="guessBtn" onClick={() => setReflectPick('confused')}>
              Still a bit confusing
            </button>
          </div>
          {reflectPick === 'good' && <p className="note">Good. Try the quiz below whenever you are ready.</p>}
          {reflectPick === 'confused' && (
            <p className="note">
              Go back through the derivation one step at a time. Each step only does one thing: step 1 writes down
              what we're minimising, step 2 says a minimum has zero slope, steps 3 and 4 take that slope in each
              direction, and step 5 just solves the two resulting equations.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LinearRegression
