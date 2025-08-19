import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WorkflowProvider } from './context/WorkflowContext'
import Navigation from './components/Navigation'
import Header from './components/Header'
import CloudStatus from './components/CloudStatus'
import TopicInput from './components/TopicInput'
import PlanningPhase from './components/PlanningPhase'
import ExecutionPhase from './components/ExecutionPhase'
import ReportComposition from './components/ReportComposition'
import SearchPage from './components/SearchPage'
import KnowledgeDashboard from './components/KnowledgeDashboard'
import ProjectDetails from './components/ProjectDetails'
import WYSIWYGReportEditor from './components/WYSIWYGReportEditor'

// Main Research Workflow Page
const ResearchPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Header />
      <CloudStatus />
      <main className="mt-8 space-y-8">
        <TopicInput />
        <PlanningPhase />
        <ExecutionPhase />
        <ReportComposition />
      </main>
    </div>
  )
}

function App() {
  return (
    <WorkflowProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<ResearchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/knowledge" element={<KnowledgeDashboard />} />
            <Route path="/project/:projectId" element={<ProjectDetails />} />
            <Route path="/project" element={<ProjectDetails />} />
            <Route path="/execution" element={<ResearchPage />} />
            <Route path="/project/:projectId/report/:reportId/edit" element={<WYSIWYGReportEditor />} />
          </Routes>
        </div>
      </Router>
    </WorkflowProvider>
  )
}

export default App