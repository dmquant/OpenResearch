import { useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'
import { WORKFLOW_PHASES } from '../types'
import TreeMapPlanView from './TreeMapPlanView'
import ExecutionEngine from '../services/ExecutionEngine'

const PlanningPhase = () => {
  const { state, dispatch } = useWorkflow()
  const [isEditing, setIsEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // Only show if we have a research plan
  if (!state.researchPlan || state.currentPhase === WORKFLOW_PHASES.TOPIC_INPUT) {
    return null
  }

  const handleEditPlan = () => {
    setIsEditing(true)
    setEditedPlan({ ...state.researchPlan })
  }

  const handleSavePlan = () => {
    dispatch({ type: 'SET_RESEARCH_PLAN', payload: editedPlan })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedPlan(null)
  }

  const handleApprovePlan = async () => {
    setIsExecuting(true)
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const planId = `plan_${Date.now()}`
      
      // Initialize execution data with all tasks as queued
      const initialTaskStatuses = {}
      state.researchPlan.tasks.forEach(task => {
        initialTaskStatuses[task.id] = 'queued'
      })
      
      dispatch({ type: 'SET_EXECUTION_DATA', payload: {
        id: planId,
        status: 'running',
        progress: 0,
        currentTask: -1,
        taskStatuses: initialTaskStatuses,
        cards: [],
        startedAt: new Date().toISOString(),
        lastUpdate: {
          message: '🚀 Starting research execution with Google Search grounding...',
          type: 'info'
        }
      }})
      
      // Move to execution phase
      dispatch({ type: 'SET_PHASE', payload: WORKFLOW_PHASES.EXECUTION })
      
      // Start the actual execution
      await ExecutionEngine.executeResearchPlan(planId, state.researchPlan, {
        onStart: (execution) => {
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            lastUpdate: {
              message: `📋 Research plan started with ${execution.totalTasks} tasks`,
              type: 'info'
            }
          }})
        },
        
        onTaskStart: ({ task, index }) => {
          // Update the current task to running
          dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId: task.id, status: 'running' } })
          
          // Update other execution data
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            currentTask: index,
            lastUpdate: {
              message: `🔍 Starting task: ${task.title}`,
              type: 'info'
            }
          }})
        },
        
        onTaskComplete: ({ task, card, index, progress }) => {
          // First append the new card
          dispatch({ type: 'APPEND_EXECUTION_CARD', payload: card })
          
          // Update task status to completed
          dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId: task.id, status: 'completed' } })
          
          // Then update other execution data
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            progress,
            lastUpdate: {
              message: `✅ Completed: ${task.title} - Generated research card`,
              type: 'success'
            }
          }})
        },
        
        onTaskError: ({ task, error, index }) => {
          // Update task status to failed
          dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId: task.id, status: 'failed' } })
          
          // Update other execution data
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            lastUpdate: {
              message: `❌ Failed: ${task.title} - ${error.message}`,
              type: 'error'
            }
          }})
        },
        
        onComplete: (execution) => {
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            status: 'completed',
            progress: 1,
            currentTask: -1,
            completedAt: new Date().toISOString(),
            lastUpdate: {
              message: `🎉 Research execution completed! Generated ${execution.cards.length} research cards`,
              type: 'success'
            }
          }})
        },
        
        onError: ({ execution, error }) => {
          dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
            status: 'failed',
            error: error.message,
            lastUpdate: {
              message: `💥 Execution failed: ${error.message}`,
              type: 'error'
            }
          }})
        }
      })
      
    } catch (error) {
      console.error('Error starting execution:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      dispatch({ type: 'UPDATE_EXECUTION_DATA', payload: {
        status: 'failed',
        error: error.message,
        lastUpdate: {
          message: `💥 Failed to start execution: ${error.message}`,
          type: 'error'
        }
      }})
    } finally {
      setIsExecuting(false)
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const currentPlan = isEditing ? editedPlan : state.researchPlan

  const handlePlanUpdate = (updatedPlan) => {
    if (isEditing) {
      setEditedPlan(updatedPlan)
    } else {
      dispatch({ type: 'SET_RESEARCH_PLAN', payload: updatedPlan })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Step 2: Review & Confirm Research Plan
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Interactive research plan - double-click any card to edit. Expand/collapse tasks to see details.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={handleEditPlan}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
              >
                <span>✏️</span>
                <span>Enable Editing</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-96">
        <TreeMapPlanView 
          plan={currentPlan}
          onPlanUpdate={handlePlanUpdate}
          isEditing={isEditing}
        />
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <button
            onClick={() => dispatch({ type: 'RESET_WORKFLOW' })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Start Over
          </button>
          
          {state.currentPhase === WORKFLOW_PHASES.PLANNING && (
            <button
              onClick={handleApprovePlan}
              disabled={isExecuting}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Starting Execution...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>Approve & Execute Plan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlanningPhase