import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TeacherWorkspaceLayout from './TeacherWorkspaceLayout.jsx'
import TeacherDatasetSelector from './TeacherDatasetSelector.jsx'
import TeacherPlaybackControls from './TeacherPlaybackControls.jsx'
import TeacherExplanationPanel from './TeacherExplanationPanel.jsx'
import TeacherCodeEditor from './TeacherCodeEditor.jsx'
import TeacherConceptWhiteboard from './TeacherConceptWhiteboard.jsx'
import { explainLRPoint, explainLRTwoPoints, explainLRLine } from './teacherConceptExplainer.jsx'
import { LR_CODE, LR_CODE_MAPPINGS } from './teacherAlgorithmCode.js'
import './TeacherLinearRegression.css'

// Sample Presets
const SAMPLE_PRESETS = [
  {
    id: 'housing',
    name: 'Housing Prices (Standard 10 points)',
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
    xLabel: 'Area (100 sq ft)',
    yLabel: 'Price (₹ lakh)',
  },
  {
    id: 'steep',
    name: 'Steep Growth Trend',
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
    xLabel: 'Study Time (hours)',
    yLabel: 'Score (%)',
  },
  {
    id: 'noisy',
    name: 'High Variance (Noisy Data)',
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
    xLabel: 'Marketing Spend ($k)',
    yLabel: 'Sales Volume ($k)',
  },
  {
    id: 'outlier',
    name: 'Dataset with Outlier (Sensitivity Demo)',
    points: [
      { x: 1, y: 2.0 },
      { x: 2, y: 2.8 },
      { x: 3, y: 3.9 },
      { x: 4, y: 9.8 }, // Outlier point!
      { x: 5, y: 5.8 },
      { x: 6, y: 6.7 },
      { x: 7, y: 7.6 },
      { x: 8, y: 8.4 },
      { x: 9, y: 9.3 },
    ],
    xLabel: 'Square Footage (100s)',
    yLabel: 'Price (₹ lakh)',
  },
]

function computeOLS(points) {
  if (!points || points.length === 0) return { b1: 1, b0: 0, xbar: 0, ybar: 0 }
  const n = points.length
  const xbar = points.reduce((a, p) => a + p.x, 0) / n
  const ybar = points.reduce((a, p) => a + p.y, 0) / n
  let sxy = 0
  let sxx = 0
  for (const p of points) {
    sxy += (p.x - xbar) * (p.y - ybar)
    sxx += (p.x - xbar) ** 2
  }
  const b1 = sxx !== 0 ? sxy / sxx : 1
  const b0 = ybar - b1 * xbar
  return { b1, b0, xbar, ybar }
}

function computeMSE(points, b1, b0) {
  if (!points || points.length === 0) return 0
  let s = 0
  for (const p of points) {
    const e = b1 * p.x + b0 - p.y
    s += e * e
  }
  return s / points.length
}

// Gradient descent setup. The descent runs on standardised data (feature scaling), exactly as the
// code panel shows, so the same learning rate behaves the same way on any dataset or units.
const INIT_SLOPE_SCALED = 0
const INIT_INTERCEPT_SCALED = 0.5
const DEFAULT_LR = 0.2
const CONVERGE_GRAD = 0.01
const MAX_ITERS = 200

function computeScaling(points) {
  const n = points.length || 1
  const meanX = points.reduce((a, p) => a + p.x, 0) / n
  const meanY = points.reduce((a, p) => a + p.y, 0) / n
  const stdX = Math.sqrt(points.reduce((a, p) => a + (p.x - meanX) ** 2, 0) / n) || 1
  const stdY = Math.sqrt(points.reduce((a, p) => a + (p.y - meanY) ** 2, 0) / n) || 1
  const xs = points.map((p) => (p.x - meanX) / stdX)
  const ys = points.map((p) => (p.y - meanY) / stdY)
  return { meanX, meanY, stdX, stdY, xs, ys }
}

// Real-unit line (b1, b0) <-> scaled line (w, b).
function toScaled(s, b1, b0) {
  const w = (b1 * s.stdX) / s.stdY
  const b = (b0 + b1 * s.meanX - s.meanY) / s.stdY
  return [w, b]
}

function fromScaled(s, w, b) {
  const b1 = (w * s.stdY) / s.stdX
  const b0 = s.meanY + b * s.stdY - b1 * s.meanX
  return [b1, b0]
}

// grad_slope = (2/N) * sum(error * Xs), grad_intercept = (2/N) * sum(error)
function scaledGradient(s, w, b) {
  const n = s.xs.length || 1
  let gw = 0
  let gb = 0
  for (let i = 0; i < s.xs.length; i++) {
    const e = w * s.xs[i] + b - s.ys[i]
    gw += e * s.xs[i]
    gb += e
  }
  return [(2 / n) * gw, (2 / n) * gb]
}

// One real gradient descent update, returned in real units.
function gdStep(s, b1, b0, lr) {
  const [w, b] = toScaled(s, b1, b0)
  const [gw, gb] = scaledGradient(s, w, b)
  return fromScaled(s, w - lr * gw, b - lr * gb)
}

const LR_STEPS = [
  {
    key: 'dataset',
    title: 'Dataset & Scatter Plot',
    short: 'Observed empirical points (X, Y)',
    what: 'We observe a collection of paired data points (X, Y). Each point represents an input feature and its observed target outcome.',
    why: 'Supervised learning starts with empirical observations to find an underlying function for predicting unseen inputs.',
    talkingPoint: 'Looking at these points, does Y generally increase as X increases? Can a straight line model this relationship?',
  },
  {
    key: 'initial_model',
    title: 'Initial Model',
    short: 'Baseline hypothesis line: ŷ = b₁·x + b₀',
    what: 'We define an initial linear hypothesis. The starting parameters (slope and intercept) are arbitrary and not yet optimal.',
    why: 'Learning begins from a baseline hypothesis before iterative minimization adjusts it.',
    talkingPoint: 'Notice how the initial line misses most points. How should we measure its error?',
  },
  {
    key: 'predictions',
    title: 'Predictions',
    short: 'Projected values (ŷᵢ) along the line',
    what: 'For every input xᵢ, the model calculates ŷᵢ = b₁·xᵢ + b₀. These predictions lie directly on the line.',
    why: 'Predictions represent what the model estimates the outcome should be.',
    talkingPoint: 'Look at the blue prediction dots along the line comparing model estimates with actual values.',
  },
  {
    key: 'residuals',
    title: 'Residuals (Error)',
    short: 'Vertical gaps: eᵢ = yᵢ − ŷᵢ',
    what: 'The residual is the signed difference: eᵢ = yᵢ − ŷᵢ. Vertical lines connect ground truth to predictions.',
    why: 'Residuals provide the granular feedback signal needed to guide parameter updates.',
    talkingPoint: 'Notice both positive and negative residuals. If we just added them up, they would cancel out!',
  },
  {
    key: 'loss',
    title: 'Loss (MSE)',
    short: 'Mean Squared Error aggregated across all points',
    what: 'We square each residual and compute their average: MSE = (1/n) · Σ (yᵢ − ŷᵢ)². This penalizes large errors heavily.',
    why: 'Squaring eliminates cancellation and punishes outliers with large squared error area boxes.',
    talkingPoint: 'Notice how points far from the line create massive area boxes, dominating the total loss score.',
  },
  {
    key: 'update',
    title: 'Gradient Update',
    short: 'Adjusting slope and intercept against the gradient',
    what: 'Calculus gives the direction of steepest error increase. We adjust parameters in the opposite direction.',
    why: 'Mathematical gradients eliminate guesswork, telling the model which way to rotate and shift.',
    talkingPoint: 'Parameter updates follow: w_new = w_old − learning_rate × gradient.',
  },
  {
    key: 'new_model',
    title: 'Updated Model',
    short: 'Line shifts closer to points; MSE decreases',
    what: 'Parameters adjust. The line rotates and translates closer to the points, immediately reducing MSE.',
    why: 'Demonstrates the fundamental feedback loop of machine learning.',
    talkingPoint: 'Observe how the line tilts closer and the vertical error bars shrink.',
  },
  {
    key: 'repeat',
    title: 'Iterative Refinement',
    short: 'Successive descent steps refining parameters',
    what: 'Predict → Compute Error → Measure Gradients → Update Parameters. Each step refines the fit.',
    why: 'Iterative descent reliably steps downhill towards minimal error.',
    talkingPoint: 'As the line gets closer to optimal, the residuals shrink and gradients naturally become smaller.',
  },
  {
    key: 'convergence',
    title: 'Convergence',
    short: 'Optimal fit reached; gradient is zero',
    what: 'The parameters reach the minimum error where the gradient is zero. The line matches analytical Ordinary Least Squares (OLS).',
    why: 'At convergence, no slight adjustment to slope or intercept can further reduce the error.',
    talkingPoint: 'Compare this line with the analytical green OLS line—they coincide perfectly.',
  },
]

function TeacherLinearRegression() {
  // Dataset State (Preset or Custom CSV)
  const [selectedPresetId, setSelectedPresetId] = useState('housing')
  const [isCustomCsv, setIsCustomCsv] = useState(false)
  const [csvData, setCsvData] = useState(null)
  const [colX, setColX] = useState('')
  const [colY, setColY] = useState('')

  // Active Points & Labels
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
        xLabel: colX,
        yLabel: colY,
      }
    }
    const preset = SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || SAMPLE_PRESETS[0]
    return {
      points: preset.points,
      xLabel: preset.xLabel,
      yLabel: preset.yLabel,
    }
  }, [isCustomCsv, csvData, colX, colY, selectedPresetId])

  const ols = useMemo(() => computeOLS(activeData.points), [activeData.points])
  // Scaling statistics: gradient descent runs on standardised data (the same as the code panel shows).
  const scaling = useMemo(() => computeScaling(activeData.points), [activeData.points])

  // Teaching Mode & Split Focus (Default: Visual mode)
  const [teachingMode, setTeachingMode] = useState('visual')
  const [focusMode, setFocusMode] = useState('balanced')

  // Simulation State (b1, b0 are always stored in the dataset's real units)
  const initialParams = useMemo(() => fromScaled(scaling, INIT_SLOPE_SCALED, INIT_INTERCEPT_SCALED), [scaling])
  const [stepIndex, setStepIndex] = useState(0)
  const [b1, setB1] = useState(initialParams[0])
  const [b0, setB0] = useState(initialParams[1])
  const [learningRate, setLearningRate] = useState(DEFAULT_LR)
  const [iteration, setIteration] = useState(0)
  const [history, setHistory] = useState([]) // previous [b1, b0] pairs, so Prev restores the true previous state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [snapshot, setSnapshot] = useState(null) // Baseline snapshot comparison

  // Concept-First Interactive Whiteboard States
  const [selectedPointIndex, setSelectedPointIndex] = useState(null)
  const [selectedPointBIndex, setSelectedPointBIndex] = useState(null)
  const [selectedLine, setSelectedLine] = useState(false)

  // Auxiliary toggles
  const [showResiduals, setShowResiduals] = useState(true)
  const [showPredictions, setShowPredictions] = useState(true)
  const [showSquareBoxes, setShowSquareBoxes] = useState(false)
  const [showOlsTarget, setShowOlsTarget] = useState(false)

  const setParams = useCallback((nb1, nb0) => {
    setB1(nb1)
    setB0(nb0)
  }, [])

  const resetModelToInit = useCallback(() => {
    setParams(initialParams[0], initialParams[1])
    setStepIndex(0)
    setIteration(0)
    setHistory([])
    setIsPlaying(false)
    setSelectedPointIndex(null)
    setSelectedPointBIndex(null)
    setSelectedLine(false)
  }, [initialParams, setParams])

  // Whenever the dataset changes, start again from the new dataset's starting line.
  useEffect(() => {
    resetModelToInit()
  }, [resetModelToInit])

  // CSV Load Handler
  const handleCsvLoaded = (parsedResult) => {
    setCsvData(parsedResult)
    setIsCustomCsv(true)
    const numCols = parsedResult.numericColumns
    const c1 = numCols[0] || parsedResult.headers[0]
    const c2 = numCols[1] || numCols[0] || parsedResult.headers[1]
    setColX(c1)
    setColY(c2)
  }

  const handleResetToSample = () => {
    setIsCustomCsv(false)
    setCsvData(null)
    setSelectedPresetId('housing')
  }

  // Metrics
  const currentMSE = useMemo(() => computeMSE(activeData.points, b1, b0), [activeData.points, b1, b0])
  const olsMSE = useMemo(() => computeMSE(activeData.points, ols.b1, ols.b0), [activeData.points, ols])

  // Compute selected whiteboard explanation object
  const whiteboardObject = useMemo(() => {
    if (selectedPointIndex !== null && selectedPointBIndex !== null) {
      const ptA = activeData.points[selectedPointIndex]
      const ptB = activeData.points[selectedPointBIndex]
      if (ptA && ptB) {
        return explainLRTwoPoints(ptA, ptB, selectedPointIndex, selectedPointBIndex, activeData.xLabel, activeData.yLabel)
      }
    }
    if (selectedPointIndex !== null) {
      const pt = activeData.points[selectedPointIndex]
      if (pt) {
        return explainLRPoint(pt, selectedPointIndex, b1, b0, activeData.xLabel, activeData.yLabel, currentMSE, activeData.points.length)
      }
    }
    if (selectedLine) {
      return explainLRLine(b1, b0, ols, currentMSE, learningRate, activeData.xLabel, activeData.yLabel)
    }
    return null
  }, [selectedPointIndex, selectedPointBIndex, selectedLine, activeData, b1, b0, ols, currentMSE, learningRate])

  const handlePointClick = (idx) => {
    setSelectedLine(false)
    if (selectedPointIndex === null) {
      setSelectedPointIndex(idx)
      setSelectedPointBIndex(null)
    } else if (selectedPointIndex === idx) {
      setSelectedPointIndex(null)
      setSelectedPointBIndex(null)
    } else if (selectedPointBIndex === null) {
      setSelectedPointBIndex(idx)
    } else if (selectedPointBIndex === idx) {
      setSelectedPointBIndex(null)
    } else {
      setSelectedPointIndex(idx)
      setSelectedPointBIndex(null)
    }
  }

  const handleLineClick = () => {
    setSelectedPointIndex(null)
    setSelectedPointBIndex(null)
    setSelectedLine((prev) => !prev)
  }

  const handleClearSelection = () => {
    setSelectedPointIndex(null)
    setSelectedPointBIndex(null)
    setSelectedLine(false)
  }

  const handleQuickInspectPoint = () => {
    setSelectedLine(false)
    setSelectedPointBIndex(null)
    setSelectedPointIndex(0)
  }

  const handleQuickInspectLine = () => {
    setSelectedPointIndex(null)
    setSelectedPointBIndex(null)
    setSelectedLine(true)
  }

  // Real gradients in scaled units: exactly the grad_slope / grad_intercept lines of the code panel.
  const lrGradients = useMemo(() => {
    const [w, b] = toScaled(scaling, b1, b0)
    const [gradSlope, gradIntercept] = scaledGradient(scaling, w, b)
    const pts = activeData.points
    const avgResidual = pts.length ? pts.reduce((s, p) => s + Math.abs(b1 * p.x + b0 - p.y), 0) / pts.length : 0
    return { w, b, gradSlope, gradIntercept, avgResidual }
  }, [scaling, activeData.points, b1, b0])

  const isConverged =
    Math.abs(lrGradients.gradSlope) < CONVERGE_GRAD && Math.abs(lrGradients.gradIntercept) < CONVERGE_GRAD
  const isDiverging = !Number.isFinite(currentMSE) || currentMSE > 1e6

  const activeMapping = LR_CODE_MAPPINGS[stepIndex] || LR_CODE_MAPPINGS[0]

  const lrLiveVariables = useMemo(() => {
    const pts = activeData.points
    return [
      { name: 'N', value: `${pts.length} pts`, highlight: stepIndex === 0 },
      { name: 'slope (scaled)', value: lrGradients.w.toFixed(3), highlight: stepIndex === 1 || stepIndex === 6 },
      { name: 'intercept (scaled)', value: lrGradients.b.toFixed(3), highlight: stepIndex === 1 || stepIndex === 6 },
      { name: 'MSE (real units)', value: currentMSE.toFixed(3), highlight: stepIndex === 4 || stepIndex === 7 },
      { name: 'grad_slope', value: lrGradients.gradSlope.toFixed(3), highlight: stepIndex === 5 || stepIndex === 8 },
      { name: 'grad_intercept', value: lrGradients.gradIntercept.toFixed(3), highlight: stepIndex === 5 || stepIndex === 8 },
      { name: 'mean_|err|', value: lrGradients.avgResidual.toFixed(2), highlight: stepIndex === 3 },
      { name: 'learning_rate', value: learningRate.toFixed(2) },
    ]
  }, [activeData.points, currentMSE, lrGradients, stepIndex, learningRate])

  // Runs `count` real gradient descent steps from (sb1, sb0), keeping every visited state in history.
  const runSteps = useCallback(
    (sb1, sb0, count, untilConverged = false) => {
      let cur = [sb1, sb0]
      const visited = []
      let done = 0
      for (let i = 0; i < count; i++) {
        if (untilConverged) {
          const [w, b] = toScaled(scaling, cur[0], cur[1])
          const [gw, gb] = scaledGradient(scaling, w, b)
          if (Math.abs(gw) < CONVERGE_GRAD && Math.abs(gb) < CONVERGE_GRAD) break
          if (!Number.isFinite(gw) || Math.abs(w) > 1e6) break
        }
        visited.push(cur)
        cur = gdStep(scaling, cur[0], cur[1], learningRate)
        done += 1
      }
      return { next: cur, visited, done }
    },
    [scaling, learningRate],
  )

  // Phase-by-phase walk through one iteration. Phases 0-5 describe the starting line; 6 applies one real
  // update; 7 runs two more; 8 keeps going until the gradient is (almost) zero, or the cap is hit.
  const handleJumpStep = useCallback(
    (targetIdx) => {
      setStepIndex(targetIdx)
      if (targetIdx <= 5) {
        setParams(initialParams[0], initialParams[1])
        setIteration(0)
        setHistory([])
      } else if (targetIdx === 6) {
        const { next, visited } = runSteps(initialParams[0], initialParams[1], 1)
        setParams(next[0], next[1])
        setIteration(1)
        setHistory(visited)
      } else if (targetIdx === 7) {
        const { next, visited } = runSteps(initialParams[0], initialParams[1], 3)
        setParams(next[0], next[1])
        setIteration(3)
        setHistory(visited)
      } else if (targetIdx === 8) {
        const { next, visited, done } = runSteps(initialParams[0], initialParams[1], MAX_ITERS, true)
        setParams(next[0], next[1])
        setIteration(done)
        setHistory(visited)
      }
    },
    [initialParams, runSteps, setParams],
  )

  // Iteration-Level Playback: one real gradient descent step per click.
  const handleNextIteration = useCallback(() => {
    if (stepIndex < 6) {
      handleJumpStep(6)
      return
    }
    if (isConverged || isDiverging || iteration >= MAX_ITERS) {
      setStepIndex(8)
      return
    }
    const next = gdStep(scaling, b1, b0, learningRate)
    setHistory((h) => [...h, [b1, b0]])
    setParams(next[0], next[1])
    setIteration((it) => it + 1)
    const [w, b] = toScaled(scaling, next[0], next[1])
    const [gw, gb] = scaledGradient(scaling, w, b)
    setStepIndex(Math.abs(gw) < CONVERGE_GRAD && Math.abs(gb) < CONVERGE_GRAD ? 8 : 7)
  }, [stepIndex, isConverged, isDiverging, iteration, scaling, b1, b0, learningRate, setParams, handleJumpStep])

  // Restores the exact previous state (no extrapolation).
  const handlePrevIteration = useCallback(() => {
    if (history.length === 0) {
      resetModelToInit()
      return
    }
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setParams(prev[0], prev[1])
    setIteration((it) => Math.max(0, it - 1))
    setStepIndex(history.length - 1 === 0 ? 5 : 7)
  }, [history, resetModelToInit, setParams])

  // Teacher-edited code: slope / intercept are read in scaled units (as in the code), learning_rate as is.
  const handleRunTeacherCode = useCallback(
    (extracted) => {
      let lr = learningRate
      if (Number.isFinite(extracted.learning_rate) && extracted.learning_rate > 0) {
        lr = extracted.learning_rate
        setLearningRate(lr)
      }
      let [w, b] = toScaled(scaling, b1, b0)
      if (Number.isFinite(extracted.slope)) w = extracted.slope
      if (Number.isFinite(extracted.intercept)) b = extracted.intercept
      const start = fromScaled(scaling, w, b)
      const next = gdStep(scaling, start[0], start[1], lr)
      setHistory([start])
      setParams(next[0], next[1])
      setIteration(1)
      setStepIndex(6)
    },
    [learningRate, scaling, b1, b0, setParams],
  )

  const handleNext = () => {
    if (stepIndex < LR_STEPS.length - 1) {
      handleJumpStep(stepIndex + 1)
    } else {
      setIsPlaying(false)
    }
  }


  // Autoplay
  const timerRef = useRef(null)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return undefined
    }
    const intervalMs = Math.round(1600 / speed)
    timerRef.current = setInterval(() => {
      setStepIndex((cur) => {
        if (cur >= LR_STEPS.length - 1) {
          setIsPlaying(false)
          return cur
        }
        const next = cur + 1
        handleJumpStep(next)
        return next
      })
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, speed, handleJumpStep])

  // Dynamic Scale Range
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const pts = activeData.points
    if (pts.length === 0) return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const padX = (maxX - minX) * 0.12 || 1
    const padY = (maxY - minY) * 0.12 || 1
    return {
      xMin: minX - padX,
      xMax: maxX + padX,
      yMin: minY - padY,
      yMax: maxY + padY,
    }
  }, [activeData.points])

  const SVG_W = 680
  const SVG_H = 360
  const PAD = { l: 56, r: 24, t: 20, b: 44 }
  const plotW = SVG_W - PAD.l - PAD.r
  const plotH = SVG_H - PAD.t - PAD.b

  const px = useCallback(
    (x) => PAD.l + ((x - xMin) / (xMax - xMin)) * plotW,
    [xMin, xMax, PAD.l, plotW],
  )
  const py = useCallback(
    (y) => PAD.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH,
    [yMin, yMax, PAD.t, plotH],
  )

  const curStep = LR_STEPS[stepIndex]
  const isLineVisible = stepIndex > 0
  const isPredVisible = showPredictions && stepIndex >= 2
  const isResidVisible = showResiduals && stepIndex >= 3

  return (
    <TeacherWorkspaceLayout
      title="Linear Regression Playground"
      subtitle="Demonstrate how a regression model learns the line of best fit. Upload any CSV dataset or use classroom presets."
      datasetSelector={
        <TeacherDatasetSelector
          samplePresets={SAMPLE_PRESETS}
          selectedPresetId={selectedPresetId}
          onSelectPreset={(id) => {
            setSelectedPresetId(id)
            setIsCustomCsv(false)
            resetModelToInit()
          }}
          isCustomCsv={isCustomCsv}
          csvData={csvData}
          onCsvLoaded={handleCsvLoaded}
          onResetToSample={handleResetToSample}
          col1Label="Input (X)"
          col2Label="Target (Y)"
          selectedCol1={colX}
          selectedCol2={colY}
          onCol1Change={setColX}
          onCol2Change={setColY}
        />
      }
      visualization={
        <>
          <div className="tw-vis-card-header">
            <div className="tw-vis-title">
              Model: <code>ŷ = {b1.toFixed(2)}x + {b0.toFixed(2)}</code>
              <span style={{ marginLeft: 12, fontSize: '12px', color: 'var(--muted)', fontWeight: 'normal' }}>
                Loss (MSE): <b>{currentMSE.toFixed(3)}</b>
              </span>
            </div>
            <div className="tw-vis-toggles">
              <label className="tw-checkbox-label">
                <input
                  type="checkbox"
                  checked={showResiduals}
                  onChange={(e) => setShowResiduals(e.target.checked)}
                />
                Residuals
              </label>
              <label className="tw-checkbox-label">
                <input
                  type="checkbox"
                  checked={showPredictions}
                  onChange={(e) => setShowPredictions(e.target.checked)}
                />
                Predictions
              </label>
              <label className="tw-checkbox-label">
                <input
                  type="checkbox"
                  checked={showSquareBoxes}
                  onChange={(e) => setShowSquareBoxes(e.target.checked)}
                />
                Error Squares
              </label>
              <label className="tw-checkbox-label">
                <input
                  type="checkbox"
                  checked={showOlsTarget}
                  onChange={(e) => setShowOlsTarget(e.target.checked)}
                />
                Target OLS
              </label>
            </div>
          </div>

          <svg
            className="tw-lr-svg"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            role="img"
            aria-label="Linear regression visualization"
          >
            {/* Grid lines */}
            <g className="tw-lr-grid">
              {Array.from({ length: 6 }).map((_, i) => {
                const xVal = xMin + (i * (xMax - xMin)) / 5
                return (
                  <line key={`gx-${i}`} x1={px(xVal)} y1={py(yMin)} x2={px(xVal)} y2={py(yMax)} />
                )
              })}
              {Array.from({ length: 6 }).map((_, i) => {
                const yVal = yMin + (i * (yMax - yMin)) / 5
                return (
                  <line key={`gy-${i}`} x1={px(xMin)} y1={py(yVal)} x2={px(xMax)} y2={py(yVal)} />
                )
              })}
            </g>

            {/* Axes */}
            <line className="tw-lr-axis" x1={px(xMin)} y1={py(yMin)} x2={px(xMax)} y2={py(yMin)} />
            <line className="tw-lr-axis" x1={px(xMin)} y1={py(yMin)} x2={px(xMin)} y2={py(yMax)} />

            {/* Axis labels */}
            <text className="tw-lr-label" x={PAD.l + plotW / 2} y={SVG_H - 10} textAnchor="middle" style={{ fontWeight: 600 }}>
              {activeData.xLabel}
            </text>
            <text className="tw-lr-label" x={14} y={PAD.t + plotH / 2} textAnchor="middle" transform={`rotate(-90 14 ${PAD.t + plotH / 2})`} style={{ fontWeight: 600 }}>
              {activeData.yLabel}
            </text>

            {/* Squared Error Area Boxes */}
            {isLineVisible &&
              showSquareBoxes &&
              activeData.points.map((p, i) => {
                const yHat = b1 * p.x + b0
                const side = Math.abs(py(p.y) - py(yHat))
                const boxX = px(p.x)
                const boxY = Math.min(py(p.y), py(yHat))
                return (
                  <rect
                    key={`sq-${i}`}
                    className="tw-lr-residual-box"
                    x={boxX}
                    y={boxY}
                    width={side}
                    height={side}
                  />
                )
              })}

            {/* OLS Target Line */}
            {showOlsTarget && (
              <line
                className="tw-lr-ols-line"
                x1={px(xMin)}
                y1={py(ols.b1 * xMin + ols.b0)}
                x2={px(xMax)}
                y2={py(ols.b1 * xMax + ols.b0)}
              />
            )}

            {/* Baseline Snapshot Ghost Line (Comparison Feature) */}
            {snapshot && (
              <line
                x1={px(xMin)}
                y1={py(snapshot.b1 * xMin + snapshot.b0)}
                x2={px(xMax)}
                y2={py(snapshot.b1 * xMax + snapshot.b0)}
                stroke="var(--rust)"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                opacity="0.85"
              >
                <title>{`Baseline Snapshot Model: ŷ = ${snapshot.b1.toFixed(2)}x + ${snapshot.b0.toFixed(2)} (MSE: ${snapshot.mse.toFixed(2)})`}</title>
              </line>
            )}

            {/* Candidate Line with selection glow */}
            {isLineVisible && (
              <>
                {selectedLine && (
                  <line
                    x1={px(xMin)}
                    y1={py(b1 * xMin + b0)}
                    x2={px(xMax)}
                    y2={py(b1 * xMax + b0)}
                    stroke="var(--rust)"
                    strokeWidth={8}
                    opacity={0.35}
                  />
                )}
                <line
                  className="tw-lr-line"
                  x1={px(xMin)}
                  y1={py(b1 * xMin + b0)}
                  x2={px(xMax)}
                  y2={py(b1 * xMax + b0)}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLineClick()
                  }}
                />
              </>
            )}

            {/* Residual Lines */}
            {isLineVisible &&
              isResidVisible &&
              activeData.points.map((p, i) => {
                const yHat = b1 * p.x + b0
                return (
                  <line
                    key={`res-${i}`}
                    className="tw-lr-residual"
                    x1={px(p.x)}
                    y1={py(p.y)}
                    x2={px(p.x)}
                    y2={py(yHat)}
                  />
                )
              })}

            {/* Interactive Residual Callout for Selected Point A */}
            {selectedPointIndex !== null && selectedPointBIndex === null && (() => {
              const ptA = activeData.points[selectedPointIndex]
              if (!ptA) return null
              const yHat = b1 * ptA.x + b0
              const err = ptA.y - yHat
              const midY = (py(ptA.y) + py(yHat)) / 2
              return (
                <g key="interactive-point-residual">
                  <line
                    x1={px(ptA.x)}
                    y1={py(ptA.y)}
                    x2={px(ptA.x)}
                    y2={py(yHat)}
                    stroke="var(--rust)"
                    strokeWidth={3}
                    strokeDasharray="4 2"
                  />
                  <g transform={`translate(${px(ptA.x) + 38}, ${midY})`}>
                    <rect x="-32" y="-10" width="64" height="20" rx="4" fill="#fff" stroke="var(--rust)" strokeWidth="1.5" />
                    <text x="0" y="4" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--rust)">
                      e = {err.toFixed(2)}
                    </text>
                  </g>
                </g>
              )
            })()}

            {/* Interactive Secant Line between Point A and Point B */}
            {selectedPointIndex !== null && selectedPointBIndex !== null && (() => {
              const ptA = activeData.points[selectedPointIndex]
              const ptB = activeData.points[selectedPointBIndex]
              if (!ptA || !ptB) return null
              const dx = ptB.x - ptA.x
              const dy = ptB.y - ptA.y
              const slopeVal = dx !== 0 ? dy / dx : 0
              const midX = (px(ptA.x) + px(ptB.x)) / 2
              const midY = (py(ptA.y) + py(ptB.y)) / 2
              return (
                <g key="interactive-secant-line">
                  <line
                    x1={px(ptA.x)}
                    y1={py(ptA.y)}
                    x2={px(ptB.x)}
                    y2={py(ptB.y)}
                    stroke="var(--rust)"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect x="-30" y="-11" width="60" height="22" rx="4" fill="#fff" stroke="var(--rust)" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--rust)">
                      m = {slopeVal.toFixed(2)}
                    </text>
                  </g>
                </g>
              )
            })()}

            {/* Prediction Dots on Line */}
            {isLineVisible &&
              isPredVisible &&
              activeData.points.map((p, i) => {
                const yHat = b1 * p.x + b0
                return (
                  <circle
                    key={`pred-${i}`}
                    className="tw-lr-pred-point"
                    cx={px(p.x)}
                    cy={py(yHat)}
                    r={4}
                  />
                )
              })}

            {/* Data Points */}
            {activeData.points.map((p, i) => {
              const isSelectedA = selectedPointIndex === i
              const isSelectedB = selectedPointBIndex === i
              return (
                <g key={`pt-${i}`}>
                  {(isSelectedA || isSelectedB) && (
                    <>
                      <circle
                        cx={px(p.x)}
                        cy={py(p.y)}
                        r={12}
                        fill="none"
                        stroke={isSelectedA ? 'var(--blue)' : 'var(--rust)'}
                        strokeWidth={2.5}
                        strokeDasharray="3 2"
                      />
                      <text
                        x={px(p.x)}
                        y={py(p.y) - 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill={isSelectedA ? 'var(--blue)' : 'var(--rust)'}
                      >
                        {isSelectedA ? 'Point A' : 'Point B'}
                      </text>
                    </>
                  )}
                  <circle
                    className="tw-lr-point"
                    cx={px(p.x)}
                    cy={py(p.y)}
                    r={isSelectedA || isSelectedB ? 7 : 5.5}
                  >
                    <title>{`(${p.x}, ${p.y})`}</title>
                  </circle>
                  <circle
                    cx={px(p.x)}
                    cy={py(p.y)}
                    r={16}
                    fill="transparent"
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePointClick(i)
                    }}
                  />
                </g>
              )
            })}

            {/* Convergence indicator */}
            {stepIndex === 8 && (
              <g transform={`translate(${SVG_W / 2}, ${PAD.t + 16})`}>
                <rect
                  x="-110"
                  y="-14"
                  width="220"
                  height="28"
                  rx="14"
                  fill={isConverged ? 'var(--good)' : 'var(--rust)'}
                  opacity="0.95"
                />
                <text x="0" y="4" fill="#fff" textAnchor="middle" fontSize="11.5" fontWeight="600">
                  {isConverged
                    ? `★ Converged to OLS fit in ${iteration} steps`
                    : isDiverging
                      ? 'Diverged: learning rate too large'
                      : `Not converged after ${iteration} steps`}
                </text>
              </g>
            )}
          </svg>

          {/* Interactive ML Concept Whiteboard */}
          <TeacherConceptWhiteboard
            selectedObject={whiteboardObject}
            onClearSelection={handleClearSelection}
            onQuickInspectPoint={handleQuickInspectPoint}
            onQuickInspectCentroid={handleQuickInspectLine}
            algorithmType="linear-regression"
          />
        </>
      }
      parameterControls={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="tw-ctrl-group">
            <span className="tw-ctrl-label">Slope (b₁):</span>
            <input
              type="range"
              min={Number((ols.b1 - 2).toFixed(1))}
              max={Number((ols.b1 + 2).toFixed(1))}
              step="0.05"
              value={b1}
              onChange={(e) => {
                setB1(Number(e.target.value))
                if (stepIndex === 0) setStepIndex(1)
              }}
              style={{ width: 90, accentColor: 'var(--blue)' }}
            />
            <b>{b1.toFixed(2)}</b>
          </div>

          <div className="tw-ctrl-group">
            <span className="tw-ctrl-label">Intercept (b₀):</span>
            <input
              type="range"
              min={Number((ols.b0 - 5).toFixed(1))}
              max={Number((ols.b0 + 5).toFixed(1))}
              step="0.2"
              value={b0}
              onChange={(e) => {
                setB0(Number(e.target.value))
                if (stepIndex === 0) setStepIndex(1)
              }}
              style={{ width: 90, accentColor: 'var(--blue)' }}
            />
            <b>{b0.toFixed(1)}</b>
          </div>

          <div className="tw-ctrl-group">
            <span className="tw-ctrl-label">Learning Rate (α):</span>
            <input
              type="range"
              min="0.01"
              max="1.2"
              step="0.01"
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              style={{ width: 80, accentColor: 'var(--blue)' }}
            />
            <b>{learningRate.toFixed(2)}</b>
          </div>

          <div className="tw-divider" />

          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Target OLS: <code>ŷ = {ols.b1.toFixed(2)}x + {ols.b0.toFixed(2)}</code> (MSE: {olsMSE.toFixed(2)})
          </div>
        </div>
      }
      playbackControls={
        <TeacherPlaybackControls
          isPlaying={isPlaying}
          speed={speed}
          canPrev={iteration > 0 || stepIndex > 0}
          canNext={stepIndex < LR_STEPS.length - 1}
          onReset={resetModelToInit}
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
              Iteration <b>{iteration}</b> · MSE <b>{currentMSE.toFixed(2)}</b>
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
      onReset={resetModelToInit}
      snapshotBar={
        snapshot ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
            <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
              📌 Baseline MSE: {snapshot.mse.toFixed(2)}
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
            onClick={() => setSnapshot({ b1, b0, mse: currentMSE })}
            title="Save baseline model to compare before and after changes"
            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span>📌</span> Save Snapshot
          </button>
        )
      }
      codePanel={
        <TeacherCodeEditor
          algorithmType="linear-regression"
          filename="linear_regression.py"
          codeLines={LR_CODE}
          activeLineRange={activeMapping.lines}
          stepNumber={stepIndex + 1}
          totalSteps={LR_STEPS.length}
          stepLabel={activeMapping.label}
          liveVariables={lrLiveVariables}
          visualNotice={activeMapping.visualNotice}
          onRunCode={handleRunTeacherCode}
        />
      }
      statusExplanation={
        <TeacherExplanationPanel
          stepNumber={stepIndex + 1}
          totalSteps={LR_STEPS.length}
          stepTitle={curStep.title}
          shortSummary={curStep.short}
          whatIsHappening={curStep.what}
          whyItMatters={curStep.why}
          metrics={[
            { label: 'Slope', value: b1.toFixed(2) },
            { label: 'Intercept', value: b0.toFixed(1) },
            { label: 'MSE', value: currentMSE.toFixed(3) },
            { label: 'Iteration', value: iteration },
            { label: 'Points', value: activeData.points.length },
          ]}
          talkingPoint={curStep.talkingPoint}
        />
      }
    />
  )
}

export default TeacherLinearRegression
