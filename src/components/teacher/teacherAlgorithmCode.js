// Python Tokenizer for Educational Code Viewer
export function tokenizePythonLine(line) {
  const commentIdx = line.indexOf('#')
  let codePart = line
  let commentPart = ''
  if (commentIdx !== -1) {
    codePart = line.slice(0, commentIdx)
    commentPart = line.slice(commentIdx)
  }

  const tokens = []
  const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?(?:e-?\d+)?\b|\b(?:def|class|import|for|in|if|else|elif|return|break|while|print|as|from|and|or|not)\b|\b(?:len|sum|range|abs|max|min|mean|argmin|norm|np|zeros|array|dataset)\b|[-+*/@=<>!]+|[^\s\w]+|\s+|\w+)/g

  let match
  while ((match = regex.exec(codePart)) !== null) {
    const text = match[0]
    let type = 'plain'
    if (/^["']/.test(text)) {
      type = 'string'
    } else if (/^\d/.test(text)) {
      type = 'number'
    } else if (/^(def|class|import|for|in|if|else|elif|return|break|while|print|as|from|and|or|not)$/.test(text)) {
      type = 'keyword'
    } else if (/^(len|sum|range|abs|max|min|mean|argmin|norm|np|zeros|array|dataset)$/.test(text)) {
      type = 'builtin'
    } else if (/^[-+*/@=<>!]+$/.test(text)) {
      type = 'operator'
    }
    tokens.push({ text, type })
  }

  if (commentPart) {
    tokens.push({ text: commentPart, type: 'comment' })
  }

  return tokens
}

// ==========================================
// 1. LINEAR REGRESSION
// ==========================================
export const LR_CODE = [
  "# 1. Load Data",
  "X = dataset['feature_x']",
  "y = dataset['target_y']",
  "N = len(X)",
  "",
  "# 2. Scale Data & Initialise Parameters",
  "Xs = (X - X.mean()) / X.std()   # feature scaling",
  "ys = (y - y.mean()) / y.std()",
  "slope = 0.00",
  "intercept = 0.50",
  "learning_rate = 0.20",
  "",
  "# 3. Model Prediction",
  "prediction = Xs * slope + intercept",
  "",
  "# 4. Calculate Residual Error",
  "error = prediction - ys",
  "",
  "# 5. Compute Loss (MSE)",
  "loss = (1 / N) * sum(error ** 2)",
  "",
  "# 6. Calculate Gradients",
  "grad_slope = (2 / N) * sum(error * Xs)",
  "grad_intercept = (2 / N) * sum(error)",
  "",
  "# 7. Update Parameters",
  "slope = slope - learning_rate * grad_slope",
  "intercept = intercept - learning_rate * grad_intercept",
  "",
  "# 8. Repeat Steps 3-7 & Check Convergence",
  "if abs(grad_slope) < 0.01 and abs(grad_intercept) < 0.01:",
  "    print('Converged: same line as OLS')",
]

export const LR_CODE_MAPPINGS = [
  { stepIndex: 0, lines: [1, 4], label: 'Load Data', visualNotice: 'Visualising observed scatter points (X, Y)' },
  { stepIndex: 1, lines: [6, 11], label: 'Scale & Initialise', visualNotice: 'Starting line drawn (slope 0 in scaled units: a flat line)' },
  { stepIndex: 2, lines: [13, 14], label: 'Prediction', visualNotice: 'Projected prediction points ŷᵢ placed along the line' },
  { stepIndex: 3, lines: [16, 17], label: 'Residual Error', visualNotice: 'Residual error lines (eᵢ = yᵢ - ŷᵢ) connect points to line' },
  { stepIndex: 4, lines: [19, 20], label: 'Compute Loss (MSE)', visualNotice: 'Squared error area boxes illustrate MSE penalty' },
  { stepIndex: 5, lines: [22, 24], label: 'Calculate Gradients', visualNotice: 'Gradients measure the direction of steepest error increase' },
  { stepIndex: 6, lines: [26, 28], label: 'Update Parameters', visualNotice: 'One real update applied: the line rotates and shifts' },
  { stepIndex: 7, lines: [30, 30], label: 'Iterative Refinement', visualNotice: 'Each Next Iteration runs one more real update' },
  { stepIndex: 8, lines: [31, 32], label: 'Convergence Check', visualNotice: 'Gradient ≈ 0: the line now matches the OLS fit' },
]

// ==========================================
// 2. K-MEANS CLUSTERING
// ==========================================
export const KM_CODE = [
  "# 1. Load Unlabelled Dataset",
  "X = dataset[['feature_1', 'feature_2']].values",
  "N = len(X)",
  "K = 3",
  "",
  "# 2. Initialise Centroids (K-Means++)",
  "centroids = init_centroids(X, K, strategy='spread')",
  "",
  "# 3. Calculate Distances to All Centroids",
  "distances = np.linalg.norm(X[:, None] - centroids, axis=2)",
  "",
  "# 4. Assign Points to Nearest Centroid",
  "labels = np.argmin(distances, axis=1)",
  "",
  "# 5. Recompute Centroids (Cluster Means)",
  "new_centroids = np.zeros((K, 2))",
  "for k in range(K):",
  "    new_centroids[k] = np.mean(X[labels == k], axis=0)",
  "",
  "# 6. Reassignment & Iteration Loop",
  "shift = np.max(np.linalg.norm(new_centroids - centroids, axis=1))",
  "centroids = new_centroids",
  "",
  "# 7. Check Convergence",
  "if shift < 0.02:",
  "    print('Centroids stabilized and converged!')",
]

export const KM_CODE_MAPPINGS = [
  { stepIndex: 0, lines: [1, 3], label: 'Load Dataset', visualNotice: 'Displaying raw unlabelled 2D data points' },
  { stepIndex: 1, lines: [4, 4], label: 'Select K', visualNotice: 'Setting number of cluster prototype centroids (K)' },
  { stepIndex: 2, lines: [6, 7], label: 'Initialise Centroids', visualNotice: 'Initial centroid prototype markers placed in feature space' },
  { stepIndex: 3, lines: [9, 13], label: 'Compute Distances & Assign', visualNotice: 'Points join nearest centroid; cluster colors assigned' },
  { stepIndex: 4, lines: [15, 18], label: 'Update Centroids', visualNotice: 'Centroids glide to cluster means (dashed movement trails)' },
  { stepIndex: 5, lines: [20, 21], label: 'Reassignment & Shift', visualNotice: 'Border points re-evaluated; maximum centroid shift measured' },
  { stepIndex: 6, lines: [21, 22], label: 'Iterative Loop', visualNotice: 'Alternating assignment and centroid updates minimize inertia' },
  { stepIndex: 7, lines: [24, 26], label: 'Convergence Check', visualNotice: 'Centroids stabilized (shift < threshold); final clusters fixed' },
]

// ==========================================
// 3. GRADIENT DESCENT
// ==========================================
export const GD_CODE = [
  "# 1. Initialise Model Parameters",
  "Xs = (X - X.mean()) / X.std()   # feature scaling",
  "ys = (y - y.mean()) / y.std()",
  "theta = np.array([initial_slope, initial_intercept])  # scaled units",
  "learning_rate = 0.30",
  "iteration = 0",
  "",
  "# 2. Calculate Loss at Current Position",
  "predictions = Xs * theta[0] + theta[1]",
  "error = predictions - ys",
  "loss = (1 / N) * np.sum(error ** 2)",
  "",
  "# 3. Calculate Gradient Vector (Steepest Ascent)",
  "grad_slope = (2 / N) * np.sum(error * Xs)",
  "grad_intercept = (2 / N) * np.sum(error)",
  "gradient = np.array([grad_slope, grad_intercept])",
  "",
  "# 4. Parameter Update (Take Downhill Step)",
  "step = learning_rate * gradient",
  "theta = theta - step",
  "iteration += 1",
  "",
  "# 5. Measure Error Drop",
  "new_loss = compute_loss(theta, Xs, ys)",
  "delta_loss = loss - new_loss",
  "",
  "# 6. Repeat Steps 2-5 Along the Trajectory",
  "# Successive steps descend the loss surface",
  "",
  "# 7. Check Convergence",
  "if np.linalg.norm(gradient) < 0.01:",
  "    print('Reached bowl minimum (OLS optimal)!')",
]

export const GD_CODE_MAPPINGS = [
  { stepIndex: 0, lines: [1, 6], label: 'Initial Parameters', visualNotice: 'Starting parameter marker positioned on error surface' },
  { stepIndex: 1, lines: [8, 11], label: 'Compute Loss', visualNotice: 'Current MSE loss calculated and highlighted on landscape' },
  { stepIndex: 2, lines: [13, 16], label: 'Calculate Gradient', visualNotice: 'Rust arrow indicates direction of steepest uphill ascent (∇J)' },
  { stepIndex: 3, lines: [18, 21], label: 'Parameter Step', visualNotice: 'Green arrow shows downhill step (-α·∇J); parameter marker shifts' },
  { stepIndex: 4, lines: [23, 25], label: 'Error Drop', visualNotice: 'Verified loss decrease; model fit line on right updates' },
  { stepIndex: 5, lines: [27, 28], label: 'Iterative Trajectory', visualNotice: 'Descent path trail maps iterations rolling down the bowl' },
  { stepIndex: 6, lines: [30, 32], label: 'Convergence Check', visualNotice: 'Real steps run until the gradient is near zero (or the step limit)' },
]

// ==========================================
// 4. SAFE TEACHER CODE EXECUTION ENGINE
// ==========================================
export function executeTeacherPythonCode(algorithmType, codeString) {
  try {
    if (!codeString || typeof codeString !== 'string' || !codeString.trim()) {
      return { success: false, error: 'Code cannot be empty.' }
    }

    // Bracket/Parenthesis Matching Check
    let parens = 0
    let brackets = 0
    for (const char of codeString) {
      if (char === '(') parens++
      if (char === ')') parens--
      if (char === '[') brackets++
      if (char === ']') brackets--
      if (parens < 0) return { success: false, error: 'Syntax Error: Unexpected closing parenthesis ")"' }
      if (brackets < 0) return { success: false, error: 'Syntax Error: Unexpected closing bracket "]"' }
    }
    if (parens !== 0) return { success: false, error: 'Syntax Error: Unclosed parenthesis "("' }
    if (brackets !== 0) return { success: false, error: 'Syntax Error: Unclosed bracket "["' }

    const extracted = {}
    const lines = codeString.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].split('#')[0].trim()
      if (!line) continue

      // Match assignments: variable = expression
      const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/)
      if (assignMatch) {
        const varName = assignMatch[1].trim()
        const rawExpr = assignMatch[2].trim()

        // Pure numbers
        if (/^-?\d+(?:\.\d+)?(?:e-?\d+)?$/.test(rawExpr)) {
          extracted[varName] = Number(rawExpr)
        }
        // Strings
        else if (/^["'](.+)["']$/.test(rawExpr)) {
          extracted[varName] = rawExpr.slice(1, -1)
        }
        // [num1, num2] arrays
        else if (/^\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]$/.test(rawExpr)) {
          const m = rawExpr.match(/^\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]$/)
          extracted[varName] = [Number(m[1]), Number(m[2])]
        }
        // np.array([num1, num2])
        else if (/^np\.array\(\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\)$/.test(rawExpr)) {
          const m = rawExpr.match(/^np\.array\(\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]\)$/)
          extracted[varName] = [Number(m[1]), Number(m[2])]
        }
      }
    }

    return {
      success: true,
      extracted,
      message: 'Code executed successfully. Algorithmic parameters applied.',
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Error evaluating modified code.',
    }
  }
}

