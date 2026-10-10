import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TeacherWorkspaceLayout from './TeacherWorkspaceLayout.jsx'
import TeacherDatasetSelector from './TeacherDatasetSelector.jsx'
import TeacherPlaybackControls from './TeacherPlaybackControls.jsx'
import TeacherExplanationPanel from './TeacherExplanationPanel.jsx'
import TeacherCodeEditor from './TeacherCodeEditor.jsx'
import TeacherConceptWhiteboard from './TeacherConceptWhiteboard.jsx'
import { explainGDPoint } from './teacherConceptExplainer.jsx'
import { GD_CODE, GD_CODE_MAPPINGS } from './teacherAlgorithmCode.js'
import './TeacherGradientDescent.css'

// Preset Datasets
const SAMPLE_PRESETS = [
  {
    id: 'housing',
    name: 'Housing Prices (Standard 10 points)',
    col1: 'Area (100 sq ft)',
    col2: 'Price (₹ lakh)',
    points: [
      { x: 1, y: 2.1 },
      { x: 2, y: 2.9 },
      { x: 3, y: 4.2 },
      { x: 4, y: 4.8 },
      { x: 5, y: 6.1 },
      { x: 6, y: 6.9 },
      { x: 6.5, y: 7.3 },
      { x: 7, y: 7.8 },
      { x: 8, y: 8.6 },
      { x: 9, y: 9.4 },
    ],
  },
  {
    id: 'steep',
    name: 'Steep Growth Trend',
    col1: 'Hours Studied',
    col2: 'Exam Marks',
    points: [
      { x: 1, y: 1.5 },
      { x: 2, y: 3.2 },
      { x: 3, y: 4.9 },
      { x: 4, y: 6.8 },
      { x: 5, y: 8.5 },
      { x: 6, y: 10.2 },
      { x: 7, y: 12.1 },
      { x: 8, y: 13.9 },
    ],
  },
  {
    id: 'noisy',
    name: 'High Variance (Noisy Data)',
    col1: 'Marketing Spend ($k)',
    col2: 'Sales ($k)',
    points: [
      { x: 1, y: 3.0 },
      { x: 2, y: 1.8 },
      { x: 3, y: 5.5 },
      { x: 4, y: 3.9 },
      { x: 5, y: 7.2 },
      { x: 6, y: 5.4 },
      { x: 7, y: 8.9 },
      { x: 8, y: 7.1 },
      { x: 9, y: 10.5 },
    ],
  },
]

const GD_MAX_STEPS = 60
const GD_CONVERGE = 0.01

function starPoints(cx, cy) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 8 : 3.5
    const a = Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const LR_PRESETS = [
  { label: 'Small (0.05)', lr: 0.05, desc: 'Slow convergence; tiny timid steps' },
  { label: 'Appropriate (0.30)', lr: 0.3, desc: 'Rapid, smooth downhill descent' },
  { label: 'Very Large (0.95)', lr: 0.95, desc: 'Overshooting & oscillation across valley!' },
]

const GD_STEPS = [
  {
    key: 'initial_param',
    title: 'Initial Parameters',
    short: 'Arbitrary starting guess (b₁, b₀)',
    what: 'We place parameters (b₁, b₀) at a starting location on the error landscape. The error is high.',
    why: 'Optimization begins from an initial guess. The model has no prior knowledge of where the valley bottom lies.',
    talkingPoint: 'Point out the starting position on the heatmap and the corresponding poorly-fitting line on the mini chart.',
  },
  {
    key: 'calculate_loss',
    title: 'Compute Loss',
    short: 'Measuring cost at current position',
    what: 'We compute Mean Squared Error (MSE) for the current (b₁, b₀). Darker blue represents higher error.',
    why: 'Loss quantifies how far our current parameter choices are from explaining the data.',
    talkingPoint: 'The loss surface is like a 2D bowl. The goal is to roll down to the lowest depression.',
  },
  {
    key: 'calculate_gradient',
    title: 'Measure Gradient',
    short: 'Finding direction of steepest ascent (∇J)',
    what: 'The gradient vector ∇J = [∂J/∂b₁, ∂J/∂b₀] points uphill toward steepest error increase.',
    why: 'Calculus mathematically identifies the direction of maximal climb. Opposing it (−∇J) leads steepest downhill.',
    talkingPoint: 'Emphasize the golden rule: The gradient points uphill. We must step in the negative gradient direction.',
  },
  {
    key: 'parameter_update',
    title: 'Parameter Step',
    short: 'w_new = w_old − α · ∇J',
    what: 'Parameters take a downhill step scaled by the learning rate (α). The green arrow shows the actual step.',
    why: 'This step guarantees reduced loss as long as the learning rate is not excessively large.',
    talkingPoint: 'Notice how the step size combines the steepness of the terrain with the learning rate.',
  },
  {
    key: 'recalculate_loss',
    title: 'Error Decrease',
    short: 'Verified error drop (ΔMSE)',
    what: 'At the new coordinates, the line adjusts and the MSE drops. The marker shifts toward lighter terrain.',
    why: 'Verifies progress: one iteration of gradient descent has successfully decreased cost.',
    talkingPoint: 'Note how the line on the right rotated closer to the data scatter.',
  },
  {
    key: 'repeat',
    title: 'Iterative Trajectory',
    short: 'Continuous descent down the landscape',
    what: 'The update repeats across successive iterations. The rust trail plots the exact path taken down the error surface.',
    why: 'Gradient descent navigates complex terrains step-by-step until the slope levels out.',
    talkingPoint: 'Steps naturally become smaller near the bottom because the gradient magnitude shrinks.',
  },
  {
    key: 'convergence',
    title: 'Convergence',
    short: 'Reached the bowl minimum (OLS fit)',
    what: 'The parameter settles at the gold star (global minimum). Gradient is near zero (||∇J|| ≈ 0).',
    why: 'At the bottom of the bowl, slope is zero. The optimization has converged to the best possible model.',
    talkingPoint: 'In deep learning, models with billions of parameters follow this same fundamental rule.',
  },
]

