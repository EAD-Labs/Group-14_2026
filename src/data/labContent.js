// Content for the Virtual Labs-style sections of each topic:
// Aim, Theory, Pretest, Procedure, Simulation, Posttest, References.

export const LAB_SECTIONS = [
  { id: 'aim', label: 'Aim' },
  { id: 'theory', label: 'Theory' },
  { id: 'pretest', label: 'Pretest' },
  { id: 'procedure', label: 'Procedure' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'posttest', label: 'Posttest' },
  { id: 'references', label: 'References' },
]

export const LAB_SECTION_IDS = LAB_SECTIONS.map((s) => s.id)

// Indices into QUIZ[topicId]. The pretest asks these questions; the posttest asks the whole bank,
// so the same questions can be compared before and after the simulation.
export const PRETEST_ITEMS = {
  'linear-regression': [0, 2, 3, 5, 6],
  'k-means': [0, 1, 2, 4, 7],
  'gradient-descent': [0, 2, 3, 4, 5],
}

export const LAB_CONTENT = {
  'linear-regression': {
    aim: 'To fit a straight line to data by minimising the mean squared error, first by hand and then exactly with the Ordinary Least Squares (OLS) formula.',
    theory: [
      {
        heading: 'What linear regression does',
        text: 'Linear regression predicts a number (the output y) from another number (the input x) using a straight line. In the lesson, x is the area of a flat and y is its price.',
        formula: 'ŷ = b₀ + b₁x',
        note: 'b₁ is the slope: how much ŷ changes when x increases by 1. b₀ is the intercept: the value of ŷ when x = 0.',
      },
      {
        heading: 'Residuals: how wrong one prediction is',
        text: 'For each data point, the residual is the real value minus the predicted value. Points above the line have positive residuals, points below have negative ones.',
        formula: 'eᵢ = yᵢ − ŷᵢ',
      },
      {
        heading: 'Mean squared error (MSE): how wrong the whole line is',
        text: 'Square every residual so that positive and negative gaps cannot cancel out, then take the average. Squaring also punishes large gaps much more than small ones, which is why a single outlier can pull the line towards itself.',
        formula: 'MSE = (1/n) × Σ (yᵢ − ŷᵢ)²',
      },
      {
        heading: 'Ordinary Least Squares (OLS): the exact best line',
        text: 'The best line is the one with the lowest possible MSE. Setting the derivative of MSE with respect to b₀ and b₁ to zero gives a closed-form answer, so no trial and error is needed.',
        formula: 'b₁ = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²,   b₀ = ȳ − b₁x̄',
        note: 'The best line always passes through the average point (x̄, ȳ).',
      },
      {
        heading: 'Limits to keep in mind',
        list: [
          'It only captures straight-line relationships.',
          'Outliers have a large effect because errors are squared.',
          'Predicting far outside the range of the data (extrapolation) is risky.',
          'A good fit shows that x and y move together, not that x causes y.',
        ],
      },
    ],
    procedure: [
      'Read the problem, then open the table of 10 recent flat sales.',
      'Plot the data and answer: as area increases, what happens to price?',
      'Predict the price of a new 950 sq ft flat before any maths.',
      'Fit a line by hand with the Steepness and Vertical position sliders. Watch the error (MSE) as you drag.',
      'Read the names of the parts: input, output, slope and intercept.',
      'Measure the error: follow the residual and MSE worked example, computed from your own line.',
      'In the playground, push the MSE as low as you can. Both small curves turn green when no slider can improve it further.',
      'Step through the five-step derivation of the formula.',
      'See OLS computed on the real data and compare its MSE with your best hand-fitted MSE.',
      'Optional: open the sandbox and fit a line to your own data (typed in or uploaded as CSV).',
      'If you are stuck at any point, ask the AI coach for a hint. It gives guiding questions, not answers.',
    ],
    references: [
      {
        title: 'An Introduction to Statistical Learning (ISLR), Chapter 3: Linear Regression',
        source: 'James, Witten, Hastie and Tibshirani. Free PDF from the authors.',
        href: 'https://www.statlearning.com/',
      },
      {
        title: 'Linear Regression, Clearly Explained!!! (video)',
        source: 'StatQuest with Josh Starmer',
        href: 'https://www.youtube.com/watch?v=nk2CQITm_eo',
      },
      {
        title: 'scikit-learn: Ordinary Least Squares example',
        source: 'Official worked example with a live notebook',
        href: 'https://scikit-learn.org/1.6/auto_examples/linear_model/plot_ols.html',
      },
      {
        title: 'Virtual Labs: Linear Regression',
        source: 'IIT Roorkee, Machine Learning lab',
        href: 'https://ml-iitr.vlabs.ac.in/exp/linear-regression/',
      },
    ],
  },

  'k-means': {
    aim: 'To group unlabelled points into K clusters with the K-Means algorithm, and to see how the choice of K and the starting centres change the result.',
    theory: [
      {
        heading: 'What clustering does',
        text: 'Clustering finds groups in data that has no labels. K-Means splits the points into exactly K groups (clusters), where K is chosen by you before the algorithm starts.',
      },
      {
        heading: 'Distance decides membership',
        text: 'Every cluster has a centre (centroid). A point belongs to whichever centre is nearest, measured as straight-line (Euclidean) distance.',
        formula: 'd(p, c) = √((xₚ − x_c)² + (yₚ − y_c)²)',
      },
      {
        heading: "The algorithm (Lloyd's algorithm)",
        list: [
          'Place K starting centres.',
          'Assign: every point joins its nearest centre.',
          'Update: move every centre to the mean (average position) of the points assigned to it.',
          'Repeat assign and update until the assignments stop changing. That is convergence.',
        ],
        formula: 'c_k = (1 / |C_k|) × Σ_{x ∈ C_k} x',
      },
      {
        heading: 'What K-Means minimises',
        text: 'K-Means tries to make the total squared distance from each point to its own centre as small as possible. This total is called SSE, inertia or within-cluster sum of squares. Each assign step and each update step can only lower it or keep it the same, which is why the algorithm always stops.',
        formula: 'SSE = Σ_k Σ_{x ∈ C_k} ‖x − c_k‖²',
      },
      {
        heading: 'K is a hyperparameter',
        text: 'A hyperparameter is a setting you choose before the algorithm runs; the algorithm then learns everything else (the centres). A larger K almost always gives a lower SSE (with K equal to the number of points, SSE is 0), so the lowest SSE cannot be used to pick K. Common ways to choose K are the elbow method (find where adding one more cluster stops helping much) and the silhouette score.',
      },
      {
        heading: 'Limits to keep in mind',
        list: [
          'It finds a local best, not always the overall best: different starting centres can give different final clusters.',
          'It works best when clusters are roughly round and of similar size.',
          'Features on very different scales should be standardised first, because distance is affected by units.',
        ],
      },
    ],
    procedure: [
      'Inspect the table of 16 points. Optional: choose "Use your own data" and type points or upload a CSV.',
      'Plot the points and choose how many groups K you think the data has (2, 3 or 4).',
      'Look at where the starting centres are placed.',
      'Follow the distance worked example to see how one point picks its nearest centre.',
      'Press "Step forward". Before each step, predict which cluster the ringed point will join.',
      'Watch the total spread (SSE) and the iteration counter. Use "Run to convergence" to finish, and the "Jump to iteration" panel to go back and forward.',
      'When the run ends, read the elbow plot: guess where the SSE curve bends, then check your guess.',
      'Choose "Try a different K" (or "Run again with K = …" under the elbow plot) and repeat. Compare the runs in "Your experiments".',
      'Optional: turn on "Hear the error". Higher pitch means more total spread.',
      'Ask the AI coach "Suggest my next experiment" for a guided next step.',
    ],
    references: [
      {
        title: 'An Introduction to Statistical Learning (ISLR), chapter on Unsupervised Learning (K-Means clustering)',
        source: 'James, Witten, Hastie and Tibshirani. Free PDF from the authors.',
        href: 'https://www.statlearning.com/',
      },
      {
        title: 'Least squares quantization in PCM',
        source: 'S. P. Lloyd, IEEE Transactions on Information Theory, 1982. The original K-Means algorithm.',
        href: 'https://doi.org/10.1109/TIT.1982.1056489',
      },
      {
        title: 'StatQuest: K-means clustering (video)',
        source: 'StatQuest with Josh Starmer',
        href: 'https://www.youtube.com/watch?v=4b5d3muPQmA',
      },
      {
        title: 'scikit-learn: Clustering examples',
        source: 'Official worked examples with live notebooks',
        href: 'https://scikit-learn.org/stable/auto_examples/cluster/index.html',
      },
      {
        title: 'Virtual Labs: K-Means Clustering',
        source: 'IIT Roorkee, Machine Learning lab',
        href: 'https://ml-iitr.vlabs.ac.in/exp/kmeans-clustering/',
      },
    ],
  },

  'gradient-descent': {
    aim: 'To find the best line by repeatedly stepping downhill on the error surface, and to see how the learning rate decides whether the descent converges, crawls or diverges.',
    theory: [
      {
        heading: 'The error surface',
        text: 'Every possible line (every pair of slope b₁ and intercept b₀) has an error, its MSE. Plotting the error for all pairs gives a surface. For linear regression this surface is a bowl with a single lowest point, the same line that OLS computes directly.',
        formula: 'J(b₀, b₁) = (1/n) × Σ (yᵢ − (b₀ + b₁xᵢ))²',
      },
      {
        heading: 'The gradient points uphill',
        text: 'The gradient is the pair of partial derivatives of the error. It points in the direction in which the error grows fastest, so gradient descent moves the opposite way.',
        formula: '∇J = [ ∂J/∂b₀ , ∂J/∂b₁ ]',
      },
      {
        heading: 'The update rule',
        text: 'Start anywhere, then repeat: compute the gradient at the current point and take a step against it. The step size is the learning rate α.',
        formula: 'θ ← θ − α × ∇J(θ)',
      },
      {
        heading: 'The learning rate is a hyperparameter',
        list: [
          'Too small: every step is tiny, so it takes many steps to reach the bottom.',
          'About right: the error falls quickly and settles at the minimum.',
          'Too large: steps overshoot the bottom, zigzag across the bowl, and can make the error grow without limit (divergence).',
        ],
      },
      {
        heading: 'Convergence',
        text: 'Near the bottom the bowl is almost flat, so the gradient becomes almost zero and the steps become tiny. We stop when the error stops changing noticeably, or after a step limit.',
      },
      {
        heading: 'Why the data is standardised first',
        text: 'If x and y are in very different units, the bowl becomes a long narrow valley and no single learning rate works well. Rescaling each variable to mean 0 and standard deviation 1 makes the bowl round. The simulation runs the descent on standardised data and shows the results in the original units.',
      },
      {
        heading: 'Where this is used',
        text: 'OLS has a formula only for simple models like linear regression. Neural networks have no such formula, so they are trained with gradient descent and its variants (stochastic gradient descent, momentum, Adam).',
      },
    ],
    procedure: [
      'Choose a dataset preset (house prices, exam scores, used car value or noisy sales).',
      'On the error surface, find the starting point (open circle) and the best answer (gold star).',
      'Press "Step forward" a few times. Read the message after each step and watch the line on the right.',
      'Press "Run to convergence" with the default learning rate 0.30 and note the number of steps.',
      'Reset, then repeat with learning rates 0.05, 0.50 and 1.10. Compare the paths and the experiment log.',
      'Open the "Compare learning rates" tab. Predict which of three learning rates reaches the minimum first, then start the race and compare the three paths and error curves.',
      'Use the "Jump to step" panel to revisit any step.',
      'Optional: turn on "Hear the error". Pitch follows the error, and left or right follows the side of the best slope.',
      'Ask the AI coach to predict what a new learning rate will do before you try it.',
    ],
    references: [
      {
        title: 'Deep Learning, Chapter 4: Numerical Computation (gradient-based optimisation)',
        source: 'Goodfellow, Bengio and Courville. Free online at deeplearningbook.org.',
        href: 'https://www.deeplearningbook.org/contents/numerical.html',
      },
      {
        title: 'An overview of gradient descent optimization algorithms',
        source: 'S. Ruder, 2016, arXiv:1609.04747',
        href: 'https://arxiv.org/abs/1609.04747',
      },
      {
        title: 'Gradient Descent, Step-by-Step (video)',
        source: 'StatQuest with Josh Starmer',
        href: 'https://www.youtube.com/watch?v=sDv4f4s2SB8',
      },
      {
        title: 'Google Machine Learning Crash Course: Linear regression and gradient descent',
        source: 'Free course with interactive exercises',
        href: 'https://developers.google.com/machine-learning/crash-course',
      },
      {
        title: 'scikit-learn: Stochastic Gradient Descent',
        source: 'Official user guide, including why feature scaling matters',
        href: 'https://scikit-learn.org/stable/modules/sgd.html',
      },
    ],
  },
}
