import { useState } from 'react'
import { useWorkflow, useLLMService } from '../context/WorkflowContext'
import { WORKFLOW_PHASES } from '../types'
import ApiKeySetup from './ApiKeySetup'

const TopicInput = () => {
  const { state, dispatch } = useWorkflow()
  const llmService = useLLMService()
  const [localTopic, setLocalTopic] = useState(state.topic)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showApiSetup, setShowApiSetup] = useState(false)

  const handleGeneratePlan = async () => {
    if (!localTopic.trim()) return

    console.log('=== Starting plan generation ===')
    console.log('Topic:', localTopic)
    console.log('Environment variables:', {
      VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ? 'Present' : 'Missing',
      VITE_GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'Not set'
    })

    setIsGenerating(true)
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // Update topic in state
      dispatch({ type: 'SET_TOPIC', payload: localTopic })
      
      console.log('Calling LLM service...')
      console.log('Service mode:', state.serviceMode)
      
      // Generate research plan using the appropriate service (local or cloud)
      const plan = await llmService.generateResearchPlan(localTopic)
      console.log('Plan generated successfully:', plan)
      
      // Set project ID if using cloud mode
      if (plan.projectId) {
        dispatch({ type: 'SET_PROJECT_ID', payload: plan.projectId })
      }
      
      dispatch({ type: 'SET_RESEARCH_PLAN', payload: plan })
      
      // Move to planning phase
      dispatch({ type: 'SET_PHASE', payload: WORKFLOW_PHASES.PLANNING })
      
    } catch (error) {
      console.error('=== Plan generation failed ===')
      console.error('Error object:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      const errorMessage = error.message || 'Unknown error occurred'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      
      // Show API setup modal if it's an API key error
      if (errorMessage.includes('API key not configured')) {
        setShowApiSetup(true)
      }
    } finally {
      setIsGenerating(false)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleReset = () => {
    dispatch({ type: 'RESET_WORKFLOW' })
    setLocalTopic('')
  }

  // Only show if we're in the topic input phase
  if (state.currentPhase !== WORKFLOW_PHASES.TOPIC_INPUT) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-green-800">Research Topic Set</h3>
            <p className="text-green-700 text-sm mt-1">{state.topic}</p>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
          >
            Change Topic
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {showApiSetup && <ApiKeySetup onClose={() => setShowApiSetup(false)} />}
      <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Step 1: Define Research Topic
        </h2>
        <p className="text-gray-600 text-sm">
          Enter your research topic to begin the AI-powered planning process. 
          The system will analyze your topic and generate a comprehensive research plan.
        </p>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{state.error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="research-topic" className="block text-sm font-medium text-gray-700 mb-2">
            Research Topic
          </label>
          <textarea
            id="research-topic"
            value={localTopic}
            onChange={(e) => setLocalTopic(e.target.value)}
            placeholder="e.g., Impact of tariffs on Swiss economy, Climate change effects on agriculture, AI adoption in healthcare..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              {localTopic.length > 0 && (
                <span>{localTopic.length} characters</span>
              )}
            </div>
            <button
              onClick={() => {
                console.log('=== Environment Debug ===')
                console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? 'Present' : 'Missing')
                console.log('VITE_GEMINI_MODEL:', import.meta.env.VITE_GEMINI_MODEL || 'Not set')
                console.log('Environment variables loaded from .env file')
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Debug Env
            </button>
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={!localTopic.trim() || isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating Plan...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>Generate Research Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default TopicInput