function TeacherGradientDescent() {
  // Dataset State
  const [selectedPresetId, setSelectedPresetId] = useState('housing')
  const [isCustomCsv, setIsCustomCsv] = useState(false)
  const [csvData, setCsvData] = useState(null)
  const [colX, setColX] = useState('')
  const [colY, setColY] = useState('')

  // Active Points
  const activeData = useMemo(() => {
    if (isCustomCsv && csvData && colX && colY) {
      const validPoints = []
      csvData.rows.forEach((row) => {
        const x = Number(row[colX])
        const y = Number(row[colY])
        if (Number.isFinite(x) && Number.isFinite(y)) {
          validPoints.push({ x, y })
        }
      })
      return {
        points: validPoints,
        colX,
        colY,
      }
    }
    const preset = SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || SAMPLE_PRESETS[0]
    return {
      points: preset.points,
      colX: preset.col1,
      colY: preset.col2,
    }
  }, [isCustomCsv, csvData, colX, colY, selectedPresetId])

  // Normalization & OLS for active data
  const stats = useMemo(() => {
    const pts = activeData.points
    const n = Math.max(1, pts.length)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const meanX = xs.reduce((a, b) => a + b, 0) / n
    const meanY = ys.reduce((a, b) => a + b, 0) / n
    const stdX = Math.sqrt(xs.reduce((s, x) => s + (x - meanX) ** 2, 0) / n) || 1
    const stdY = Math.sqrt(ys.reduce((s, y) => s + (y - meanY) ** 2, 0) / n) || 1

    const sxy = pts.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0)
    const sxx = pts.reduce((s, p) => s + (p.x - meanX) ** 2, 0) || 1
    const olsB1 = sxy / sxx
    const olsB0 = meanY - olsB1 * meanX

    const xn = xs.map((x) => (x - meanX) / stdX)
    const yn = ys.map((y) => (y - meanY) / stdY)

    return {
      n,
      meanX,
      meanY,
      stdX,
      stdY,
      olsB1,
      olsB0,
      xn,
      yn,
    }
  }, [activeData.points])

  // Landscape coordinate bounds
  const B1_MIN = Number((stats.olsB1 - 1.8).toFixed(1))
  const B1_MAX = Number((stats.olsB1 + 1.8).toFixed(1))
  const B0_MIN = Number((stats.olsB0 - 5.0).toFixed(1))
  const B0_MAX = Number((stats.olsB0 + 5.0).toFixed(1))

  // MSE Function
  const calcMSE = useCallback(
    (b1Val, b0Val) => {
      const pts = activeData.points
      if (!pts || pts.length === 0) return 0
      let s = 0
      for (const p of pts) {
        const e = b1Val * p.x + b0Val - p.y
        s += e * e
      }
      return s / pts.length
    },
    [activeData.points],
  )

  // Gradient computation in normalized coordinates
  const calcGradNorm = useCallback(
    (mn, bn) => {
      let dm = 0
      let db = 0
      const n = stats.n
      for (let i = 0; i < n; i++) {
        const e = mn * stats.xn[i] + bn - stats.yn[i]
        dm += e * stats.xn[i]
        db += e
      }
      return [(2 * dm) / n, (2 * db) / n]
    },
    [stats],
  )

  const realFromNorm = useCallback(
    (mn, bn) => {
      const b1 = (mn * stats.stdY) / stats.stdX
      const b0 = stats.meanY - b1 * stats.meanX + bn * stats.stdY
      return [b1, b0]
    },
    [stats],
  )

  const normFromReal = useCallback(
    (b1, b0) => {
      const mn = (b1 * stats.stdX) / stats.stdY
      const bn = (b0 - stats.meanY + b1 * stats.meanX) / stats.stdY
      return [mn, bn]
    },
    [stats],
  )

  // Learning Rate
  const [learningRate, setLearningRate] = useState(0.3)

  // Teaching Mode & Split Focus (Default: Visual mode)
  const [teachingMode, setTeachingMode] = useState('visual')
  const [focusMode, setFocusMode] = useState('balanced')

  // Simulation State
  const initialPos = useMemo(() => {
    return [
      Number((stats.olsB1 - 1.2).toFixed(2)),
      Number((stats.olsB0 + 3.2).toFixed(1)),
    ]
  }, [stats.olsB1, stats.olsB0])

  const [stepIndex, setStepIndex] = useState(0)
  const [pos, setPos] = useState(initialPos)
  const [path, setPath] = useState([initialPos])
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [snapshot, setSnapshot] = useState(null) // Baseline snapshot comparison

  // Concept-First Interactive Whiteboard States
  const [selectedTrajectoryIndex, setSelectedTrajectoryIndex] = useState(null)

  // Reset to initial
  const resetToInit = useCallback(() => {
    setPos(initialPos)
    setPath([initialPos])
    setStepIndex(0)
    setIsPlaying(false)
    setSelectedTrajectoryIndex(null)
  }, [initialPos])

  // Single step descent
  const stepDescent = useCallback(
    (curB1, curB0, curPath) => {
      const [curMn, curBn] = normFromReal(curB1, curB0)
      const [curDm, curDb] = calcGradNorm(curMn, curBn)
      const nextMn = curMn - learningRate * curDm
      const nextBn = curBn - learningRate * curDb
      const [nextB1, nextB0] = realFromNorm(nextMn, nextBn)
      return {
        nextB1,
        nextB0,
        nextPath: [...curPath, [nextB1, nextB0]],
      }
    },
    [learningRate, normFromReal, calcGradNorm, realFromNorm],
  )

  // Step transitions
  const handleJumpStep = useCallback(
    (targetIdx) => {
      setStepIndex(targetIdx)
      if (targetIdx <= 2) {
        setPos(initialPos)
        setPath([initialPos])
      } else if (targetIdx === 3 || targetIdx === 4) {
        const { nextB1, nextB0, nextPath } = stepDescent(initialPos[0], initialPos[1], [initialPos])
        setPos([nextB1, nextB0])
        setPath(nextPath)
      } else if (targetIdx === 5) {
        let curB1 = initialPos[0]
        let curB0 = initialPos[1]
        let p = [initialPos]
        for (let i = 0; i < 4; i++) {
          const res = stepDescent(curB1, curB0, p)
          curB1 = res.nextB1
          curB0 = res.nextB0
          p = res.nextPath
        }
        setPos([curB1, curB0])
        setPath(p)
      } else if (targetIdx === 6) {
        // Keep taking real steps until the gradient is (almost) zero, or the step limit is reached.
        // A learning rate that is too large never converges, and the path shows it.
        let curB1 = initialPos[0]
        let curB0 = initialPos[1]
        let p = [initialPos]
        for (let i = 0; i < GD_MAX_STEPS; i++) {
          const [gm, gb] = calcGradNorm(...normFromReal(curB1, curB0))
          if (Math.hypot(gm, gb) < GD_CONVERGE || !Number.isFinite(gm) || Math.abs(curB1) > 1e6) break
          const res = stepDescent(curB1, curB0, p)
          curB1 = res.nextB1
          curB0 = res.nextB0
          p = res.nextPath
        }
        setPos([curB1, curB0])
        setPath(p)
      }
    },
    [initialPos, stepDescent, calcGradNorm, normFromReal],
  )

  // Current Parameters & Metrics
  const [b1, b0] = pos
  const currentMSE = useMemo(() => calcMSE(b1, b0), [calcMSE, b1, b0])
  const olsMSE = useMemo(() => calcMSE(stats.olsB1, stats.olsB0), [calcMSE, stats])

  const [mn, bn] = useMemo(() => normFromReal(b1, b0), [normFromReal, b1, b0])
  const [dm, db] = useMemo(() => calcGradNorm(mn, bn), [calcGradNorm, mn, bn])

  // Compute selected whiteboard explanation object
  const whiteboardObject = useMemo(() => {
    const targetIdx = selectedTrajectoryIndex !== null ? selectedTrajectoryIndex : path.length - 1
    const targetPoint = path[targetIdx] || pos
    const curB1 = targetPoint[0]
    const curB0 = targetPoint[1]
    const [tMn, tBn] = normFromReal(curB1, curB0)
    const [tDm, tDb] = calcGradNorm(tMn, tBn)
    const tMSE = calcMSE(curB1, curB0)

    return explainGDPoint(curB1, curB0, learningRate, tDm, tDb, tMSE, stats, targetIdx + 1)
  }, [selectedTrajectoryIndex, path, pos, normFromReal, calcGradNorm, calcMSE, learningRate, stats])

  const handleContourPointClick = (idx) => {
    setSelectedTrajectoryIndex(idx)
  }

  const handleClearSelection = () => {
    setSelectedTrajectoryIndex(null)
  }

  const handleQuickInspectPoint = () => {
    setSelectedTrajectoryIndex(path.length - 1)
  }

  const handleQuickInspectStep = () => {
    setSelectedTrajectoryIndex(0)
  }

  // Iteration-Level Playback (Projector-first classroom unit)
  const handleNextIteration = useCallback(() => {
    const curB1 = pos[0]
    const curB0 = pos[1]
    const res = stepDescent(curB1, curB0, path)
    setPos([res.nextB1, res.nextB0])
    setPath(res.nextPath)
    const [gm, gb] = calcGradNorm(...normFromReal(res.nextB1, res.nextB0))
    const settled = Math.hypot(gm, gb) < GD_CONVERGE
    setStepIndex(settled || res.nextPath.length > GD_MAX_STEPS ? 6 : 3)
  }, [pos, path, stepDescent, calcGradNorm, normFromReal])

  const handlePrevIteration = useCallback(() => {
    if (path.length > 2) {
      const newPath = path.slice(0, -1)
      const prevPos = newPath[newPath.length - 1]
      setPos(prevPos)
      setPath(newPath)
      setStepIndex(3)
    } else {
      resetToInit()
    }
  }, [path, resetToInit])

  // Teacher-Edited Python Code Execution Handler
  const handleRunTeacherCode = useCallback(
    (extracted) => {
      let lr = learningRate
      if (extracted.learning_rate !== undefined && Number.isFinite(extracted.learning_rate)) {
        lr = Number(extracted.learning_rate)
        setLearningRate(lr)
      }
      let curB1 = pos[0]
      let curB0 = pos[1]
      if (extracted.theta && Array.isArray(extracted.theta) && extracted.theta.length === 2) {
        ;[curB1, curB0] = realFromNorm(Number(extracted.theta[0]), Number(extracted.theta[1]))
        setPos([curB1, curB0])
        setPath([[curB1, curB0]])
      }
      const [curMn, curBn] = normFromReal(curB1, curB0)
      const [curDm, curDb] = calcGradNorm(curMn, curBn)
      const nextMn = curMn - lr * curDm
      const nextBn = curBn - lr * curDb
      const [nextB1, nextB0] = realFromNorm(nextMn, nextBn)
      setPos([nextB1, nextB0])
      setPath([[curB1, curB0], [nextB1, nextB0]])
      setStepIndex(3)
    },
    [learningRate, pos, normFromReal, calcGradNorm, realFromNorm],
  )

  const handleNext = () => {
    if (stepIndex < GD_STEPS.length - 1) {
      handleJumpStep(stepIndex + 1)
    } else {
      setIsPlaying(false)
    }
  }

  // Autoplay (Cycles iterations down the bowl)
  const timerRef = useRef(null)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return undefined
    }
    const intervalMs = Math.round(1500 / speed)
    timerRef.current = setInterval(() => {
      setStepIndex((cur) => {
        if (cur === 6) {
          setIsPlaying(false)
          return cur
        }
        return cur
      })
      handleNextIteration()
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, speed, handleNextIteration])

  // CSV Load Handler
  const handleCsvLoaded = (parsedResult) => {
    setCsvData(parsedResult)
    setIsCustomCsv(true)
    const numCols = parsedResult.numericColumns
    setColX(numCols[0] || parsedResult.headers[0])
    setColY(numCols[1] || numCols[0] || parsedResult.headers[1])
    resetToInit()
  }

  const handleResetToSample = () => {
    setIsCustomCsv(false)
    setCsvData(null)
    setSelectedPresetId('housing')
    resetToInit()
  }


  // Synchronized Code Mappings & Live Variables
  const activeMapping = GD_CODE_MAPPINGS[stepIndex] || GD_CODE_MAPPINGS[0]

  const gdLiveVariables = useMemo(() => {
    const stepSizeM = -learningRate * dm
    const stepSizeB = -learningRate * db
    const iterDisplay = stepIndex <= 2 ? 0 : stepIndex === 3 || stepIndex === 4 ? 1 : stepIndex === 5 ? 4 : path.length - 1

    return [
      { name: 'θ[0] (b₁)', value: b1.toFixed(3), highlight: stepIndex === 0 || stepIndex === 3 },
      { name: 'θ[1] (b₀)', value: b0.toFixed(2), highlight: stepIndex === 0 || stepIndex === 3 },
      { name: 'loss (MSE)', value: currentMSE.toFixed(3), highlight: stepIndex === 1 || stepIndex === 4 },
      { name: '∇J (grad)', value: `[${dm.toFixed(3)}, ${db.toFixed(3)}]`, highlight: stepIndex === 2 },
      { name: 'step (-α·∇)', value: `[${stepSizeM.toFixed(3)}, ${stepSizeB.toFixed(3)}]`, highlight: stepIndex === 3 },
      { name: 'α (lr)', value: learningRate.toFixed(2) },
      { name: 'target MSE', value: olsMSE.toFixed(2) },
      { name: 'iter', value: iterDisplay },
    ]
  }, [b1, b0, currentMSE, dm, db, learningRate, olsMSE, stepIndex, path.length])

  // Landscape scales
  const W = 460
  const H = 340
  const PAD = { l: 48, r: 20, t: 16, b: 38 }
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b

  const px = useCallback(
    (b1Val) => PAD.l + ((b1Val - B1_MIN) / (B1_MAX - B1_MIN)) * plotW,
    [B1_MIN, B1_MAX, PAD.l, plotW],
  )
  const py = useCallback(
    (b0Val) => PAD.t + plotH - ((b0Val - B0_MIN) / (B0_MAX - B0_MIN)) * plotH,
    [B0_MIN, B0_MAX, PAD.t, plotH],
  )

  // Gradient arrows
  const arrowScale = 20
  const gradArrowX = px(b1) + dm * arrowScale
  const gradArrowY = py(b0) - db * arrowScale
  const updateArrowX = px(b1) - dm * arrowScale * learningRate * 2.5
  const updateArrowY = py(b0) + db * arrowScale * learningRate * 2.5

  // Mini Chart mapping functions
  const pts = activeData.points
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 10)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 10)

  const MINI = { W: 210, H: 180, l: 28, r: 12, t: 14, b: 26 }
  const miniPw = MINI.W - MINI.l - MINI.r
  const miniPh = MINI.H - MINI.t - MINI.b
  const mx = (xVal) => MINI.l + ((xVal - minX) / (maxX - minX)) * miniPw
  const my = (yVal) => MINI.t + miniPh - ((yVal - minY) / (maxY - minY)) * miniPh

  const curStep = GD_STEPS[stepIndex]
  const isOvershooting = learningRate >= 0.9

  return (
    <TeacherWorkspaceLayout
      title="Gradient Descent Playground"
      subtitle="Demonstrate iterative loss minimization on an error landscape. Modify learning rate to see slow, smooth, or overshooting convergence."
      datasetSelector={
        <TeacherDatasetSelector
          samplePresets={SAMPLE_PRESETS}
          selectedPresetId={selectedPresetId}
          onSelectPreset={(id) => {
            setSelectedPresetId(id)
            setIsCustomCsv(false)
            resetToInit()
          }}
          isCustomCsv={isCustomCsv}
          csvData={csvData}
          onCsvLoaded={handleCsvLoaded}
          onResetToSample={handleResetToSample}
          col1Label="Feature (X)"
          col2Label="Target (Y)"
          selectedCol1={colX}
          selectedCol2={colY}
          onCol1Change={setColX}
          onCol2Change={setColY}
        />
      }
      visualization={
        <>
          <div className="tw-gd-vis-layout">
          {/* Left: 2D Error Surface */}
          <div>
            <div className="tw-vis-card-header" style={{ marginBottom: 6 }}>
              <div className="tw-vis-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Error Surface: J(b₁, b₀)
                {isOvershooting && <span className="tw-overshoot-badge">⚠️ Overshooting Active</span>}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                ★ = Global Minimum (OLS fit)
              </div>
            </div>

            <svg
              className="tw-gd-surface-svg"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label="Gradient descent error landscape"
            >
              <defs>
                <marker
                  id="arrow-grad"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--rust)" />
                </marker>
                <marker
                  id="arrow-update"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--good)" />
                </marker>
              </defs>

              {/* Surface grid contour representation */}
              <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} fill="var(--paper)" stroke="var(--line)" />
              {Array.from({ length: 6 }).map((_, i) => (
                <circle
                  key={i}
                  cx={px(stats.olsB1)}
                  cy={py(stats.olsB0)}
                  r={(i + 1) * 26}
                  fill="none"
                  stroke="var(--line)"
                  strokeDasharray="2 3"
                  opacity={0.8}
                />
              ))}

              {/* Axes */}
              <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MAX)} y2={py(B0_MIN)} stroke="var(--ink)" opacity="0.4" />
              <line x1={px(B1_MIN)} y1={py(B0_MIN)} x2={px(B1_MIN)} y2={py(B0_MAX)} stroke="var(--ink)" opacity="0.4" />

              <text className="tw-lr-label" x={PAD.l + plotW / 2} y={H - 10} textAnchor="middle">
                Slope (b₁)
              </text>
              <text className="tw-lr-label" x={14} y={PAD.t + plotH / 2} textAnchor="middle" transform={`rotate(-90 14 ${PAD.t + plotH / 2})`}>
                Intercept (b₀)
              </text>

              {/* Trajectory Path */}
              {path.length > 1 && (
                <>
                  <polyline
                    points={path.map(([pb1, pb0]) => `${px(pb1)},${py(pb0)}`).join(' ')}
                    fill="none"
                    stroke="var(--rust)"
                    strokeWidth="2.2"
                    strokeDasharray={isOvershooting ? '4 2' : 'none'}
                  />
                  {path.map(([pb1, pb0], i) => {
                    const isSelected = selectedTrajectoryIndex === i || (selectedTrajectoryIndex === null && i === path.length - 1)
                    return (
                      <g key={i}>
                        {isSelected && (
                          <circle
                            cx={px(pb1)}
                            cy={py(pb0)}
                            r={11}
                            fill="none"
                            stroke="var(--rust)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle cx={px(pb1)} cy={py(pb0)} r={isSelected ? 5.5 : 3.5} fill="var(--rust)" />
                        <circle
                          cx={px(pb1)}
                          cy={py(pb0)}
                          r={16}
                          fill="transparent"
                          cursor="pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContourPointClick(i)
                          }}
                        >
                          <title>{`Step #${i + 1}: b₁=${pb1.toFixed(2)}, b₀=${pb0.toFixed(2)}`}</title>
                        </circle>
                      </g>
                    )
                  })}
                </>
              )}

              {/* Global Optimum Star */}
              <polygon
                points={starPoints(px(stats.olsB1), py(stats.olsB0))}
                fill="#D9B44A"
                stroke="var(--ink)"
                strokeWidth="0.8"
              />

              {/* Baseline Snapshot Ghost Marker */}
              {snapshot && (
                <circle
                  cx={px(snapshot.b1)}
                  cy={py(snapshot.b0)}
                  r={7}
                  fill="none"
                  stroke="var(--rust)"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                >
                  <title>{`Baseline Snapshot (b₁=${snapshot.b1.toFixed(2)}, b₀=${snapshot.b0.toFixed(2)}, Loss=${snapshot.mse.toFixed(2)})`}</title>
                </circle>
              )}

              {/* Gradient Vectors (Step 2 & 3) */}
              {stepIndex >= 2 && (
                <>
                  <line
                    x1={px(b1)}
                    y1={py(b0)}
                    x2={gradArrowX}
                    y2={gradArrowY}
                    stroke="var(--rust)"
                    strokeWidth="2"
                    markerEnd="url(#arrow-grad)"
                  />
                  <line
                    x1={px(b1)}
                    y1={py(b0)}
                    x2={updateArrowX}
                    y2={updateArrowY}
                    stroke="var(--good)"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-update)"
                  />
                </>
              )}

              {/* Current Position */}
              <g
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleContourPointClick(path.length - 1)
                }}
              >
                <circle cx={px(b1)} cy={py(b0)} r={12} fill="none" stroke="var(--blue)" strokeWidth={2} strokeDasharray="3 2" />
                <circle cx={px(b1)} cy={py(b0)} r={7} fill="var(--blue)" stroke="#fff" strokeWidth={2} />
              </g>
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '11px', color: 'var(--muted)' }}>
              <span>Center = Minimum Error (Valley)</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--rust)' }}>➔ Gradient (Uphill)</span>
                <span style={{ color: 'var(--good)' }}>➔ Step (Downhill)</span>
              </div>
            </div>
          </div>

          {/* Right: Mini Fit View */}
          <div className="tw-gd-mini-card">
            <h5 className="tw-gd-mini-title">Physical Model Fit</h5>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              <code>ŷ = {b1.toFixed(2)}x + {b0.toFixed(2)}</code>
            </div>
            <svg className="tw-gd-mini-svg" viewBox={`0 0 ${MINI.W} ${MINI.H}`}>
              <line x1={mx(minX)} y1={my(minY)} x2={mx(maxX)} y2={my(minY)} stroke="#C9C1A8" />
              <line x1={mx(minX)} y1={my(minY)} x2={mx(minX)} y2={my(maxY)} stroke="#C9C1A8" />
              {activeData.points.map((p, i) => (
                <circle key={i} cx={mx(p.x)} cy={my(p.y)} r={3.2} fill="var(--ink)" />
              ))}
              {/* OLS line */}
              <line
                x1={mx(minX)}
                y1={my(stats.olsB1 * minX + stats.olsB0)}
                x2={mx(maxX)}
                y2={my(stats.olsB1 * maxX + stats.olsB0)}
                stroke="var(--good)"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              {/* Baseline Snapshot Ghost Model Line */}
              {snapshot && (
                <line
                  x1={mx(minX)}
                  y1={my(snapshot.b1 * minX + snapshot.b0)}
                  x2={mx(maxX)}
                  y2={my(snapshot.b1 * maxX + snapshot.b0)}
                  stroke="var(--rust)"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
              )}

              {/* Current Line */}
              <line
                x1={mx(minX)}
                y1={my(b1 * minX + b0)}
                x2={mx(maxX)}
                y2={my(b1 * maxX + b0)}
                stroke="var(--blue)"
                strokeWidth="2.2"
              />
            </svg>
            <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
              Green dashed = Target<br />
              Solid blue = Current
            </div>
          </div>
        </div>

        {/* Interactive ML Concept Whiteboard */}
        <TeacherConceptWhiteboard
          selectedObject={whiteboardObject}
          onClearSelection={handleClearSelection}
          onQuickInspectPoint={handleQuickInspectPoint}
          onQuickInspectCentroid={handleQuickInspectStep}
          algorithmType="gradient-descent"
        />
      </>
      }
      parameterControls={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Learning Rate Demo Presets */}
          <div className="tw-ctrl-group">
            <span className="tw-ctrl-label" style={{ fontWeight: 600 }}>
              Learning Rate (α):
            </span>
            <div className="tw-lr-presets-bar">
              {LR_PRESETS.map((p) => (
                <button
                  key={p.lr}
                  type="button"
                  className={`tw-lr-preset-btn ${learningRate === p.lr ? 'active' : ''}`}
                  onClick={() => {
                    setLearningRate(p.lr)
                    resetToInit()
                  }}
                  title={p.desc}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tw-divider" />

          {/* Continuous Slider */}
          <div className="tw-ctrl-group">
            <span className="tw-ctrl-label">α Slider:</span>
            <input
              type="range"
              min="0.02"
              max="1.1"
              step="0.02"
              value={learningRate}
              onChange={(e) => {
                setLearningRate(Number(e.target.value))
                resetToInit()
              }}
              style={{ width: 90, accentColor: 'var(--blue)' }}
            />
            <b>{learningRate.toFixed(2)}</b>
          </div>
        </div>
      }
      playbackControls={
        <TeacherPlaybackControls
          isPlaying={isPlaying}
          speed={speed}
          canPrev={path.length > 1 || stepIndex > 0}
          canNext={stepIndex < GD_STEPS.length - 1}
          onReset={resetToInit}
          onPrev={handlePrevIteration}
          onNext={handleNextIteration}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSpeedChange={setSpeed}
          nextLabel="Next Iteration"
          prevLabel="Prev"
          canStep={true}
          onStep={handleNext}
          stepLabel="Step Phase"
          statusPill={
            <span>
              Iteration <b>{stepIndex <= 2 ? 0 : stepIndex === 3 || stepIndex === 4 ? 1 : stepIndex === 5 ? 4 : path.length - 1}</b> · Loss <b>{currentMSE.toFixed(2)}</b> · α <b>{learningRate.toFixed(2)}</b>
            </span>
          }
        />
      }
      teachingMode={teachingMode}
      onTeachingModeChange={setTeachingMode}
      focusMode={focusMode}
      onFocusModeChange={setFocusMode}
      onTogglePlay={() => setIsPlaying((p) => !p)}
      onNext={handleNextIteration}
      onPrev={handlePrevIteration}
      onReset={resetToInit}
      snapshotBar={
        snapshot ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
            <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
              📌 Baseline: Loss={snapshot.mse.toFixed(2)} (α={snapshot.lr})
            </span>
            <span style={{ color: 'var(--muted)' }}>➔ Current: <b>{currentMSE.toFixed(2)}</b></span>
            <button
              type="button"
              className="tw-btn-chip"
              onClick={() => setSnapshot(null)}
              style={{ fontSize: '10.5px', padding: '1px 6px' }}
            >
              ✕ Clear
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="tw-btn-chip"
            onClick={() => setSnapshot({ b1, b0, mse: currentMSE, lr: learningRate })}
            title="Save baseline descent parameters to compare before and after changes"
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span>📌</span> Save Snapshot
          </button>
        )
      }
      codePanel={
        <TeacherCodeEditor
          algorithmType="gradient-descent"
          filename="gradient_descent.py"
          codeLines={GD_CODE}
          activeLineRange={activeMapping.lines}
          stepNumber={stepIndex + 1}
          totalSteps={GD_STEPS.length}
          stepLabel={activeMapping.label}
          liveVariables={gdLiveVariables}
          visualNotice={activeMapping.visualNotice}
          onRunCode={handleRunTeacherCode}
        />
      }
      statusExplanation={
        <TeacherExplanationPanel
          stepNumber={stepIndex + 1}
          totalSteps={GD_STEPS.length}
          stepTitle={curStep.title}
          shortSummary={curStep.short}
          whatIsHappening={curStep.what}
          whyItMatters={curStep.why}
          metrics={[
            { label: 'Slope', value: b1.toFixed(2) },
            { label: 'Intercept', value: b0.toFixed(1) },
            { label: 'MSE', value: currentMSE.toFixed(3) },
            { label: 'Target MSE', value: olsMSE.toFixed(2) },
            { label: 'LR (α)', value: learningRate.toFixed(2) },
          ]}
          talkingPoint={curStep.talkingPoint}
        />
      }
    />
  )
}

export default TeacherGradientDescent
