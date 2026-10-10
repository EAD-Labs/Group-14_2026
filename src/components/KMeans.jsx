import { useEffect, useMemo, useRef, useState } from 'react'
import GoFurtherPanel from './GoFurtherPanel.jsx'
import { useSessionState } from '../hooks/useSessionState.js'
import { createSonifier } from '../utils/sound.js'
import SoundToggle from './SoundToggle.jsx'
import {
  MAX_FILE_BYTES,
  MAX_POINTS,
  MIN_POINTS,
  computeBounds,
  countDistinct,
  elbowCurve,
  findElbow,
  parseTwoColumnCsv,
  seedCentroids,
  validatePoints,
} from './kmeansData.js'
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

const COLOR_NAMES = ['Blue', 'Rust', 'Green', 'Purple']
const COLORS = ['var(--blue)', 'var(--rust)', 'var(--good)', '#7a4f9a']
const SHAPES = ['circle', 'square', 'triangle', 'plus']
const K_OPTIONS = [2, 3, 4]

const MAX_ITERS = 10
const CONVERGENCE_EPS = 0.01
const RUN_DELAY_MS = 700

const EXAMPLE_BOUNDS = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }

const STAGE_KEYS = ['table', 'group', 'centres', 'distance', 'stepping']

function isPointList(v) {
  return (
    Array.isArray(v) &&
    v.length <= MAX_POINTS &&
    v.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
  )
}

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

function fmtTick(v) {
  return String(Number(v.toPrecision(3)))
}

function makeInitialSim(points, k, isExample) {
  return {
    centroids: seedCentroids(points, k, isExample),
    assign: points.map(() => null),
    iter: 0,
    converged: false,
    limit: false,
    done: false,
  }
}

function focusIndexForIter(iter, n) {
  return (iter * 5 + 3) % n
}

function computeStep(points, sim, guess, focusIdx) {
  const centroids = sim.centroids.map((c) => c.slice())
  const newAssign = points.map((p) => {
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

  const groups = centroids.map((_, i) => points.filter((_, idx) => newAssign[idx] === i))
  const means = groups.map((g, i) =>
    g.length ? [g.reduce((a, p) => a + p[0], 0) / g.length, g.reduce((a, p) => a + p[1], 0) / g.length] : centroids[i],
  )
  const moved = means.reduce((s, mn, i) => s + dist(mn, centroids[i]), 0)
  const nextIter = sim.iter + 1
  const converged = moved < CONVERGENCE_EPS
  const limit = !converged && nextIter >= MAX_ITERS
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
  if (limit) html += ` Stopped at the ${MAX_ITERS} iteration limit, the centres were still moving.`

  return {
    sim: { centroids: means, assign: newAssign, iter: nextIter, converged, limit, done: converged || limit },
    annotation: { html, kind },
  }
}

// Replays the algorithm from the seeded centres, with no animation.
function replaySim(points, k, isExample, target) {
  let sim = makeInitialSim(points, k, isExample)
  let annotation = { html: 'Press "Step forward" to begin.', kind: null }
  for (let i = 0; i < target; i += 1) {
    const result = computeStep(points, sim, null, null)
    sim = result.sim
    annotation = result.annotation
  }
  return { sim, annotation }
}

function Marker({ shape, cx, cy, color, r = 5 }) {
  if (shape === 'square') {
    return <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill={color} />
  }
  if (shape === 'triangle') {
    return <polygon points={`${cx},${cy - r - 1.5} ${cx - r - 1.5},${cy + r} ${cx + r + 1.5},${cy + r}`} fill={color} />
  }
  if (shape === 'plus') {
    return (
      <g stroke={color} strokeWidth="2.6" strokeLinecap="round">
        <line x1={cx - r - 1} y1={cy} x2={cx + r + 1} y2={cy} />
        <line x1={cx} y1={cy - r - 1} x2={cx} y2={cy + r + 1} />
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={r} fill={color} />
}

function MarkerIcon({ index }) {
  return (
    <svg className="markerIcon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <Marker shape={SHAPES[index]} cx={8} cy={8} color={COLORS[index]} r={4.5} />
    </svg>
  )
}

function Legend({ k }) {
  return (
    <div className="legend" aria-label="Chart legend">
      {Array.from({ length: k }, (_, i) => (
        <span className="legendItem" key={i}>
          <MarkerIcon index={i} />
          Cluster {i + 1} ({SHAPES[i]})
        </span>
      ))}
      <span className="legendItem">
        <svg className="markerIcon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <rect x="4" y="4" width="8" height="8" fill="none" stroke="var(--ink)" strokeWidth="2" transform="rotate(45 8 8)" />
        </svg>
        Centre (hollow diamond)
      </span>
    </div>
  )
}

function ChartFrame({ scale, bounds, children }) {
  const { px, py } = scale
  const midY = py((bounds.yMin + bounds.yMax) / 2)
  return (
    <svg viewBox="0 0 560 340" role="img" aria-label="Interactive k-means clustering chart">
      <line x1={px(bounds.xMin)} y1={py(bounds.yMin)} x2={px(bounds.xMin)} y2={py(bounds.yMax)} stroke="#C9C1A8" />
      <line x1={px(bounds.xMin)} y1={py(bounds.yMin)} x2={px(bounds.xMax)} y2={py(bounds.yMin)} stroke="#C9C1A8" />
      <text className="axLbl" x={px(bounds.xMin)} y={py(bounds.yMin) + 13} textAnchor="start">
        {fmtTick(bounds.xMin)}
      </text>
      <text className="axLbl" x={px(bounds.xMax)} y={py(bounds.yMin) + 13} textAnchor="end">
        {fmtTick(bounds.xMax)}
      </text>
      <text className="axLbl" x={px(bounds.xMin) - 5} y={py(bounds.yMin)} textAnchor="end">
        {fmtTick(bounds.yMin)}
      </text>
      <text className="axLbl" x={px(bounds.xMin) - 5} y={py(bounds.yMax) + 8} textAnchor="end">
        {fmtTick(bounds.yMax)}
      </text>
      <text className="axLbl" x={(px(bounds.xMin) + px(bounds.xMax)) / 2} y="332" textAnchor="middle">
        x
      </text>
      <text className="axLbl" x="12" y={midY} textAnchor="middle" transform={`rotate(-90 12 ${midY})`}>
        y
      </text>
      {children}
    </svg>
  )
}

function PointDots({ points, scale, assign, highlightIdx }) {
  return points.map((p, i) => {
    const cIdx = assign[i]
    const assigned = cIdx !== null && cIdx !== undefined
    const cx = scale.px(p[0])
    const cy = scale.py(p[1])
    return (
      <g key={`point-${i}`}>
        {highlightIdx === i && <circle cx={cx} cy={cy} r="11" fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
        <Marker shape={assigned ? SHAPES[cIdx] : 'circle'} cx={cx} cy={cy} color={assigned ? COLORS[cIdx] : '#9C9584'} />
      </g>
    )
  })
}

function CentroidMarks({ scale, centroids }) {
  return centroids.map((c, i) => {
    const cx = scale.px(c[0])
    const cy = scale.py(c[1])
    return (
      <g key={`centroid-${i}`}>
        <rect
          x={cx - 8}
          y={cy - 8}
          width="16"
          height="16"
          fill="var(--paper-card)"
          fillOpacity="0.85"
          stroke={COLORS[i]}
          strokeWidth="2.5"
          transform={`rotate(45 ${cx} ${cy})`}
        />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS[i]} pointerEvents="none">
          {i + 1}
        </text>
      </g>
    )
  })
}

function IterationNav({ current, visited, onJump }) {
  return (
    <div className="kmeans-iternav">
      <p className="stageNavTitle">Jump to iteration</p>
      <ol className="stageList">
        {Array.from({ length: MAX_ITERS + 1 }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className={`stageNavItem${i === current ? ' active' : ''}${i !== current && visited.includes(i) ? ' visited' : ''}`}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onJump(i)}
            >
              Iteration {i}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Sum of squared distances from each point to the centroid it is assigned to; null before the first step.
function totalSpread(points, sim) {
  if (sim.iter === 0 || sim.assign.some((a) => a === null)) return null
  return points.reduce((s, p, i) => s + dist(p, sim.centroids[sim.assign[i]]) ** 2, 0)
}

// ---------- elbow plot: was K a good choice? ----------
const EW = 440
const EH = 240
const EPAD = { l: 56, r: 20, t: 18, b: 40 }

function ElbowPanel({ points, isExample, k, onTryK }) {
  const curve = useMemo(() => elbowCurve(points, isExample), [points, isExample])
  const elbow = useMemo(() => findElbow(curve), [curve])
  const [guess, setGuess] = useState(null)
  const [hoverK, setHoverK] = useState(null)
  const revealed = guess !== null

  if (curve.length < 3) {
    return <p className="note">The elbow plot needs at least 3 distinct points.</p>
  }

  const maxK = curve[curve.length - 1].k
  const maxSse = curve[0].sse
  const plotW = EW - EPAD.l - EPAD.r
  const plotH = EH - EPAD.t - EPAD.b
  const px = (kk) => EPAD.l + ((kk - 1) / (maxK - 1)) * plotW
  const py = (v) => EPAD.t + plotH - (v / maxSse) * plotH
  const path = curve.map((c, i) => `${i ? 'L' : 'M'}${px(c.k).toFixed(1)},${py(c.sse).toFixed(1)}`).join(' ')
  const yTicks = [0, 0.5, 1].map((t) => t * maxSse)
  const sseAt = (kk) => curve.find((c) => c.k === kk)?.sse
  const hovered = hoverK !== null ? curve.find((c) => c.k === hoverK) : null
  const prevOfHovered = hovered && hovered.k > 1 ? sseAt(hovered.k - 1) : null

  let feedback = null
  if (revealed) {
    if (guess === elbow) feedback = { cls: 'fbGood', tag: 'Yes', text: `The curve bends at K = ${elbow}. Up to there, each extra cluster cuts the spread a lot; after it, extra clusters only shave off a little.` }
    else if (guess === 'skip') feedback = { cls: '', tag: 'The bend', text: `The curve bends at K = ${elbow}. Up to there, each extra cluster cuts the spread a lot; after it, extra clusters only shave off a little.` }
    else feedback = { cls: 'fbBad', tag: 'Look again', text: `The sharpest bend is at K = ${elbow}. Compare how much the spread drops just before K = ${elbow} with how much it drops just after it.` }
  }

  return (
    <div className="elbowPanel">
      <p className="sectionLabel">Was K = {k} a good choice? The elbow plot</p>
      <p className="note">
        K-Means was run for every K from 1 to {maxK} on this same data (keeping the best of several starts), and each
        run&apos;s total spread (SSE) is plotted below. SSE keeps shrinking as K grows, so the lowest point is not the
        answer. Look for the <b>elbow</b>: the K after which adding another cluster stops helping much.
      </p>
      <svg
        viewBox={`0 0 ${EW} ${EH}`}
        className="elbowSvg"
        role="img"
        aria-label={`Elbow plot: total spread for K = 1 to ${maxK}. ${curve.map((c) => `K ${c.k}: ${c.sse.toFixed(1)}`).join(', ')}.`}
        onMouseLeave={() => setHoverK(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={EPAD.l} x2={EW - EPAD.r} y1={py(v)} y2={py(v)} stroke="var(--line)" strokeWidth="1" />
            <text className="axLbl" x={EPAD.l - 8} y={py(v) + 3} textAnchor="end">
              {v === 0 || v >= 10 ? v.toFixed(0) : v.toFixed(1)}
            </text>
          </g>
        ))}
        {curve.map((c) => (
          <text key={`kx${c.k}`} className="axLbl" x={px(c.k)} y={EH - 20} textAnchor="middle">
            {c.k}
          </text>
        ))}
        <text className="axLbl" x={EPAD.l + plotW / 2} y={EH - 4} textAnchor="middle">
          Number of clusters K
        </text>
        <text className="axLbl" x="12" y={EPAD.t + plotH / 2} textAnchor="middle" transform={`rotate(-90 12 ${EPAD.t + plotH / 2})`}>
          Total spread (SSE)
        </text>
        {hovered && (
          <line x1={px(hovered.k)} x2={px(hovered.k)} y1={EPAD.t} y2={EPAD.t + plotH} stroke="var(--muted)" strokeDasharray="3 3" />
        )}
        <path d={path} fill="none" stroke="var(--blue)" strokeWidth="2" />
        {revealed && elbow && (
          <g>
            <circle cx={px(elbow)} cy={py(sseAt(elbow))} r="13" fill="none" stroke="var(--good)" strokeWidth="2" />
            <text x={px(elbow) - 16} y={py(sseAt(elbow)) - 14} textAnchor="end" className="elbowTag" fill="var(--good)">
              elbow
            </text>
          </g>
        )}
        {curve.map((c) => (
          <g key={c.k}>
            <circle
              cx={px(c.k)}
              cy={py(c.sse)}
              r={c.k === k ? 6 : 4.5}
              fill={c.k === k ? 'var(--rust)' : 'var(--blue)'}
              stroke="var(--paper-card)"
              strokeWidth="2"
            />
            {c.k === k && (
              <text x={px(c.k)} y={py(c.sse) - 12} textAnchor="middle" className="elbowTag" fill="var(--ink)">
                your K
              </text>
            )}
            <rect
              x={px(c.k) - plotW / (maxK - 1) / 2}
              y={EPAD.t}
              width={plotW / (maxK - 1)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverK(c.k)}
            />
          </g>
        ))}
      </svg>
      <p className="elbowReadout" aria-live="polite">
        {hovered
          ? `K = ${hovered.k}: total spread ${hovered.sse.toFixed(2)}${prevOfHovered !== null && prevOfHovered !== undefined ? `, ${(prevOfHovered - hovered.sse).toFixed(2)} less than K = ${hovered.k - 1}` : ''}`
          : 'Hover over the chart to read each value.'}
      </p>
      {!revealed ? (
        <>
          <p className="note">Where does the curve bend?</p>
          <div className="elbowChoices">
            {curve.slice(1, -1).map((c) => (
              <button key={c.k} type="button" className="guessBtn" onClick={() => setGuess(c.k)}>
                K = {c.k}
              </button>
            ))}
            <button type="button" className="btnG" onClick={() => setGuess('skip')}>
              Show me
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`annotation ${feedback.cls}`}>
            <span className="tag">{feedback.tag}</span>
            {feedback.text} The elbow is a rule of thumb, not a guarantee: always check whether the clusters make
            sense for your problem.
          </div>
          {elbow !== k && K_OPTIONS.includes(elbow) && (
            <button type="button" className="btnP" onClick={() => onTryK(elbow)}>
              Run again with K = {elbow}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function KMeansStages({ onStepsChange, onStateDescription, onExperiment } = {}) {
  const [stage, setStage] = useSessionState('mlx.k-means.stage', 'table', (v) => STAGE_KEYS.includes(v))
  const [k, setK] = useSessionState('mlx.k-means.k', 2, (v) => K_OPTIONS.includes(v))

  // Data source: the built-in example, or points the learner supplied.
  const [storedSource, setSource] = useSessionState(
    'mlx.k-means.source',
    'example',
    (v) => v === 'example' || v === 'custom',
  )
  const [customPoints, setCustomPoints] = useSessionState('mlx.k-means.customPoints', [], isPointList)
  const [savedIter, setSavedIter] = useSessionState(
    'mlx.k-means.iter',
    0,
    (v) => Number.isInteger(v) && v >= 0 && v <= MAX_ITERS,
  )
  // Saved custom data only counts if it still passes validation.
  const source = storedSource === 'custom' && validatePoints(customPoints, k) === null ? 'custom' : 'example'
  const isExample = source === 'example'
  const points = isExample ? POINTS : customPoints

  const [editing, setEditing] = useState(!isExample)
  const [draftRows, setDraftRows] = useState(() =>
    isExample
      ? Array.from({ length: MIN_POINTS }, () => ({ x: '', y: '' }))
      : customPoints.map((p) => ({ x: String(p[0]), y: String(p[1]) })),
  )
  const [draftDirty, setDraftDirty] = useState(false)
  const [dataError, setDataError] = useState('')
  const [dataInfo, setDataInfo] = useState('')

  // Restore by replaying from the seeded centres up to the saved iteration.
  const [restored] = useState(() => replaySim(points, k, isExample, savedIter))
  const [sim, setSim] = useState(restored.sim)
  const [running, setRunning] = useState(false)
  const [annotation, setAnnotation] = useState(restored.annotation)
  const [awaitingGuess, setAwaitingGuess] = useState(false)
  const [focusIdx, setFocusIdx] = useState(null)
  const [reflectPick, setReflectPick] = useState(null)
  const [visited, setVisited] = useState(() => Array.from({ length: savedIter + 1 }, (_, i) => i))

  const simRef = useRef(sim)
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
  const timerRef = useRef(null)
  const fileRef = useRef(null)

  const spread = useMemo(() => totalSpread(points, sim), [points, sim])
  // The run is deterministic from the seeded centres, so the first iteration's spread is the same every time.
  const sseFirst = useMemo(() => totalSpread(points, replaySim(points, k, isExample, 1).sim), [points, k, isExample])
  const distinctCount = useMemo(() => countDistinct(points), [points])
  const bounds = useMemo(() => (isExample ? EXAMPLE_BOUNDS : computeBounds(points)), [isExample, points])
  const scale = useMemo(
    () => makeScale(bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax, 44, 16, 14, 36, 560, 340),
    [bounds],
  )

  useEffect(() => {
    simRef.current = sim
  }, [sim])

  useEffect(() => {
    onExperimentRef.current = onExperiment
  }, [onExperiment])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    onStepsChange?.(sim.iter)
  }, [sim.iter, onStepsChange])

  useEffect(() => {
    setSavedIter(sim.iter)
  }, [sim.iter, setSavedIter])

  useEffect(() => {
    const finished = sim.converged ? ' Converged.' : sim.limit ? ` Stopped at the ${MAX_ITERS} iteration limit.` : ''
    onStateDescription?.(
      `Stage "${stage}". K = ${k}. ${points.length} points (${isExample ? 'example data' : 'learner-supplied data'}). Iteration ${sim.iter}.${finished} ${running ? 'Auto-running.' : 'Paused.'}`,
    )
  }, [stage, k, points.length, isExample, sim.iter, sim.converged, sim.limit, running, onStateDescription])

  // Any change of data or K starts the simulation again from the seeded centres.
  function resetAll(pts, kk, example) {
    clearTimeout(timerRef.current)
    const fresh = makeInitialSim(pts, kk, example)
    simRef.current = fresh
    reportedRef.current = false
    setSoundNote('')
    setSim(fresh)
    setVisited([0])
    setRunning(false)
    setAwaitingGuess(false)
    setFocusIdx(null)
    setReflectPick(null)
    setAnnotation({ html: 'Press "Step forward" to begin.', kind: null })
  }

  function changeK(newK) {
    setK(newK)
    resetAll(points, newK, isExample)
  }

  function applyPoints(pts, info) {
    const error = validatePoints(pts, k)
    if (error) {
      setDataError(error)
      setDataInfo('')
      return false
    }
    setCustomPoints(pts)
    setSource('custom')
    setDraftDirty(false)
    setDataError('')
    setDataInfo(info || `Using ${pts.length} points.`)
    resetAll(pts, k, false)
    return true
  }

  function useExample() {
    setSource('example')
    setEditing(false)
    setDataError('')
    setDataInfo('')
    resetAll(POINTS, k, true)
  }

  function updateDraft(index, field, value) {
    setDraftRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
    setDraftDirty(true)
    setDataInfo('')
  }

  function addDraftRow() {
    setDraftRows((rows) => (rows.length >= MAX_POINTS ? rows : [...rows, { x: '', y: '' }]))
    setDraftDirty(true)
  }

  function removeDraftRow(index) {
    setDraftRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)))
    setDraftDirty(true)
    setDataInfo('')
  }

  function applyDraft() {
    const pts = []
    for (let i = 0; i < draftRows.length; i += 1) {
      const rawX = draftRows[i].x.trim()
      const rawY = draftRows[i].y.trim()
      if (rawX === '' && rawY === '') continue
      const x = Number(rawX)
      const y = Number(rawY)
      if (rawX === '' || rawY === '' || !Number.isFinite(x) || !Number.isFinite(y)) {
        setDataError(`Row ${i + 1}: enter a number in both x and y, or leave the row empty.`)
        setDataInfo('')
        return
      }
      pts.push([x, y])
    }
    applyPoints(pts)
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setDataError('That file is too large. Please use a CSV with at most 200 rows.')
      setDataInfo('')
      return
    }
    let text
    try {
      text = await file.text()
    } catch {
      setDataError('Could not read that file. Please try again.')
      setDataInfo('')
      return
    }
    const { points: pts, skipped } = parseTwoColumnCsv(text)
    const note = skipped
      ? ` Ignored ${skipped} line${skipped === 1 ? '' : 's'} that were not two numbers (such as a header row).`
      : ''
    if (applyPoints(pts, `Loaded ${pts.length} points from ${file.name}.${note}`)) {
      setDraftRows(pts.map((p) => ({ x: String(p[0]), y: String(p[1]) })))
    } else if (skipped) {
      setDataError((msg) => `${msg}${note}`)
    }
  }

  function startCentres() {
    resetAll(points, k, isExample)
    setAnnotation({
      html: 'Press "Step forward" to begin. Watch which point you are asked to predict for.',
      kind: null,
    })
    setStage('centres')
  }

  function beginStepping() {
    setStage('stepping')
  }

  // One tone per iteration: pitch rises with total spread relative to the first iteration.
  function playFor(next) {
    if (!soundOnRef.current || next.iter === 0) return
    try {
      const sse = totalSpread(points, next)
      if (sse === null) return
      if (!sonifierRef.current) sonifierRef.current = createSonifier()
      const freq = Math.min(1500, sseFirst > 0 ? 196 * 2 ** ((2 * sse) / sseFirst) : 196)
      sonifierRef.current.playStep({ freq, pan: 0 })
      if (next.converged) sonifierRef.current.playResolve()
      setSoundNote(
        `Sound played: total spread ${sse.toFixed(2)}, pitch ${Math.round(freq)} Hz.${next.converged ? ' The clusters stopped changing: the two-note chime played.' : ''}`,
      )
    } catch {
      // sound is optional
    }
  }

  function doStep(guess, idx) {
    const result = computeStep(points, simRef.current, guess, idx)
    simRef.current = result.sim
    setSim(result.sim)
    setAnnotation(result.annotation)
    playFor(result.sim)
    setVisited((v) => (v.includes(result.sim.iter) ? v : [...v, result.sim.iter]))
    // Only runs the learner started themselves end up here (jumps and restores replay elsewhere).
    if (result.sim.done && !reportedRef.current) {
      reportedRef.current = true
      const next = result.sim
      const sizes = next.centroids.map((_, i) => next.assign.filter((a) => a === i).length)
      const outcome = next.converged
        ? `converged in ${next.iter} iterations`
        : `stopped at the ${MAX_ITERS} iteration limit without converging`
      onExperimentRef.current?.(
        `K=${k}, ${isExample ? 'example data' : 'own data'}, ${points.length} points: ${outcome}, total spread ${totalSpread(points, next).toFixed(1)}, cluster sizes ${sizes.join(', ')}`,
      )
    }
    return result.sim.done
  }

  function handleJump(target) {
    clearTimeout(timerRef.current)
    setRunning(false)
    setAwaitingGuess(false)
    setFocusIdx(null)
    setReflectPick(null)

    // Replay from the same seeded centres every time.
    const { sim: next, annotation: note } = replaySim(points, k, isExample, target)
    simRef.current = next
    setSim(next)
    setAnnotation(note)
    playFor(next)
    setVisited((v) => (v.includes(target) ? v : [...v, target]))
  }

  function handleStepClick() {
    const idx = focusIndexForIter(simRef.current.iter, points.length)
    setFocusIdx(idx)
    setAwaitingGuess(true)
  }

  function handleGuess(colorIdx) {
    setAwaitingGuess(false)
    doStep(colorIdx, focusIdx)
    setFocusIdx(null)
  }

  function handleRun() {
    if (running || simRef.current.done) return
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
    resetAll(points, k, isExample)
  }

  function startOver() {
    clearTimeout(timerRef.current)
    setStage('group')
    setReflectPick(null)
  }

  // ---------- stage: table (get familiar with the raw data first) ----------
  if (stage === 'table') {
    const canContinue = !editing || (source === 'custom' && !draftDirty)
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
          <div className="btnCol">
            {editing ? (
              <button className="btnG" onClick={useExample}>
                Back to the example data
              </button>
            ) : (
              <button className="btnG" onClick={() => setEditing(true)}>
                Use your own data
              </button>
            )}
          </div>
          <div className="stageActions">
            <button className="btnP" onClick={() => setStage('group')} disabled={!canContinue}>
              Now plot these on a graph
            </button>
          </div>
          {editing && !canContinue && (
            <p className="note">Press "Use these points" first so your data is checked.</p>
          )}
        </div>
        <div className="kmeans-main">
          {!editing ? (
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
          ) : (
            <div className="dataEditor">
              <p className="note">
                Enter {MIN_POINTS} to {MAX_POINTS} points, or upload a CSV file whose first two columns are x and y. A
                header row and any line that is not two numbers is ignored. You need at least {k} distinct points for
                K = {k}.
              </p>
              <div className="dataTableWrap">
                <table className="exampleTable dataTable">
                  <thead>
                    <tr>
                      <th>Point</th>
                      <th>x</th>
                      <th>y</th>
                      <th>
                        <span className="srOnly">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row, i) => (
                      <tr key={i}>
                        <td>#{i + 1}</td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Point ${i + 1} x`}
                            value={row.x}
                            onChange={(e) => updateDraft(i, 'x', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Point ${i + 1} y`}
                            value={row.y}
                            onChange={(e) => updateDraft(i, 'y', e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btnG rowBtn"
                            onClick={() => removeDraftRow(i)}
                            disabled={draftRows.length <= 1}
                            aria-label={`Remove point ${i + 1}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="editorActions">
                <button type="button" className="btnG" onClick={addDraftRow} disabled={draftRows.length >= MAX_POINTS}>
                  Add row
                </button>
                <button type="button" className="btnG" onClick={() => fileRef.current && fileRef.current.click()}>
                  Upload CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={handleFile} hidden />
                <button type="button" className="btnP" onClick={applyDraft}>
                  Use these points
                </button>
              </div>
              {dataError && (
                <p className="errorMsg" role="alert">
                  {dataError}
                </p>
              )}
              {dataInfo && !dataError && <p className="okMsg">{dataInfo}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------- stage: group (choose K) ----------
  if (stage === 'group') {
    let kNote
    if (isExample && k === 2) {
      kNote = 'Two groups looks like a fair call here, there does seem to be a cluster bottom-left and one top-right.'
    } else if (isExample) {
      kNote = `${k} groups is more than the two clusters that stand out visually. Let's see what K-Means does with the extra ones.`
    } else {
      kNote = `K-Means will split your data into exactly ${k} groups, whether or not that matches its natural shape.`
    }
    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">
            You just saw this as a table of numbers. Here it is plotted as a graph instead, {points.length} points, no
            groups yet. How would you group them?
          </p>
          <p className="note">Pick how many groups (K) feels natural to you.</p>
          <div className="choiceRow">
            {K_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`guessBtn${k === opt ? ' active' : ''}`}
                onClick={() => changeK(opt)}
                disabled={distinctCount < opt}
                title={distinctCount < opt ? `Your data has only ${distinctCount} distinct points` : undefined}
              >
                {opt} groups
              </button>
            ))}
          </div>
          <p className="note">
            K is a hyperparameter. Try 2, 3 and 4 and watch what changes. After the run, an elbow plot shows how good
            your choice was.
          </p>
          {distinctCount < Math.max(...K_OPTIONS) && (
            <p className="note">Larger K values need more distinct points than your data has.</p>
          )}
          <div className="stageActions">
            <button className="btnP" onClick={startCentres}>
              Continue
            </button>
          </div>
        </div>
        <div className="kmeans-main">
          <div className="chartRow">
            <span className="chartTitle">{points.length} points, no groups yet</span>
          </div>
          <ChartFrame scale={scale} bounds={bounds}>
            <PointDots points={points} scale={scale} assign={points.map(() => null)} />
          </ChartFrame>
          <div className="annotation">{kNote}</div>
        </div>
      </div>
    )
  }

  // ---------- stage: centres ----------
  if (stage === 'centres') {
    let centreNote
    if (isExample && k === 2) {
      centreNote = 'Both starting centres here are placed close together on purpose, instead of one near each group.'
    } else if (isExample) {
      centreNote = `The first centre starts at (1.5, 1.5). Each further centre is placed on the point farthest from the centres already chosen.`
    } else {
      centreNote = `The first centre starts on your first point. Each further centre is placed on the point farthest from the centres already chosen.`
    }
    return (
      <div className="kmeans">
        <div className="kmeans-controls">
          <p className="storyText">
            What you're setting up is called <b>K-Means Clustering</b>. Before it can assign anything, it needs some
            starting centres.
          </p>
          <p className="note">{centreNote}</p>
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
            <span className="chartTitle">{`${points.length} points, ${k} starting centres`}</span>
          </div>
          <ChartFrame scale={scale} bounds={bounds}>
            <PointDots points={points} scale={scale} assign={points.map(() => null)} />
            <CentroidMarks scale={scale} centroids={sim.centroids} />
          </ChartFrame>
          <Legend k={k} />
          <div className="annotation">
            Where a centre starts can matter. Watch what happens once assignment begins.
          </div>
        </div>
      </div>
    )
  }

  // ---------- stage: distance (formal assignment rule, worked example) ----------
  if (stage === 'distance') {
    const p0 = points[0]
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
    <div className="kmeans kmeans--with-nav">
      <div className="kmeans-controls">
        <p className="note">
          {isExample ? 'Dataset: example data.' : 'Dataset: your own data.'} K = {k}.
        </p>
        {!awaitingGuess ? (
          <div className="btnCol">
            <button className="btnP" onClick={handleStepClick} disabled={sim.done || running}>
              Step forward
            </button>
            <button className="btnG" onClick={handleRun} disabled={sim.done || running}>
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
                <MarkerIcon index={i} />
                <span className="guessLabel">
                  Cluster {i + 1} ({SHAPES[i]})
                </span>
              </button>
            ))}
          </div>
        )}
        <SoundToggle
          checked={soundOn}
          onChange={setSoundOn}
          legend="Higher pitch means more total spread. A two-note chime means the clusters stopped changing."
          status={soundNote}
        />
      </div>

      <div className="kmeans-main">
        <div className="chartRow">
          <span className="chartTitle">{`${points.length} points, ${k} clusters`}</span>
          <div className="readouts">
            {sim.limit && <span>Stopped at the {MAX_ITERS} iteration limit</span>}
            <span>
              Total spread (SSE) <b>{spread === null ? '' : spread.toFixed(2)}</b>
            </span>
            <span>
              Iteration <b>{sim.iter}</b>
            </span>
          </div>
        </div>

        <ChartFrame scale={scale} bounds={bounds}>
          <PointDots points={points} scale={scale} assign={sim.assign} highlightIdx={awaitingGuess ? focusIdx : null} />
          <CentroidMarks scale={scale} centroids={sim.centroids} />
        </ChartFrame>
        <Legend k={k} />

        {annotation && (
          <div
            className={`annotation${annotation.kind ? ` ${annotation.kind}` : ''}`}
            dangerouslySetInnerHTML={{ __html: annotation.html }}
          />
        )}

        {sim.done && (
          <div className="reflectBox">
            <p className="sectionLabel">What just happened</p>
            <ol className="termList">
              <li>Started with {points.length} points and no groups</li>
              <li>
                Chose K = {k}
              </li>
              <li>Placed {k} starting centres</li>
              <li>Assigned every point to its nearest centre</li>
              <li>Moved each centre to the average of its own points</li>
              <li>
                {sim.converged
                  ? 'Repeated assign and update until nothing changed'
                  : `Repeated assign and update until the ${MAX_ITERS} iteration limit, when the centres were still moving`}
              </li>
            </ol>
            <ElbowPanel points={points} isExample={isExample} k={k} onTryK={changeK} />
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

      <IterationNav current={sim.iter} visited={visited} onJump={handleJump} />
    </div>
  )
}

function KMeans(props) {
  return (
    <>
      <KMeansStages {...props} />
      <GoFurtherPanel topic="kmeans" />
    </>
  )
}

export default KMeans
