import { WorkflowProvider } from './context/WorkflowContext'
import Header from './components/Header'
import TopicInput from './components/TopicInput'
import PlanningPhase from './components/PlanningPhase'
import ExecutionPhase from './components/ExecutionPhase'
import ReportComposition from './components/ReportComposition'

function App() {
  return (
    <WorkflowProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Header />
          <main className="mt-8 space-y-8">
            <TopicInput />
            <PlanningPhase />
            <ExecutionPhase />
            <ReportComposition />
          </main>
        </div>
      </div>
    </WorkflowProvider>
  )
}

export default App