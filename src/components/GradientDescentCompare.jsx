import { useEffect, useMemo, useRef, useState } from 'react'
import {
  H,
  LR_MAX,
  LR_MIN,
  LR_STEP,
  PAD,
  W,
  advance,
  cellH,
  cellW,
  fmtErr,
  initState,
  outsideChart,
  plotH,
  plotW,
  starPoints,
} from './GradientDescent.jsx'

// Learning-rate race: three descents with different learning rates on the same error surface.
// Note: nothing imported above is used at module level, only inside functions (the two files import each other).

const COMPARE_STEPS = 20
const TICK_MS = 450
const DEFAULT_RATES = [0.05, 0.3, 1.1]
// Validated categorical palette (lightness, chroma, colour-blind separation, contrast on the paper surface).
const SERIES = [
  { color: '#c2410c', dash: 'none', name: 'A' },
  { color: '#6d28d9', dash: '7 4', name: 'B' },
  { color: '#0d9488', dash: '2 3', name: 'C' },
]
const DIVERGE_FACTOR = 50

function runDescent(d, lr) {
  let s = initState(d)
  let convergedAt = null
  let diverged = false
  for (let i = 0; i < COMPARE_STEPS; i++) {
    s = advance(d, s, lr)
    if (s.converged) {
      convergedAt = s.step
      break
    }
    const err = s.errs[s.errs.length - 1]
    if (!Number.isFinite(err) || err > DIVERGE_FACTOR * d.startErr) {
      diverged = true
      break
    }
  }
  return { lr, path: s.path, errs: s.errs, convergedAt, diverged }
}

function outcomeText(run) {
  const last = run.errs[run.errs.length - 1]
  if (run.convergedAt !== null) return `reached the minimum in ${run.convergedAt} steps`
  if (run.diverged) return `diverged: the error grew to ${fmtErr(last)} after ${run.errs.length - 1} steps`
  return `still ${fmtErr(last)} after ${COMPARE_STEPS} steps, not at the minimum yet`
}

// Earliest to converge wins; if none converged, nobody wins.
function winnerOf(runs) {
  const conv = runs.map((r, i) => ({ i, at: r.convergedAt })).filter((x) => x.at !== null)
  if (!conv.length) return 'none'
  conv.sort((a, b) => a.at - b.at)
  return conv[0].i
}

function CompareSurface({ d, runs, upto }) {
  const { px, py, B1_MIN, B1_MAX, B0_MIN, B0_MAX } = d
  const clampB1 = (v) => Math.min(B1_MAX, Math.max(B1_MIN, v))
  const clampB0 = (v) => Math.min(B0_MAX, Math.max(B0_MIN, v))
  const edge = ([b1, b0]) => [px(clampB1(b1)), py(clampB0(b0))]
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Error surface for the ${d.name} data with ${runs.length} descent paths, one per learning rate`}
    >
      {d.heat.map((c) => (
        <rect key={c.key} x={c.x.toFixed(1)} y={c.y.toFixed(1)} width={(cellW + 0.6).toFixed(1)} height={(cellH + 0.6).toFixed(1)} fill={c.fill} />
      ))}
      <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MAX)} y2={py(B0_MIN)} stroke="var(--ink)" opacity="0.4" />
      <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MIN)} y2={py(B0_MAX)} stroke="var(--ink)" opacity="0.4" />
      <text className="axLbl" x={PAD.l + plotW / 2} y="396" textAnchor="middle">
        Slope (b₁)
      </text>
      <text className="axLbl" x="16" y={PAD.t + plotH / 2} textAnchor="middle" transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}>
        Intercept (b₀)
      </text>
      <polygon points={starPoints(px(d.olsB1), py(d.olsB0))} fill="#D9B44A" stroke="var(--ink)" strokeWidth="0.5" />
      <circle cx={px(d.startB1)} cy={py(d.startB0)} r="6" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      {runs.map((run, ri) => {
        const shown = run.path.slice(0, Math.min(upto, run.path.length - 1) + 1)
        const pts = shown.map((p) => edge(p).map((v) => v.toFixed(1)).join(',')).join(' ')
        const [hx, hy] = edge(shown[shown.length - 1])
        const off = outsideChart(d, ...shown[shown.length - 1])
        const s = SERIES[ri]
        return (
          <g key={ri}>
            {/* surface-coloured halo keeps each path readable on dark cells */}
            <polyline points={pts} fill="none" stroke="#fcfaf4" strokeWidth="5" strokeLinejoin="round" opacity="0.9" />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} strokeLinejoin="round" />
            <circle cx={hx} cy={hy} r="7" fill={s.color} stroke="#fcfaf4" strokeWidth="2" />
            <text x={hx} y={hy + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
              {off ? '!' : s.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const EC = { W: 560, H: 220, l: 52, r: 70, t: 14, b: 34 }

function ErrorChart({ d, runs, upto, hoverStep, onHover }) {
  const pw = EC.W - EC.l - EC.r
  const ph = EC.H - EC.t - EC.b
  const yMax = d.startErr * 1.5
  const x = (step) => EC.l + (step / COMPARE_STEPS) * pw
  const y = (err) => EC.t + ph - (Math.min(err, yMax) / yMax) * ph
  return (
    <svg
      viewBox={`0 0 ${EC.W} ${EC.H}`}
      role="img"
      aria-label="Error after each step for each learning rate"
      onMouseLeave={() => onHover(null)}
    >
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={EC.l} x2={EC.l + pw} y1={y(t * yMax)} y2={y(t * yMax)} stroke="var(--line)" />
          <text className="axLbl" x={EC.l - 6} y={y(t * yMax) + 3} textAnchor="end">
            {fmtErr(t * yMax)}
          </text>
        </g>
      ))}
      {[0, 5, 10, 15, 20].map((st) => (
        <text key={st} className="axLbl" x={x(st)} y={EC.H - 16} textAnchor="middle">
          {st}
        </text>
      ))}
      <text className="axLbl" x={EC.l + pw / 2} y={EC.H - 2} textAnchor="middle">
        Step
      </text>
      <line x1={EC.l} x2={EC.l + pw} y1={y(d.minErr)} y2={y(d.minErr)} stroke="#B8962E" strokeDasharray="4 3" />
      <text className="axLbl" x={EC.l + pw + 4} y={y(d.minErr) + 3}>
        lowest
      </text>
      {hoverStep !== null && <line x1={x(hoverStep)} x2={x(hoverStep)} y1={EC.t} y2={EC.t + ph} stroke="var(--muted)" strokeDasharray="3 3" />}
      {runs.map((run, ri) => {
        const errs = run.errs.slice(0, Math.min(upto, run.errs.length - 1) + 1)
        const s = SERIES[ri]
        const d2 = errs.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e).toFixed(1)}`).join(' ')
        const last = errs.length - 1
        return (
          <g key={ri}>
            <path d={d2} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
            <circle cx={x(last)} cy={y(errs[last])} r="4" fill={s.color} stroke="#fcfaf4" strokeWidth="2" />
            {upto > 0 && (
            <text x={x(last) + 7} y={y(errs[last]) + (ri - 1) * 11 + 3} fontSize="10.5" fill="var(--ink)">
              α {run.lr.toFixed(2)}
              {errs[last] > yMax ? ' ↑' : ''}
            </text>
            )}
          </g>
        )
      })}
      {Array.from({ length: COMPARE_STEPS + 1 }, (_, st) => (
        <rect
          key={st}
          x={x(st) - pw / COMPARE_STEPS / 2}
          y={EC.t}
          width={pw / COMPARE_STEPS}
          height={ph}
          fill="transparent"
          onMouseEnter={() => onHover(st)}
        />
      ))}
    </svg>
  )
}

function GradientDescentCompare({ d, datasetPicker, onExperiment, onStateDescription }) {
  const [rates, setRates] = useState(DEFAULT_RATES)
  const [prediction, setPrediction] = useState(null)
  const [upto, setUpto] = useState(0)
  const [running, setRunning] = useState(false)
  const [hoverStep, setHoverStep] = useState(null)
  const reportedRef = useRef(false)

  const runs = useMemo(() => rates.map((lr) => runDescent(d, lr)), [d, rates])
  const lastStep = Math.max(...runs.map((r) => r.errs.length - 1))
  const finished = upto >= lastStep
  const winner = winnerOf(runs)

  function reset(nextRates = rates) {
    setRates(nextRates)
    setUpto(0)
    setRunning(false)
    setPrediction(null)
    reportedRef.current = false
  }

  // Dataset changes start a fresh race.
  const [lastD, setLastD] = useState(d)
  if (lastD !== d) {
    setLastD(d)
    setUpto(0)
    setRunning(false)
    setPrediction(null)
    reportedRef.current = false
  }

  useEffect(() => {
    if (!running) return undefined
    if (upto >= lastStep) {
      setRunning(false)
      return undefined
    }
    const id = setTimeout(() => setUpto((u) => u + 1), TICK_MS)
    return () => clearTimeout(id)
  }, [running, upto, lastStep])

  useEffect(() => {
    if (!finished || upto === 0 || reportedRef.current) return
    reportedRef.current = true
    onExperiment?.(`${d.name}, compared learning rates: ${runs.map((r) => `${r.lr.toFixed(2)} ${outcomeText(r)}`).join('; ')}`)
  }, [finished, upto, runs, d, onExperiment])

  useEffect(() => {
    onStateDescription?.(
      `Compare mode on ${d.name}. Learning rates ${rates.map((r) => r.toFixed(2)).join(', ')}. ${
        upto === 0
          ? 'Race not started yet.'
          : `Step ${upto} of up to ${COMPARE_STEPS}. ${runs.map((r) => `${r.lr.toFixed(2)}: ${outcomeText(r)}`).join('; ')}.`
      }`,
    )
  }, [d, rates, upto, runs, onStateDescription])

  const hoverLine =
    hoverStep !== null
      ? `Step ${hoverStep}: ${runs
          .map((r) => {
            const label = `α ${r.lr.toFixed(2)} → `
            if (hoverStep > upto) return `${label}–`
            if (hoverStep < r.errs.length) return label + fmtErr(r.errs[hoverStep])
            return `${label}${fmtErr(r.errs[r.errs.length - 1])} (stopped)`
          })
          .join(' · ')}`
      : 'Hover over the chart to read the error at each step.'

  return (
    <div className="gd gd--compare">
      <div className="gdcIntro">
        <p className="note">
          Three descents start from the same point on the same surface. Only the learning rate differs. Which one gets to
          the gold star first?
        </p>
        {datasetPicker}
      </div>

      <div className="gdcRates">
        {rates.map((lr, i) => (
          <label key={i} className="gdcRate">
            <svg className="gdcKey" width="30" height="10" viewBox="0 0 30 10" aria-hidden="true">
              <line x1="0" y1="5" x2="30" y2="5" stroke={SERIES[i].color} strokeWidth="3" strokeDasharray={SERIES[i].dash} />
            </svg>
            <span>
              Run {SERIES[i].name}: learning rate <b>{lr.toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={LR_MIN}
              max={LR_MAX}
              step={LR_STEP}
              value={lr}
              disabled={running}
              onChange={(e) => reset(rates.map((r, j) => (j === i ? Number(Number(e.target.value).toFixed(2)) : r)))}
            />
          </label>
        ))}
      </div>

      {upto === 0 && (
        <div className="gdcPredict">
          <p className="note">
            <b>Predict first:</b> which learning rate will reach the minimum first?
          </p>
          <div className="datasetRow">
            {rates.map((lr, i) => (
              <button
                key={i}
                type="button"
                className={`datasetBtn${prediction === i ? ' active' : ''}`}
                aria-pressed={prediction === i}
                onClick={() => setPrediction(i)}
              >
                {SERIES[i].name}: {lr.toFixed(2)}
              </button>
            ))}
            <button
              type="button"
              className={`datasetBtn${prediction === 'none' ? ' active' : ''}`}
              aria-pressed={prediction === 'none'}
              onClick={() => setPrediction('none')}
            >
              None of them in {COMPARE_STEPS} steps
            </button>
          </div>
        </div>
      )}

      <div className="btnRowH">
        <button type="button" className="btnP" disabled={running || finished || prediction === null} onClick={() => setRunning(true)}>
          {running ? 'Racing…' : upto === 0 ? 'Start the race' : 'Continue'}
        </button>
        <button type="button" className="btnG" disabled={running || finished || prediction === null} onClick={() => setUpto((u) => u + 1)}>
          One step
        </button>
        <button type="button" className="btnG" onClick={() => reset()}>
          Reset
        </button>
        {prediction === null && upto === 0 && <span className="note">Make a prediction to start.</span>}
      </div>

      <div className="gdcCharts">
        <div>
          <div className="chartRow">
            <span className="chartTitle">Error surface, three paths</span>
            <div className="readouts">
              <span>
                Step <b>{upto}</b>
              </span>
            </div>
          </div>
          <CompareSurface d={d} runs={runs} upto={upto} />
        </div>
        <div>
          <div className="chartRow">
            <span className="chartTitle">Error after each step</span>
          </div>
          <ErrorChart d={d} runs={runs} upto={upto} hoverStep={hoverStep} onHover={setHoverStep} />
          <p className="note gdcReadout" aria-live="polite">
            {hoverLine}
          </p>
          <table className="gdcTable">
            <thead>
              <tr>
                <th>Run</th>
                <th>Learning rate</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className="gdcSwatch" style={{ background: SERIES[i].color }} /> {SERIES[i].name}
                  </td>
                  <td>{r.lr.toFixed(2)}</td>
                  <td>{upto === 0 ? `not started, error ${fmtErr(r.errs[0])}` : finished || upto >= r.errs.length - 1 ? outcomeText(r) : `running… error ${fmtErr(r.errs[upto])}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {finished && upto > 0 && (
        <div className={`annotation ${prediction === winner ? 'fbGood' : 'fbBad'}`}>
          <span className="tag">{prediction === winner ? 'Your prediction was right' : 'Not what you predicted'}</span>
          {winner === 'none'
            ? `None of the three reached the minimum within ${COMPARE_STEPS} steps.`
            : `Learning rate ${runs[winner].lr.toFixed(2)} got there first, in ${runs[winner].convergedAt} steps.`}{' '}
          Too small a learning rate creeps slowly; too large a learning rate overshoots, zigzags or diverges. The learning rate
          is a hyperparameter: you choose it before training, and the best value depends on the data.
        </div>
      )}
    </div>
  )
}

export default GradientDescentCompare
