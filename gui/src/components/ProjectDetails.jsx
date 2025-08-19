import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ServiceFactory } from '../services/ServiceFactory'
import CardsExplorer from './CardsExplorer'

const ProjectDetails = () => {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const llmService = ServiceFactory.getInstance()

  const [project, setProject] = useState(null)
  const [cards, setCards] = useState([])
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCardsExplorer, setShowCardsExplorer] = useState(false)
  const [expandedCard, setExpandedCard] = useState(null)
  const [expandedReport, setExpandedReport] = useState(null)

  // Get projectId from params or search params for backward compatibility
  const actualProjectId = projectId || searchParams.get('projectId')

  useEffect(() => {
    if (actualProjectId) {
      loadProjectDetails()
    } else {
      setError('No project ID provided')
      setIsLoading(false)
    }
  }, [actualProjectId])

  const loadProjectDetails = async () => {
    try {
      setIsLoading(true)
      setError('')

      if (!llmService.isWorkerEnabled) {
        setError('Cloud infrastructure required for project details')
        return
      }

      // Load project data in parallel
      const [projectData, cardsData, reportsData] = await Promise.all([
        llmService.listAllProjects().then(projects => 
          projects.find(p => p.id === actualProjectId)
        ),
        llmService.getProjectCards(actualProjectId),
        llmService.getProjectReports(actualProjectId)
      ])

      if (!projectData) {
        setError('Project not found')
        return
      }

      setProject(projectData)
      setCards(cardsData || [])
      setReports(reportsData || [])

    } catch (err) {
      console.error('Failed to load project details:', err)
      setError(`Failed to load project: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'executing': return 'bg-blue-100 text-blue-800'
      case 'planning': 
      case 'planned': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const startExecution = () => {
    navigate(`/execution?projectId=${actualProjectId}`)
  }

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  const toggleReport = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId)
  }

  const getCardTypeIcon = (type) => {
    switch (type) {
      case 'text_summary': return '📄'
      case 'table': return '📊'
      case 'chart': return '📈'
      case 'quote': return '💬'
      case 'list': return '📝'
      default: return '📄'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mr-4"></div>
          <span className="text-gray-600 text-lg">Loading project details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-3">❌</span>
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/knowledge')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-3"
            >
              Back to Knowledge Base
            </button>
            <button
              onClick={loadProjectDetails}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
          <p className="text-gray-600 mb-4">The requested project could not be found.</p>
          <button
            onClick={() => navigate('/knowledge')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Knowledge Base
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => navigate('/knowledge')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to Knowledge Base
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
            <p className="text-gray-600 text-lg">{project.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📄</span>
              <div>
                <p className="text-sm text-blue-600 font-medium">Research Cards</p>
                <p className="text-2xl font-bold text-blue-900">{cards.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <div>
                <p className="text-sm text-green-600 font-medium">Reports</p>
                <p className="text-2xl font-bold text-green-900">{reports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏷️</span>
              <div>
                <p className="text-sm text-purple-600 font-medium">Topic</p>
                <p className="text-sm font-medium text-purple-900 line-clamp-2">{project.topic}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {project.status === 'planned' && (
            <button
              onClick={startExecution}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Start Research Execution
            </button>
          )}
          
          {project.status === 'executing' && (
            <button
              onClick={startExecution}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Continue Execution
            </button>
          )}

          {cards.length > 0 && (
            <button
              onClick={() => setShowCardsExplorer(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Explore Cards ({cards.length})
            </button>
          )}
        </div>
      </div>

      {/* Project Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cards */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Cards</h2>
            {cards.length > 3 && (
              <button
                onClick={() => setShowCardsExplorer(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All →
              </button>
            )}
          </div>
          
          {cards.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-gray-600">No research cards yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.slice(0, 3).map((card) => (
                <div 
                  key={card.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                  onClick={() => toggleCard(card.id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl mt-0.5">{getCardTypeIcon(card.card_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900 line-clamp-1 flex-1 mr-2">{card.title}</h3>
                        <button 
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className={`transform transition-transform text-gray-400 ${expandedCard === card.id ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                      </div>
                      
                      {expandedCard === card.id ? (
                        <div className="mt-3 bg-blue-50 bg-opacity-50 rounded-lg p-3">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">
                            {card.content}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {card.card_type?.replace('_', ' ') || 'Unknown'}
                              </span>
                              <span>{new Date(card.created_at).toLocaleDateString()}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(card.content)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                            >
                              <span>📋</span>
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-2">{card.content}</p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <span>{card.card_type?.replace('_', ' ') || 'Unknown'}</span>
                            <span>•</span>
                            <span>{new Date(card.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">Click to expand</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports</h2>
          
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 3).map((report) => (
                <div 
                  key={report.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-green-300 transition-all"
                  onClick={() => toggleReport(report.id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl mt-0.5">📊</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900 line-clamp-1 flex-1 mr-2">{report.title}</h3>
                        <button 
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className={`transform transition-transform text-gray-400 ${expandedReport === report.id ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                      </div>
                      
                      {expandedReport === report.id ? (
                        <div className="mt-3 bg-green-50 bg-opacity-50 rounded-lg p-3">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3 max-h-64 overflow-y-auto">
                            {report.content}
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                                {report.language || 'english'}
                              </span>
                              <span>{report.report_type || 'comprehensive'}</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/project/${actualProjectId}/report/${report.id}/edit`, {
                                    state: { report, project }
                                  })
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(report.content)
                                }}
                                className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1"
                              >
                                <span>📋</span>
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-2">{report.content?.substring(0, 150)}...</p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <span>{report.language || 'english'}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="text-green-600 font-medium">Click to expand</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Metadata */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Timeline</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Created:</span> {new Date(project.created_at).toLocaleDateString()}</p>
              <p><span className="font-medium">Updated:</span> {new Date(project.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Research Topic</h3>
            <p className="text-sm text-gray-600">{project.topic}</p>
          </div>
        </div>
      </div>

      {/* Cards Explorer Modal */}
      {showCardsExplorer && (
        <CardsExplorer 
          projectId={actualProjectId}
          onClose={() => setShowCardsExplorer(false)}
        />
      )}
    </div>
  )
}

export default ProjectDetails