import { useState } from 'react'
import EditableCard from './EditableCard'

const TreeMapPlanView = ({ plan, onPlanUpdate, isEditing }) => {
  const [expandedTasks, setExpandedTasks] = useState({})
  const [expandedPlan, setExpandedPlan] = useState(true)

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const togglePlanExpansion = () => {
    setExpandedPlan(!expandedPlan)
  }

  const updateTask = (taskId, updates) => {
    const updatedTasks = plan.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    )
    onPlanUpdate({ ...plan, tasks: updatedTasks })
  }

  const updatePlanInfo = (updates) => {
    onPlanUpdate({ ...plan, ...updates })
  }

  const getTaskTypeColor = (type) => {
    const colors = {
      literature_review: 'bg-purple-50 border-purple-200 text-purple-800',
      current_data: 'bg-blue-50 border-blue-200 text-blue-800',
      expert_analysis: 'bg-green-50 border-green-200 text-green-800',
      comparative_study: 'bg-orange-50 border-orange-200 text-orange-800',
      web_search: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      rag_query: 'bg-pink-50 border-pink-200 text-pink-800',
      mcp_data: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800'
  }

  const getTaskTypeIcon = (type) => {
    const icons = {
      literature_review: '📚',
      current_data: '📊',
      expert_analysis: '🧠',
      comparative_study: '🔍',
      web_search: '🌐',
      rag_query: '💾',
      mcp_data: '🔗'
    }
    return icons[type] || '📋'
  }

  return (
    <div className="relative">
      {/* Main Plan Card */}
      <div className="relative mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-2 h-16 bg-gradient-to-b from-transparent to-gray-300 rounded-full"></div>
        </div>
        
        <EditableCard
          isEditing={isEditing}
          className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg"
          onSave={(updates) => updatePlanInfo(updates)}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🎯</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">
                    {plan.title}
                  </h2>
                  <div className="text-sm text-blue-700">
                    {plan.estimatedDuration} • {plan.tasks?.length || 0} tasks
                  </div>
                </div>
              </div>
              <button
                onClick={togglePlanExpansion}
                className="p-2 hover:bg-blue-100 rounded-full transition-colors"
              >
                <span className={`text-blue-600 transform transition-transform ${expandedPlan ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
            </div>
            
            {expandedPlan && (
              <div className="mt-4">
                <p className="text-blue-800 leading-relaxed">
                  {plan.description}
                </p>
              </div>
            )}
          </div>
        </EditableCard>

        {/* Connection Line */}
        {plan.tasks && plan.tasks.length > 0 && (
          <div className="flex justify-center mt-4">
            <div className="w-2 h-8 bg-gradient-to-b from-gray-300 to-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Tasks Tree */}
      {plan.tasks && plan.tasks.length > 0 && (
        <div className="relative">
          {/* Horizontal connector */}
          <div className="absolute left-1/2 top-0 w-px h-8 bg-gray-300 transform -translate-x-px"></div>
          <div className="absolute left-1/4 top-8 w-1/2 h-px bg-gray-300"></div>
          
          {/* Task cards in a tree layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {plan.tasks.map((task, index) => {
              const isExpanded = expandedTasks[task.id]
              const colorClasses = getTaskTypeColor(task.type)
              const icon = getTaskTypeIcon(task.type)
              
              return (
                <div key={task.id} className="relative">
                  {/* Vertical connector to task */}
                  <div className="absolute left-1/2 -top-12 w-px h-12 bg-gray-300 transform -translate-x-px"></div>
                  
                  <EditableCard
                    isEditing={isEditing}
                    className={`${colorClasses} border-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
                    onSave={(updates) => updateTask(task.id, updates)}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{icon}</span>
                          <div className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50 font-medium">
                            {task.type.replace('_', ' ')}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="p-1 hover:bg-white hover:bg-opacity-30 rounded-full transition-colors"
                        >
                          <span className={`text-sm transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                      </div>
                      
                      <h3 className="font-semibold mb-2 line-clamp-2">
                        {task.title}
                      </h3>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-3 animate-fadeIn">
                          <p className="text-sm opacity-90 leading-relaxed">
                            {task.description}
                          </p>
                          
                          {task.query && (
                            <div className="bg-white bg-opacity-30 rounded-lg p-3">
                              <div className="text-xs font-medium opacity-75 mb-1">
                                Research Query:
                              </div>
                              <div className="text-sm font-mono">
                                "{task.query}"
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="opacity-75">
                              Agent: {task.agent || 'web'}
                            </span>
                            <span className="opacity-75">
                              Task #{index + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </EditableCard>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TreeMapPlanView