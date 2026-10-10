import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import LinearRegressionSandboxPage from './pages/LinearRegressionSandboxPage.jsx'
import LabPage from './pages/LabPage.jsx'
import SummaryPage from './pages/SummaryPage.jsx'
import NotFound from './pages/NotFound.jsx'
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage.jsx'
import TeacherLinearRegressionPage from './pages/teacher/TeacherLinearRegressionPage.jsx'
import TeacherKMeansPage from './pages/teacher/TeacherKMeansPage.jsx'
import TeacherGradientDescentPage from './pages/teacher/TeacherGradientDescentPage.jsx'

// Old quiz links now go to the posttest.
function QuizRedirect() {
  const { topicId } = useParams()
  return <Navigate to={`/topic/${topicId}/posttest`} replace />
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="topic/:topicId" element={<LabPage />} />
        <Route path="topic/:topicId/quiz" element={<QuizRedirect />} />
        <Route path="topic/:topicId/summary" element={<SummaryPage />} />
        <Route path="topic/:topicId/:section" element={<LabPage />} />
        <Route path="linear-regression" element={<Navigate to="/topic/linear-regression/simulation" replace />} />
        <Route path="linear-regression/sandbox" element={<LinearRegressionSandboxPage />} />
        <Route path="k-means" element={<Navigate to="/topic/k-means/simulation" replace />} />
        <Route path="gradient-descent" element={<Navigate to="/topic/gradient-descent/simulation" replace />} />
        <Route path="teacher" element={<TeacherDashboardPage />} />
        <Route path="teacher/linear-regression" element={<TeacherLinearRegressionPage />} />
        <Route path="teacher/k-means" element={<TeacherKMeansPage />} />
        <Route path="teacher/gradient-descent" element={<TeacherGradientDescentPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
