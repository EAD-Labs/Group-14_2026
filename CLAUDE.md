# MLX Studio

MLX Studio is an interactive machine learning app for a college course (ET617, IIT Bombay; client: D Y Patil College of Engineering and Technology, Kolhapur). It covers three topics: Linear Regression, K-Means and Gradient Descent. The client brief also emphasises hyperparameter tuning (K, learning rate).

## Tech stack

- Vite and React 19
- React Router for navigation
- Plain CSS custom properties for styling (`.paper` palette in `src/styles/paper.css`)
- Raw SVG for charts, no chart library
- `useState` for state; `useSessionState` (`src/hooks/useSessionState.js`) when a value should survive navigation within the tab
- One backend function: `api/hint.js` (Vercel serverless, calls Gemini with `GEMINI_API_KEY`). No database, no login.

## Structure

- Each topic is a lab page (`src/pages/LabPage.jsx`) with sections Aim, Theory, Pretest, Procedure, Simulation, Posttest, References. Section text lives in `src/data/labContent.js`; quiz questions in `src/data/topics.js`.
- The pretest uses the question indices in `PRETEST_ITEMS`; the posttest asks the whole bank. Keep those indices valid when editing quizzes.
- Simulations: `src/components/LinearRegression.jsx`, `KMeans.jsx` (+ `kmeansData.js`), `GradientDescent.jsx` (+ `GradientDescentCompare.jsx`).
- Teacher Mode: `src/components/teacher/`. The Python shown in `teacherAlgorithmCode.js` must match what the simulation actually computes (gradient descent runs on standardised data in both teacher and student views).

## Conventions

- Simulations must compute the real algorithm; never animate toward a known answer.
- AI coach: hints and questions only, never the final answer. Supported languages: English, Hindi, Marathi.
- Learner-facing text: short sentences, plain words, explain any technical term on first use.
- Run `npm run build` and `npm run lint` before committing.

## Reference

`/reference/*.html` are the original prototypes the React app was built from. They show the intended visual design; the React code is now the source of truth for behaviour.
