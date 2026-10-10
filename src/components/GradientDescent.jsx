import { useEffect, useMemo, useRef, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState.js'
import { createSonifier } from '../utils/sound.js'
import SoundToggle from './SoundToggle.jsx'
import GradientDescentCompare from './GradientDescentCompare.jsx'
import './GradientDescent.css'

const range = (n) => Array.from({ length: n }, (_, i) => i + 1)

// Each preset: 10 points, its own start point, heatmap window and mini-chart window.
export const PRESETS = [
  {
    id: 'house',
    name: 'House prices',
    description: "Area against price for 10 flats, the lesson's example",
    X: [1, 2, 3, 4, 5, 6, 6.5, 7, 8, 9],
    Y: [2.1, 2.9, 4.2, 4.8, 6.1, 6.9, 7.3, 7.8, 8.6, 9.4],
    xLabel: 'Area (100 sq ft)',
    yLabel: 'Price (₹ lakh)',
    startB1: -0.3,
    startB0: 6.5,
    b1: [-0.7, 2.4],
    b0: [-8.3, 11.7],
    miniX: [0, 10],
    miniY: [0, 11],
  },
  {
    id: 'exam',
    name: 'Exam scores',
    description: 'Study hours against exam score. A steep slope in different units',
    X: range(10),
    Y: [42, 48, 47, 58, 62, 64, 71, 73, 80, 83],
    xLabel: 'Study hours per week',
    yLabel: 'Exam score (out of 100)',
    startB1: -1.44,
    startB0: 64.71,
    b1: [-3.4, 11.7],
    b0: [-14.7, 94.5],
    miniX: [0, 11],
    miniY: [0, 92],
  },
  {
    id: 'car',
    name: 'Used car value',
    description: 'Car age against price. The slope is negative, so the search moves the other way',
    X: range(10),
    Y: [8.9, 8.1, 7.4, 6.9, 6.0, 5.6, 4.7, 4.4, 3.5, 3.1],
    xLabel: 'Car age (years)',
    yLabel: 'Price (₹ lakh)',
    startB1: -1.49,
    startB0: 13.19,
    b1: [-1.8, 0.4],
    b0: [2.2, 17.4],
    miniX: [0, 11],
    miniY: [0, 10],
  },
  {
    id: 'noisy',
    name: 'Noisy sales data',
    description: 'Advertising spend against weekly sales. The points are scattered, so even the best line leaves a large error',
    X: range(10),
    Y: [3.2, 7.1, 4.0, 8.3, 5.1, 9.0, 4.8, 8.6, 6.9, 9.5],
    xLabel: 'Advertising spend (₹ thousand)',
    yLabel: 'Weekly sales (hundreds of units)',
    startB1: -0.53,
    startB0: 8.59,
    b1: [-0.9, 1.6],
    b0: [-4.0, 13.4],
    miniX: [0, 11],
    miniY: [0, 11],
  },
]

export const MAX_STEPS = 10
export const LR_MIN = 0.05
export const LR_MAX = 1.2
export const LR_STEP = 0.05
const LR_DEFAULT = 0.3
const CONVERGED_WITHIN = 0.05
const HIGH_ERROR_SHARE = 0.1
const TICK_MS = 650
const INTRO = 'Press "Step forward" to begin. The starting point is deliberately far from the minimum.'
const HIGH_ERROR_NOTE =
  ' The error stays high because no straight line fits scattered points well. Gradient descent found the best line there is.'

export const W = 560
export const H = 400
export const PAD = { l: 50, r: 20, t: 14, b: 36 }
export const plotW = W - PAD.l - PAD.r
export const plotH = H - PAD.t - PAD.b
const GRID_X = 44
const GRID_Y = 32
export const cellW = plotW / GRID_X
export const cellH = plotH / GRID_Y

function mseOf(X, Y, b1, b0) {
  let s = 0
  for (let i = 0; i < X.length; i++) {
    const e = b1 * X[i] + b0 - Y[i]
    s += e * e
  }
  return s / X.length
}

// paper (#F3EFE4) -> blue (#2F5D8A)
function lerpColor(t) {
  const a = [0xf3, 0xef, 0xe4]
  const b = [0x2f, 0x5d, 0x8a]
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

// Everything that depends on the chosen dataset, worked out once per preset.
function buildDataset(p) {
  const { X, Y } = p
  const N = X.length
  const meanX = X.reduce((a, b) => a + b, 0) / N
  const meanY = Y.reduce((a, b) => a + b, 0) / N
  const stdX = Math.sqrt(X.reduce((s, x) => s + (x - meanX) ** 2, 0) / N)
  const stdY = Math.sqrt(Y.reduce((s, y) => s + (y - meanY) ** 2, 0) / N)
  const sxy = X.reduce((s, x, i) => s + (x - meanX) * (Y[i] - meanY), 0)
  const sxx = X.reduce((s, x) => s + (x - meanX) ** 2, 0)
  const olsB1 = sxy / sxx
  const olsB0 = meanY - olsB1 * meanX
  const minErr = mseOf(X, Y, olsB1, olsB0)
  const startErr = mseOf(X, Y, p.startB1, p.startB0)
  const [B1_MIN, B1_MAX] = p.b1
  const [B0_MIN, B0_MAX] = p.b0

  const d = {
    ...p,
    N,
    meanX,
    meanY,
    stdX,
    stdY,
    Xn: X.map((x) => (x - meanX) / stdX),
    Yn: Y.map((y) => (y - meanY) / stdY),
    olsB1,
    olsB0,
    minErr,
    startErr,
    B1_MIN,
    B1_MAX,
    B0_MIN,
    B0_MAX,
    highError: minErr > HIGH_ERROR_SHARE * startErr,
    px: (b1) => PAD.l + ((b1 - B1_MIN) / (B1_MAX - B1_MIN)) * plotW,
    py: (b0) => PAD.t + plotH - ((b0 - B0_MIN) / (B0_MAX - B0_MIN)) * plotH,
  }

  // Colour scale is relative to this preset: lightest at the minimum, saturating at 3.5x the start's excess error.
  const denom = 3.5 * (startErr - minErr)
  d.heat = []
  for (let i = 0; i < GRID_X; i++) {
    const b1 = B1_MIN + ((i + 0.5) * (B1_MAX - B1_MIN)) / GRID_X
    for (let j = 0; j < GRID_Y; j++) {
      const b0 = B0_MIN + ((j + 0.5) * (B0_MAX - B0_MIN)) / GRID_Y
      const t = Math.min(1, Math.sqrt(Math.max(0, mseOf(X, Y, b1, b0) - minErr) / denom))
      d.heat.push({
        key: `${i}-${j}`,
        x: PAD.l + i * cellW,
        y: PAD.t + plotH - (j + 1) * cellH,
        fill: lerpColor(t),
      })
    }
  }
  return d
}

export const DATASETS = Object.fromEntries(PRESETS.map((p) => [p.id, buildDataset(p)]))
const DATASET_IDS = PRESETS.map((p) => p.id)
const DEFAULT_DATASET = 'house'

const mseReal = (d, b1, b0) => mseOf(d.X, d.Y, b1, b0)

export function outsideChart(d, b1, b0) {
  return b1 < d.B1_MIN || b1 > d.B1_MAX || b0 < d.B0_MIN || b0 > d.B0_MAX
}

// Descent runs on standardised data; these convert to and from the real coordinates we display.
function realFromNorm(d, mn, bn) {
  const b1 = (mn * d.stdY) / d.stdX
  const b0 = d.meanY - b1 * d.meanX + bn * d.stdY
  return [b1, b0]
}

function normFromReal(d, b1, b0) {
  const mn = (b1 * d.stdX) / d.stdY
  const bn = (b0 - d.meanY + b1 * d.meanX) / d.stdY
  return [mn, bn]
}

function gradNorm(d, mn, bn) {
  let dm = 0
  let db = 0
  for (let i = 0; i < d.N; i++) {
    const e = mn * d.Xn[i] + bn - d.Yn[i]
    dm += e * d.Xn[i]
    db += e
  }
  return [(2 * dm) / d.N, (2 * db) / d.N]
}

export function initState(d) {
  const [mn, bn] = normFromReal(d, d.startB1, d.startB0)
  return {
    mn,
    bn,
    step: 0,
    path: [[d.startB1, d.startB0]],
    errs: [d.startErr],
    done: false,
    converged: false,
    note: INTRO,
  }
}

// What went wrong in a run that ended without converging: `text` goes in the lesson message, `short` in the log.
const DIAGNOSIS = {
  diverging: {
    text: 'The error kept rising, so the steps are too large and the descent is diverging.',
    short: 'the steps were too large and it diverged',
  },
  bouncing: {
    text: 'The error is no longer changing, so the path is bouncing between two points and never settling.',
    short: 'it bounced between two points and never settled',
  },
  zigzag: {
    text: 'The error is falling, but the slope estimate crosses the OLS slope on each step, so the steps overshoot and zigzag. It settles slowly.',
    short: 'the steps overshot and zigzagged, so it settled slowly',
  },
  small: {
    text: 'The error is falling steadily, so the steps are too small and it is still far away from the minimum.',
    short: 'the steps were too small to get near the minimum',
  },
  unclear: {
    text: 'The error has not settled into a clear pattern.',
    short: 'the error had not settled into a clear pattern',
  },
}

// Looks at the last few steps of a run that ended without converging.
function diagnose(d, path, errs) {
  const last = errs.length - 1
  const from = Math.max(0, last - 3)
  const deltas = []
  const crossings = []
  for (let i = from; i < last; i++) {
    const tol = 1e-6 * Math.max(errs[i], errs[i + 1])
    deltas.push({ d: errs[i + 1] - errs[i], tol })
    crossings.push((path[i][0] - d.olsB1) * (path[i + 1][0] - d.olsB1) < 0)
  }
  if (deltas.every(({ d: dv, tol }) => dv > tol)) return 'diverging'
  if (deltas.every(({ d: dv, tol }) => Math.abs(dv) <= tol)) return 'bouncing'
  if (deltas.every(({ d: dv, tol }) => dv < -tol)) return crossings.every(Boolean) ? 'zigzag' : 'small'
  return 'unclear'
}

export function advance(d, s, lr) {
  const [prevB1] = realFromNorm(d, s.mn, s.bn)
  const prevMse = s.errs[s.errs.length - 1]
  const [dm, db] = gradNorm(d, s.mn, s.bn)
  const mn = s.mn - lr * dm
  const bn = s.bn - lr * db
  const step = s.step + 1
  const [b1, b0] = realFromNorm(d, mn, bn)
  const newMse = mseReal(d, b1, b0)
  const path = [...s.path, [b1, b0]]
  const errs = [...s.errs, newMse]
  const converged = newMse <= d.minErr * (1 + CONVERGED_WITHIN)
  const done = converged || step >= MAX_STEPS
  const slopeText = b1 > prevB1 ? `increased to ${b1.toFixed(2)}` : b1 < prevB1 ? `decreased to ${b1.toFixed(2)}` : `stayed at ${b1.toFixed(2)}`
  let errText
  if (newMse > prevMse) errText = `Error rose from ${prevMse.toFixed(3)} to ${newMse.toFixed(3)}.`
  else if (newMse < prevMse) errText = `Error fell from ${prevMse.toFixed(3)} to ${newMse.toFixed(3)}.`
  else errText = `Error stayed at ${newMse.toFixed(3)}.`
  let diagnosis = null
  let note = `Moved to the steepest downhill direction from here. Slope ${slopeText}, intercept to ${b0.toFixed(2)}. ${errText}`
  if (converged) {
    note += ` The error is within ${CONVERGED_WITHIN * 100}% of the OLS minimum (${d.minErr.toFixed(3)}), so this has converged: the bottom of the bowl, the same answer OLS computes directly in one step.`
    if (d.highError) note += HIGH_ERROR_NOTE
  } else if (done) {
    diagnosis = diagnose(d, path, errs)
    note += ` Stopped at the ${MAX_STEPS} step limit without converging (not within ${CONVERGED_WITHIN * 100}% of the OLS minimum, ${d.minErr.toFixed(3)}). ${DIAGNOSIS[diagnosis].text}`
  }
  return { mn, bn, step, path, errs, done, converged, diagnosis, note }
}

// Replays the descent from the starting point, with no animation.
function replay(d, lr, steps) {
  let s = initState(d)
  for (let i = 0; i < steps; i++) s = advance(d, s, lr)
  return s
}

export function starPoints(cx, cy) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 7 : 3
    const a = Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function ErrorSurface({ d, b1, b0, path }) {
  const { px, py, B1_MIN, B1_MAX, B0_MIN, B0_MAX } = d
  const clampB1 = (v) => Math.min(B1_MAX, Math.max(B1_MIN, v))
  const clampB0 = (v) => Math.min(B0_MAX, Math.max(B0_MIN, v))
  // Anything beyond the axes is drawn at the nearest edge.
  const edge = ([pb1, pb0]) => [px(clampB1(pb1)), py(clampB0(pb0))]
  const pts = path.map((p) => edge(p).map((v) => v.toFixed(1)).join(',')).join(' ')
  const [curX, curY] = edge([b1, b0])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Heatmap of error across slope and intercept values for the ${d.name} data, with the gradient descent path overlaid`}>
      {d.heat.map((c) => (
        <rect key={c.key} x={c.x.toFixed(1)} y={c.y.toFixed(1)} width={(cellW + 0.6).toFixed(1)} height={(cellH + 0.6).toFixed(1)} fill={c.fill} />
      ))}
      <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MAX)} y2={py(B0_MIN)} stroke="var(--ink)" strokeWidth="1" opacity="0.4" />
      <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MIN)} y2={py(B0_MAX)} stroke="var(--ink)" strokeWidth="1" opacity="0.4" />
      <text className="axLbl" x={PAD.l + plotW / 2} y="396" textAnchor="middle">
        Slope (b₁)
      </text>
      <text className="axLbl" x="16" y={PAD.t + plotH / 2} textAnchor="middle" transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}>
        Intercept (b₀)
      </text>
      {path.length > 1 && (
        <>
          <polyline points={pts} fill="none" stroke="var(--rust)" strokeWidth="2" />
          {path.map((p, i) => {
            const [ex, ey] = edge(p)
            if (outsideChart(d, p[0], p[1])) {
              return (
                <g key={i}>
                  <rect x={ex - 6} y={ey - 6} width="12" height="12" fill="#fff" stroke="var(--rust)" strokeWidth="2" transform={`rotate(45 ${ex} ${ey})`} />
                  <text x={ex} y={ey + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--rust)">
                    !
                  </text>
                </g>
              )
            }
            return <circle key={i} cx={ex.toFixed(1)} cy={ey.toFixed(1)} r="3" fill="var(--rust)" />
          })}
        </>
      )}
      <circle cx={px(d.startB1)} cy={py(d.startB0)} r="5" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      <polygon points={starPoints(px(d.olsB1), py(d.olsB0))} fill="#D9B44A" stroke="var(--ink)" strokeWidth="0.5" />
      <circle cx={curX.toFixed(1)} cy={curY.toFixed(1)} r="6" fill="var(--blue)" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}

const MINI = { W: 220, H: 180, l: 24, r: 10, t: 10, b: 22 }

function MiniFit({ d, b1, b0 }) {
  const pw = MINI.W - MINI.l - MINI.r
  const ph = MINI.H - MINI.t - MINI.b
  const [x0, x1] = d.miniX
  const [y0, y1] = d.miniY
  const mx = (x) => MINI.l + ((x - x0) / (x1 - x0)) * pw
  const my = (y) => MINI.t + ph - ((y - y0) / (y1 - y0)) * ph
  return (
    <svg viewBox={`0 0 ${MINI.W} ${MINI.H}`} role="img" aria-label={`The current line plotted against the ${d.name} data`}>
      <defs>
        <clipPath id="gd-mini-clip">
          <rect x={MINI.l} y={MINI.t} width={pw} height={ph} />
        </clipPath>
      </defs>
      <line x1={mx(x0)} y1={my(y0)} x2={mx(x0)} y2={my(y1)} stroke="#C9C1A8" />
      <line x1={mx(x0)} y1={my(y0)} x2={mx(x1)} y2={my(y0)} stroke="#C9C1A8" />
      {d.X.map((x, i) => (
        <circle key={i} cx={mx(x)} cy={my(d.Y[i])} r="3" fill="var(--ink)" />
      ))}
      <line
        x1={mx(x0)}
        y1={my(b1 * x0 + b0)}
        x2={mx(x1)}
        y2={my(b1 * x1 + b0)}
        stroke="var(--blue)"
        strokeWidth="2"
        clipPath="url(#gd-mini-clip)"
      />
    </svg>
  )
}

function JumpNav({ current, onJump }) {
  return (
    <div className="gd-jump">
      <p className="stageNavTitle">Jump to step</p>
      <ol className="stageList">
        {Array.from({ length: MAX_STEPS + 1 }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className={`stageNavItem${i === current ? ' active' : ''}`}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onJump(i)}
            >
              Step {i}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export const fmtErr = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(3))

// One sentence describing how a run ended, for the experiment log.
function summariseRun(d, lr, run) {
  const head = `${d.name}, learning rate ${lr.toFixed(2)}`
  const last = run.errs[run.errs.length - 1]
  if (run.converged) return `${head}: converged in ${run.step} steps, error ${fmtErr(last)}`
  const first = run.errs[0]
  return `${head}: error ${last > first ? 'rose' : 'fell'} from ${fmtErr(first)} to ${fmtErr(last)} over ${run.step} steps, ${DIAGNOSIS[run.diagnosis].short}`
}

function GradientDescent({ onStateDescription, onExperiment } = {}) {
  const [datasetId, setDatasetId] = useSessionState(
    'mlx.gradient-descent.dataset',
    DEFAULT_DATASET,
    (v) => DATASET_IDS.includes(v),
  )
  const d = DATASETS[datasetId]
  const [lr, setLr] = useSessionState(
    'mlx.gradient-descent.lr',
    LR_DEFAULT,
    (v) => Number.isFinite(v) && v >= LR_MIN && v <= LR_MAX,
  )
  const [savedStep, setSavedStep] = useSessionState(
    'mlx.gradient-descent.step',
    0,
    (v) => Number.isInteger(v) && v >= 0 && v <= MAX_STEPS,
  )
  const [mode, setMode] = useSessionState('mlx.gradient-descent.mode', 'single', (v) => v === 'single' || v === 'compare')
  // Restore by replaying from the starting point.
  const [state, setState] = useState(() => replay(d, lr, savedStep))
  const [running, setRunning] = useState(false)
  const stateRef = useRef(state)
  const onExperimentRef = useRef(onExperiment)
  const reportedRef = useRef(false)
  const [soundOn, setSoundOn] = useState(false)
  const [soundNote, setSoundNote] = useState('')
  const soundOnRef = useRef(false)
  const sonifierRef = useRef(null)

  useEffect(() => {
    soundOnRef.current = soundOn
    if (!soundOn) {
      sonifierRef.current?.close()
      setSoundNote('')
    }
  }, [soundOn])

  // Stop any sound and release the audio context when the learner leaves the page.
  useEffect(() => () => sonifierRef.current?.close(), [])

  // One tone per step: pitch follows the heatmap's colour value t, pan follows the side of the best slope.
  const playFor = (run) => {
    if (!soundOnRef.current) return
    try {
      if (!sonifierRef.current) sonifierRef.current = createSonifier()
      const err = run.errs[run.errs.length - 1]
      const t = Math.sqrt(Math.max(err - d.minErr, 0) / (3.5 * (d.startErr - d.minErr)))
      const freq = Math.min(1500, 196 * 2 ** (2.5 * t))
      const olsMn = (d.olsB1 * d.stdX) / d.stdY
      const pan = Math.max(-1, Math.min(1, (run.mn - olsMn) / 1.5))
      sonifierRef.current.playStep({ freq, pan })
      if (run.converged) sonifierRef.current.playResolve()
      const side =
        Math.abs(pan) < 0.05
          ? 'sound in the centre, slope at the best slope'
          : pan < 0
            ? 'sound on the left, slope below the best slope'
            : 'sound on the right, slope above the best slope'
      setSoundNote(
        `Sound played: error ${fmtErr(err)}, pitch ${Math.round(freq)} Hz; ${side}.${run.converged ? ' Settled: the two-note chime played.' : ''}`,
      )
    } catch {
      // sound is optional
    }
  }

  useEffect(() => {
    onExperimentRef.current = onExperiment
  }, [onExperiment])

  // Every state change goes through here so the ref always holds the latest run.
  const put = (next) => {
    stateRef.current = next
    setState(next)
  }
  // A step the learner asked for (button or auto-run). Replays and restores never come through here.
  const userAdvance = () => {
    const next = advance(d, stateRef.current, lr)
    put(next)
    playFor(next)
    if (next.done && !reportedRef.current) {
      reportedRef.current = true
      onExperimentRef.current?.(summariseRun(d, lr, next))
    }
  }

  const [b1, b0] = useMemo(() => realFromNorm(d, state.mn, state.bn), [d, state.mn, state.bn])
  const m = mseReal(d, b1, b0)
  const leftChart = state.path.some(([pb1, pb0]) => outsideChart(d, pb1, pb0))

  useEffect(() => {
    const status = state.converged
      ? 'Converged: error within 5% of the OLS minimum.'
      : state.done
        ? `Stopped at the ${MAX_STEPS} step limit without converging.`
        : 'Not yet converged.'
    onStateDescription?.(
      `Dataset: ${d.name} (${d.xLabel} against ${d.yLabel}). Learning rate ${lr.toFixed(2)}. Step ${state.step}. Slope ${b1.toFixed(2)}, intercept ${b0.toFixed(2)}, error ${m.toFixed(3)}. Lowest possible error ${d.minErr.toFixed(3)} at slope ${d.olsB1.toFixed(2)}, intercept ${d.olsB0.toFixed(2)}. ${status}${leftChart ? ' The path has left the chart.' : ''}`,
    )
  }, [d, lr, state.step, state.done, state.converged, b1, b0, m, leftChart, onStateDescription])

  useEffect(() => {
    setSavedStep(state.step)
  }, [state.step, setSavedStep])

  useEffect(() => {
    if (!running) return undefined
    if (state.done) {
      setRunning(false)
      return undefined
    }
    const id = setTimeout(userAdvance, TICK_MS)
    return () => clearTimeout(id)
  }, [running, state, lr, d])

  const handleStep = () => userAdvance()
  const handleRun = () => {
    userAdvance()
    setRunning(true)
  }
  const handleReset = () => {
    setRunning(false)
    reportedRef.current = false
    setSoundNote('')
    put(initState(d))
  }
  const handleLr = (e) => {
    setLr(Number(Number(e.target.value).toFixed(2)))
    setRunning(false)
    reportedRef.current = false
    setSoundNote('')
    put(initState(d))
  }
  const handleJump = (target) => {
    setRunning(false)
    const landed = replay(d, lr, target)
    put(landed)
    playFor(landed)
  }
  // Learning rate is kept; the descent starts again from the new preset's start point.
  const handleDataset = (id) => {
    if (id === datasetId) return
    setRunning(false)
    setDatasetId(id)
    reportedRef.current = false
    setSoundNote('')
    put(initState(DATASETS[id]))
  }

  const datasetPicker = (
    <div className="datasetPicker">
      <div className="datasetRow" role="group" aria-label="Dataset">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`datasetBtn${p.id === datasetId ? ' active' : ''}`}
            aria-pressed={p.id === datasetId}
            onClick={() => handleDataset(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="note">{d.description}</p>
    </div>
  )

  const modeTabs = (
    <div className="gdModeTabs" role="tablist" aria-label="Simulation mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'single'}
        className={`gdModeTab${mode === 'single' ? ' active' : ''}`}
        onClick={() => setMode('single')}
      >
        One descent, step by step
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'compare'}
        className={`gdModeTab${mode === 'compare' ? ' active' : ''}`}
        onClick={() => {
          setRunning(false)
          setMode('compare')
        }}
      >
        Compare learning rates
      </button>
    </div>
  )

  if (mode === 'compare') {
    return (
      <>
        {modeTabs}
        <GradientDescentCompare
          d={d}
          datasetPicker={datasetPicker}
          onExperiment={onExperiment}
          onStateDescription={onStateDescription}
        />
      </>
    )
  }

  return (
    <>
    {modeTabs}
    <div className="gd">
      <div className="gd-controls">
        <div className="btnCol">
          <button className="btnP" onClick={handleStep} disabled={state.done || running}>
            Step forward
          </button>
          <button className="btnG" onClick={handleRun} disabled={state.done || running}>
            {running ? 'Running…' : 'Run to convergence'}
          </button>
          <button className="btnG" onClick={handleReset}>
            Reset to step 0
          </button>
        </div>
        <SoundToggle
          checked={soundOn}
          onChange={setSoundOn}
          legend="Higher pitch means more error. The sound moves left or right depending on which side of the best slope you are on. A steady low note in the centre means it has settled."
          status={soundNote}
        />
        <div className="lrControl">
          <label htmlFor="gd-lr" className="lrLabel">
            Learning rate <b>{lr.toFixed(2)}</b>
          </label>
          <input id="gd-lr" type="range" min={LR_MIN} max={LR_MAX} step={LR_STEP} value={lr} onChange={handleLr} />
          <p className="note">The learning rate is a hyperparameter. Try 0.05, 0.50 and 1.10 and watch the path.</p>
          <div className="legendLabels">
            <span>{LR_MIN.toFixed(2)}</span>
            <span>{LR_MAX.toFixed(2)}</span>
          </div>
        </div>
        <p className="note">Each step moves in the steepest downhill direction on this surface, the same idea as rolling a ball down a hill.</p>
        <div>
          <div className="note" style={{ marginBottom: 6 }}>
            Error (darker = worse)
          </div>
          <div className="legendBar" />
          <div className="legendLabels">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="gd-main">
        {datasetPicker}
        <div className="chartRow">
          <span className="chartTitle">Error surface: every possible slope × intercept</span>
          <div className="readouts">
            <span>
              Step <b>{state.step}</b>
            </span>
            <span>
              Error (MSE) <b className="mseVal">{m.toFixed(3)}</b>
            </span>
            <span>
              Lowest possible error <b>{d.minErr.toFixed(3)}</b>
            </span>
          </div>
        </div>
        <ErrorSurface d={d} b1={b1} b0={b0} path={state.path} />
        {leftChart && (
          <div className="chartNote" role="status">
            The path has left the chart. Points beyond the edge are drawn at the nearest edge with a ! marker.
          </div>
        )}
        <div className="annotation">
          {state.step > 0 && <span className="tag">Step {state.step}</span>}
          {state.note}
        </div>
      </div>

      <div className="gd-side">
        <h3>What this line looks like</h3>
        <MiniFit d={d} b1={b1} b0={b0} />
        <p className="note" style={{ marginTop: 4 }}>
          x: {d.xLabel}. y: {d.yLabel}.
        </p>
        <p className="note" style={{ marginTop: 8 }}>
          ŷ = {b0.toFixed(2)} + {b1.toFixed(2)}x
        </p>
        <JumpNav current={state.step} onJump={handleJump} />
      </div>
    </div>
    </>
  )
}

export default GradientDescent
