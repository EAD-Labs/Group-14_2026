// Student-side data helpers for the K-Means lesson (kept separate from the
// teacher CSV parser, which expects a header row and named columns).

export const MIN_POINTS = 6
export const MAX_POINTS = 200
export const MAX_FILE_BYTES = 1_000_000

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

export function countDistinct(points) {
  return new Set(points.map((p) => `${p[0]},${p[1]}`)).size
}

// Reads the first two cells of every line. A header row or any line that is
// not two numbers is skipped and counted.
export function parseTwoColumnCsv(text) {
  const points = []
  let skipped = 0
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    const cells = trimmed.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, '').trim())
    if (cells.length < 2 || cells[0] === '' || cells[1] === '') {
      skipped += 1
      return
    }
    const x = Number(cells[0])
    const y = Number(cells[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      skipped += 1
      return
    }
    points.push([x, y])
  })
  return { points, skipped }
}

// Returns a message for the learner, or null when the data is usable.
export function validatePoints(points, k) {
  const n = points.length
  if (n < MIN_POINTS) return `Please provide at least ${MIN_POINTS} numeric points (found ${n}).`
  if (n > MAX_POINTS) return `Please provide at most ${MAX_POINTS} points (found ${n}).`
  const distinct = countDistinct(points)
  if (distinct < k) return `K = ${k} needs at least ${k} distinct points (found ${distinct}).`
  return null
}

export function computeBounds(points) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const pad = (lo, hi) => (hi - lo) * 0.1 || 1
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const px = pad(xMin, xMax)
  const py = pad(yMin, yMax)
  return { xMin: xMin - px, xMax: xMax + px, yMin: yMin - py, yMax: yMax + py }
}

// Example data, K=2: hand-picked. Example data, K=3/4: first centre at
// (1.5, 1.5). Custom data: first data point. Every further centre is the data
// point farthest from all centres already chosen.
export function seedCentroids(points, k, isExample) {
  if (isExample && k === 2) {
    return [
      [1.5, 1.5],
      [3.8, 3.5],
    ]
  }
  const centroids = [isExample ? [1.5, 1.5] : points[0].slice()]
  while (centroids.length < k) {
    let best = points[0]
    let bestD = -1
    points.forEach((p) => {
      const d = Math.min(...centroids.map((c) => dist(p, c)))
      if (d > bestD) {
        bestD = d
        best = p
      }
    })
    centroids.push(best.slice())
  }
  return centroids
}

// ---------- elbow plot ----------

export const ELBOW_MAX_K = 8
const ELBOW_MAX_ITERS = 50
const ELBOW_STARTS = 10

function lloyd(points, initial) {
  let centroids = initial.map((c) => c.slice())
  let assign = []
  for (let it = 0; it < ELBOW_MAX_ITERS; it += 1) {
    assign = points.map((p) => {
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
    let moved = 0
    centroids = centroids.map((c, i) => {
      const g = points.filter((_, idx) => assign[idx] === i)
      if (!g.length) return c
      const m = [g.reduce((a, p) => a + p[0], 0) / g.length, g.reduce((a, p) => a + p[1], 0) / g.length]
      moved += dist(m, c)
      return m
    })
    if (moved < 1e-9) break
  }
  return points.reduce((s, p, i) => s + dist(p, centroids[assign[i]]) ** 2, 0)
}

// Farthest-point seeding that starts from a chosen point.
function farthestFrom(points, k, first) {
  const centroids = [first.slice()]
  while (centroids.length < k) {
    let best = points[0]
    let bestD = -1
    points.forEach((p) => {
      const d = Math.min(...centroids.map((c) => dist(p, c)))
      if (d > bestD) {
        bestD = d
        best = p
      }
    })
    centroids.push(best.slice())
  }
  return centroids
}

// SSE for every K from 1 to ELBOW_MAX_K (capped by the number of distinct points).
// Each K keeps the best of several deterministic starts, because a single unlucky start can sit in a
// local minimum and make the curve go up, which would confuse the reading of the plot.
export function elbowCurve(points, isExample) {
  const maxK = Math.min(ELBOW_MAX_K, countDistinct(points))
  const starts = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / ELBOW_STARTS)) === 0)
  const curve = []
  for (let k = 1; k <= maxK; k += 1) {
    let best = lloyd(points, seedCentroids(points, k, isExample))
    starts.forEach((s) => {
      best = Math.min(best, lloyd(points, farthestFrom(points, k, s)))
    })
    curve.push({ k, sse: best })
  }
  return curve
}

// The bend: the point farthest from the straight line joining the first and last points
// (both axes scaled to 0-1 first). Returns null when there are fewer than 3 points.
export function findElbow(curve) {
  if (curve.length < 3) return null
  const first = curve[0]
  const last = curve[curve.length - 1]
  const spanK = last.k - first.k
  const spanS = first.sse - last.sse || 1
  let bestK = null
  let bestD = -1
  curve.forEach(({ k, sse }) => {
    const x = (k - first.k) / spanK
    const y = (first.sse - sse) / spanS
    const d = Math.abs(y - x) / Math.SQRT2
    if (d > bestD) {
      bestD = d
      bestK = k
    }
  })
  return bestK
}
