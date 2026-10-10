export const TOPICS = {
  'linear-regression': {
    name: 'Linear regression',
    ico: '📈',
    blurb: 'Fit a line, tune parameters, see the error change.',
    objectives: [
      'Explain what the line is trying to minimise',
      'Predict the effect of changing the slope',
      'Read a residual plot',
    ],
    prereqs: ['Basic coordinate geometry'],
    time: '~15 min',
    video: {
      youtubeId: 'nk2CQITm_eo',
      title: 'Linear Regression, Clearly Explained!!!',
      channel: 'StatQuest with Josh Starmer',
      note: 'Shows how a line is fitted to data by least squares and how R-squared measures the fit. Connect it to the Measure the error and Minimise the error stages.',
    },
  },
  'k-means': {
    name: 'K-means clustering',
    ico: '✳︎',
    blurb: 'Group points, watch centroids move each iteration.',
    objectives: [
      'Explain how a point is assigned to a cluster',
      'Predict how a centroid will move',
      'Recognise convergence',
      'Explain how choosing K changes the clusters (K is a hyperparameter)',
    ],
    prereqs: ['Basic coordinate geometry'],
    time: '~15 min',
    video: {
      youtubeId: '4b5d3muPQmA',
      title: 'StatQuest: K-means clustering',
      channel: 'StatQuest with Josh Starmer',
      note: 'Walks through the K-means algorithm, then shows how to pick K using an elbow plot. Connect it to the K selector and the iteration panel.',
    },
  },
  'gradient-descent': {
    name: 'Gradient descent',
    ico: '⛰️',
    blurb: 'Watch a search path crawl down the error surface to the best line',
    objectives: [
      'Explain what the error surface shows',
      'Predict which way each step will move',
      'Recognise when gradient descent has converged',
      'Explain how the learning rate changes the path (the learning rate is a hyperparameter)',
    ],
    prereqs: ['Linear regression lesson (recommended first)', 'Basic coordinate geometry'],
    time: '~15 min',
    video: {
      youtubeId: 'sDv4f4s2SB8',
      title: 'Gradient Descent, Step-by-Step',
      channel: 'StatQuest with Josh Starmer',
      note: 'Fits a line by gradient descent one step at a time, explaining the step size and when to stop. Connect it to the learning-rate slider and the path on the error surface.',
    },
  },
}

export const QUIZ = {
  'linear-regression': [
    {
      prompt:
        "Bigger flats in this dataset generally sell for more. A new flat is bigger than every flat you've seen so far. What would you expect on the chart?",
      opts: [
        'Its price sits higher than every point you have plotted',
        'Its price sits lower than every point you have plotted',
        'Its price is exactly equal to the most expensive flat',
      ],
      correct: 0,
      explain:
        'Since price keeps climbing with area in this data, a flat bigger than the rest should sell for more than the rest too. That is the whole point of using a trend to predict.',
    },
    {
      prompt:
        'Your line sits below most points on the right side of the chart and above most points on the left side. Which change would lower the error?',
      opts: ['Make the line steeper (increase the slope)', 'Make the line flatter (decrease the slope)', 'Only move the whole line down'],
      correct: 0,
      explain:
        'The points climb faster than your line does: it is too low on the right and too high on the left. Tilting it up (a bigger slope) closes both gaps at once.',
    },
    {
      prompt: 'The error (MSE) drops from 2.8 to 0.6 after a few steps. What does that actually tell you?',
      opts: [
        'The line is fitting the data much better now',
        'The learning rate quietly reduced itself',
        'More data points got added along the way',
      ],
      correct: 0,
      explain:
        'MSE is just the average of the squared gaps between the line and the real points. A smaller MSE means smaller gaps, nothing else has changed.',
    },
    {
      prompt: 'Slope comes out to roughly 1.1 in this flat price example. What does that number mean?',
      opts: [
        'Each extra 100 sq ft adds about ₹1.1 lakh to the predicted price',
        'The flat costs ₹1.1 lakh, full stop',
        'There are 1.1 flats in the dataset',
      ],
      correct: 0,
      explain:
        'Slope is how much the output changes for one unit increase in input. Here one unit is 100 sq ft, so slope 1.1 means price goes up by about ₹1.1 lakh per extra 100 sq ft.',
    },
    {
      prompt: 'The fitted line crosses the vertical axis at b = 1.0. What does that represent?',
      opts: [
        'The predicted price when area is 0, mostly just an anchor point for the line',
        'The average price of every flat in the dataset',
        'The highest possible price in the market',
      ],
      correct: 0,
      explain:
        'Intercept is the value of y when x is 0. Nobody sells a 0 sq ft flat, so it is not always meaningful on its own, but it fixes where the line sits vertically.',
    },
    {
      prompt:
        'Two lines are drawn through the same data. Line A has small gaps to most points but one huge gap to a single point. Line B has medium gaps to every point. Which usually has the lower MSE?',
      opts: [
        'It depends, since squaring one huge gap can outweigh several medium ones',
        'Line A always wins because most of its gaps are small',
        'Line B always wins because it looks smoother',
      ],
      correct: 0,
      explain:
        'MSE squares every gap before averaging, so one large residual can dominate the total more than several medium ones. This is exactly why a single outlier can pull a regression line.',
    },
    {
      prompt:
        'A new listing is priced way higher than its area would suggest, sitting far above the fitted line. What happens if you fit the line again including this point?',
      opts: [
        'The line tilts a bit towards it, even though it does not represent the general trend',
        'The line ignores it completely and stays exactly the same',
        'The MSE drops to zero because of it',
      ],
      correct: 0,
      explain:
        'Every point pulls the line towards itself while fitting. An outlier is not ignored, it just pulls harder than a typical point because its gap (residual) is large.',
    },
  ],
  'k-means': [
    {
      prompt:
        'A point sits almost exactly between the two centres, just slightly closer to the blue one. Which cluster does it join?',
      opts: [
        'Blue, because K-Means always assigns a point to its nearest centre',
        'Rust, to keep the two clusters balanced in size',
        'Neither, it stays unassigned until the next iteration',
      ],
      correct: 0,
      explain: 'K-Means does not care about balance, only distance. Even a tiny gap in distance decides the assignment.',
    },
    {
      prompt: 'After points are reassigned to their nearest centre, what happens next?',
      opts: [
        'Centres are recomputed as the mean position of the points now assigned to them',
        'The algorithm stops immediately',
        'A brand new cluster gets created automatically',
      ],
      correct: 0,
      explain: 'K-Means keeps alternating: assign points to the nearest centre, then recompute each centre as the mean of its group.',
    },
    {
      prompt: 'You run another iteration and not a single point switches groups, and the centres barely move. What does this mean?',
      opts: [
        'K-Means has converged, running more iterations will not change anything further',
        'Something is wrong, K-Means should always keep moving',
        'K was chosen too small',
      ],
      correct: 0,
      explain: 'When an iteration changes nothing meaningful, the algorithm has settled into a stable arrangement. That is exactly what convergence means.',
    },
    {
      prompt: 'If you set K = 1 for a dataset that clearly has two separate groups, what happens?',
      opts: [
        'Every point lands in one giant cluster, since there is only one centre to be closest to',
        'The algorithm automatically finds the two groups anyway',
        'K-Means refuses to run',
      ],
      correct: 0,
      explain: 'With only one centre, every point is closest to it by default. You lose all the grouping information that is visible in the data.',
    },
    {
      prompt: 'What usually happens if K is set higher than the number of groups that are actually present in the data?',
      opts: [
        'A natural group gets sliced into smaller pieces, even though those pieces are not truly different',
        'K-Means notices this and merges the extra centres on its own',
        'The extra centre just stays wherever it started, unused',
      ],
      correct: 0,
      explain: 'K-Means always forms exactly K clusters, it has no idea what the real number of groups is. Ask for more clusters than the data naturally has, and a real group gets cut up.',
    },
    {
      prompt: 'The two starting centres in this activity were placed deliberately close together instead of one near each group. Why might that matter?',
      opts: [
        'A poor starting position can slow convergence, and on messier data it can even lead to a worse final grouping',
        'Starting position never affects the final result',
        'It makes the algorithm skip iterations',
      ],
      correct: 0,
      explain: 'K-Means can be sensitive to where centres start. For data this well separated it usually still finds the right groups, but on trickier data a bad start can lead to a bad answer.',
    },
    {
      prompt:
        'A point was assigned to the rust cluster last iteration. This time, the rust centre moved further away from it while the blue centre stayed put. What is most likely to happen to that point?',
      opts: [
        "It might switch to blue now, since blue could be the closer centre",
        'It always stays with rust once assigned there',
        "Its own position on the chart shifts",
      ],
      correct: 0,
      explain: "Assignment gets recalculated every iteration from the current centre positions, so if the distances shift, a point's group can shift too. Its own coordinates never move, only its group label can.",
    },
    {
      prompt: 'Which of these do you choose before K-means starts running?',
      opts: [
        'The number of clusters K',
        'The final centroid positions',
        'The cluster each point ends up in',
      ],
      correct: 0,
      explain: 'K is a hyperparameter: you set it first, and the algorithm works out the centroids and assignments.',
    },
  ],
  'gradient-descent': [
    {
      prompt: 'Which way does each step move the slope and intercept?',
      opts: ['Towards lower error', 'Towards higher error', 'Randomly'],
      correct: 0,
      explain:
        'Each step measures which direction makes the error grow fastest, then moves the opposite way. That is why the path crawls downhill on the error surface.',
    },
    {
      prompt: 'What does the gold star on the error surface mark?',
      opts: [
        'The best slope and intercept, the same answer OLS computes directly',
        'The starting point',
        'The largest error',
      ],
      correct: 0,
      explain:
        'The star sits at the lowest point of the surface. OLS jumps straight there with a formula, while gradient descent walks towards it one step at a time.',
    },
    {
      prompt: 'What shows that gradient descent has converged?',
      opts: [
        'The error stops changing noticeably between steps',
        'The line passes through every point',
        'The learning rate reaches zero',
      ],
      correct: 0,
      explain:
        'Near the bottom the surface is nearly flat, so each step barely changes the error. The learning rate stays fixed, and the line rarely passes through every point.',
    },
    {
      prompt: 'The learning rate is an example of a...',
      opts: [
        'Hyperparameter, set before the descent starts',
        'Parameter learned by the descent',
        'Result of the descent',
      ],
      correct: 0,
      explain:
        'The slope and intercept are what the descent learns. The learning rate is set beforehand and controls the step size.',
    },
    {
      prompt: 'You raise the learning rate a lot, and after each step the error is larger than before. What is happening?',
      opts: [
        'The steps overshoot the bottom of the bowl, so the descent is diverging',
        'The descent has converged faster than usual',
        'The dataset has changed',
      ],
      correct: 0,
      explain:
        'A step that is too long jumps past the minimum to a point that is even higher up the other side. Each jump is worse than the last, so the error keeps growing.',
    },
    {
      prompt: 'With a very small learning rate, such as 0.01, what do you expect?',
      opts: [
        'The path moves steadily downhill but needs many steps to reach the bottom',
        'The path jumps straight to the bottom in one step',
        'The error grows with every step',
      ],
      correct: 0,
      explain:
        'Small steps are safe but slow. Each one lowers the error a little, so reaching the minimum takes many more steps.',
    },
  ],
}

export const TOPIC_PLAYGROUND_PATHS = {
  'linear-regression': '/linear-regression',
  'k-means': '/k-means',
  'gradient-descent': '/gradient-descent',
}
