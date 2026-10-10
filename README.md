# MLX Studio

An interactive, AI-supported learning app for core machine learning algorithms, built for both self-study and classroom teaching.

- **Course:** ET617 Educational Application Development, IIT Bombay
- **Client:** Dr. Kapil Kadam, D Y Patil College of Engineering and Technology, Kolhapur
- **Team:** Aadirath Singh, Umang Gupta, Vaibhavi Kadam

## Topics

| Topic | What the learner does |
| --- | --- |
| Linear Regression | Fits a line by hand, measures the error (MSE), derives and applies Ordinary Least Squares. Sandbox for their own data (typed or CSV). |
| K-Means Clustering | Chooses K, predicts each assignment, steps to convergence, then reads an elbow plot to judge whether K was a good choice. Own data (typed or CSV). |
| Gradient Descent | Watches a path descend the error surface, tunes the learning rate, and races three learning rates side by side. Four preset datasets. |

## Features

- **Virtual Labs-style structure** for every topic: Aim → Theory → Pretest → Procedure → Simulation → Posttest → References, in a left sidebar.
- **Pretest and posttest** on the same questions, so learners see their own improvement.
- **AI coach** (Gemini) that gives hints and questions, never direct answers. Replies in English, Hindi or Marathi, with read-aloud.
- **Hyperparameter tuning:** elbow plot for K, learning-rate comparison for gradient descent.
- **Experiment log** per topic, downloadable, and read by the AI coach.
- **"Hear the error"** sound mode in K-Means and Gradient Descent.
- **Teacher Mode** for projector demonstrations: presentation mode, keyboard shortcuts, CSV upload, and a Python code view synchronised with the diagram.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # development server, usually http://localhost:5173
npm run build      # production build into dist/
npm run lint       # oxlint
```

The AI coach calls `/api/hint`, a Vercel serverless function. When running locally with `npm run dev`, that endpoint does not exist, so the coach shows a fixed fallback hint. Everything else works offline.

## Deploy (Vercel)

1. Import the repository into Vercel (framework preset: Vite).
2. In Project Settings → Environment Variables, add `GEMINI_API_KEY`.
3. Deploy. `api/hint.js` is picked up automatically as a serverless function.

The key is only read on the server and is never sent to the browser.

## Project structure

```
api/hint.js                     Gemini proxy for the AI coach (Vercel function)
src/
  App.jsx                       Routes
  pages/LabPage.jsx             Sidebar + Aim/Theory/Pretest/Procedure/Simulation/Posttest/References
  pages/*Page.jsx               Simulation pages, summary, about, teacher pages
  components/                   Simulations (LinearRegression, KMeans, GradientDescent, GradientDescentCompare),
                                AI panel, experiment log, assessment runner, sound toggle
  components/teacher/           Teacher Mode workspaces and code view
  data/topics.js                Topic metadata and quiz questions
  data/labContent.js            Aim, theory, procedure, references, pretest question choice
  context/SessionContext.jsx    Quiz and pre/post results for the session
  hooks/                        sessionStorage-backed state and experiment log
  styles/                       Theme, paper style, lab layout
reference/                      Original HTML prototypes the React app was built from
```

## Routes

| Path | Page |
| --- | --- |
| `/` | Topic cards |
| `/topic/:topicId/:section` | Lab page; `section` is `aim`, `theory`, `pretest`, `procedure`, `simulation`, `posttest` or `references` |
| `/topic/:topicId/summary` | Session summary with pretest vs. posttest |
| `/linear-regression/sandbox` | Fit a line to your own data |
| `/teacher`, `/teacher/:topic` | Teacher Mode |

`topicId` is `linear-regression`, `k-means` or `gradient-descent`. Old links (`/linear-regression`, `/k-means`, `/gradient-descent`, `/topic/:topicId/quiz`) redirect to the new pages.

## Data and privacy

There is no login or database. Lesson progress, experiment logs and pre/post scores are kept in the browser's `sessionStorage` and disappear when the tab is closed. Only the AI coach sends data out: the question, a short description of the current screen, recent experiment results and the chosen language go to Google's Gemini API.
