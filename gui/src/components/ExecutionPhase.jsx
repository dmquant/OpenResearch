import { useEffect, useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'
import { WORKFLOW_PHASES } from '../types'
import ResearchCard from './ResearchCard'

const ExecutionPhase = () => {
  const { state } = useWorkflow()
  const [executionLog, setExecutionLog] = useState([])
  const [taskStatuses, setTaskStatuses] = useState({})
  const [completedCards, setCompletedCards] = useState([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(-1)
  const [overallProgress, setOverallProgress] = useState(0)

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setExecutionLog(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp,
      message,
      type
    }])
  }

  const updateTaskStatus = (taskId, status) => {
    setTaskStatuses(prev => ({
      ...prev,
      [taskId]: status
    }))
  }

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'queued': return '⏳'
      case 'running': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '📋'
    }
  }

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'queued': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  // Listen to execution updates - This hook must be called unconditionally
  useEffect(() => {
    if (state.executionData) {
      // Update progress
      setOverallProgress(state.executionData.progress || 0)
      
      // Update completed cards
      if (state.executionData.cards) {
        setCompletedCards(state.executionData.cards)
      }
      
      // Update current task
      if (state.executionData.currentTask !== undefined) {
        setCurrentTaskIndex(state.executionData.currentTask)
      }
      
      // Update task statuses
      if (state.executionData.taskStatuses) {
        setTaskStatuses(state.executionData.taskStatuses)
      }
      
      // Add log entries for updates - avoid infinite loops by checking if it's a new update
      if (state.executionData.lastUpdate && state.executionData.lastUpdate.message) {
        const timestamp = new Date().toLocaleTimeString()
        setExecutionLog(prev => {
          // Check if this message is already in the log to avoid duplicates
          const isDuplicate = prev.some(log => 
            log.message === state.executionData.lastUpdate.message &&
            Math.abs(new Date(log.timestamp).getTime() - new Date().getTime()) < 1000
          )
          
          if (!isDuplicate) {
            return [...prev, {
              id: Date.now() + Math.random(),
              timestamp,
              message: state.executionData.lastUpdate.message,
              type: state.executionData.lastUpdate.type || 'info'
            }]
          }
          return prev
        })
      }
    }
  }, [state.executionData])

  // Only show if we have execution data
  if (!state.executionData) {
    return null
  }

  const totalTasks = state.researchPlan?.tasks?.length || 0
  const completedTasks = Object.values(taskStatuses).filter(status => status === 'completed').length

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Step 3: Research Execution
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              AI agents are executing research tasks using Google Search grounding. Real-time results appear below.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-600 font-medium">
              {state.executionData?.status === 'completed' ? 'Completed' : 'Executing'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Task Progress */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Task Progress ({completedTasks}/{totalTasks})
            </h3>
            <div className="space-y-3">
              {state.researchPlan?.tasks?.map((task, index) => {
                const status = taskStatuses[task.id] || 'queued'
                const isActive = index === currentTaskIndex
                
                return (
                  <div key={task.id} className={`border rounded-lg p-3 transition-all ${
                    isActive ? 'ring-2 ring-blue-500 bg-blue-50' : getTaskStatusColor(status)
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTaskStatusIcon(status)}</span>
                        <div>
                          <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                          <p className="text-xs text-gray-600">{task.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getTaskStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    {status === 'running' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse transition-all duration-500" 
                               style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Execution Log */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Execution Log
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto">
              <div className="space-y-2 text-sm">
                {executionLog.map(log => (
                  <div key={log.id} className={getLogTypeColor(log.type)}>
                    <span className="font-mono text-xs">{log.timestamp}</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
                {executionLog.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    Execution log will appear here...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Overall Progress</h4>
              <p className="text-gray-600 text-sm mt-1">
                Research execution using Google Search grounding
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{Math.round(overallProgress * 100)}%</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-600 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${overallProgress * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Generated Research Cards */}
        {completedCards.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <span className="mr-2">📄</span>
                Generated Research Cards
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {completedCards.length} Card{completedCards.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedCards.map((card, index) => (
                <div key={card.id} className="relative">
                  <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10">
                    {index + 1}
                  </div>
                  <ResearchCard card={card} />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <div>Debug: {completedCards.length} cards in state</div>
            <div>Last update: {state.executionData?.lastUpdate?.message}</div>
            <div>Task statuses: {JSON.stringify(taskStatuses)}</div>
            <div>Current task: {currentTaskIndex}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExecutionPhase