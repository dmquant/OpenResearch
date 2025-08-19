import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchResults from './SearchResults'
import CardsExplorer from './CardsExplorer'
import { ServiceFactory } from '../services/ServiceFactory'

const KnowledgeDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    projects: [],
    totalCards: 0,
    totalReports: 0,
    recentActivity: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showCardsExplorer, setShowCardsExplorer] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  
  const navigate = useNavigate()
  const llmService = ServiceFactory.getInstance()

  // Fetch dashboard data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      if (llmService.isWorkerEnabled) {
        // Fetch complete dashboard statistics including cards and reports
        const stats = await llmService.getDashboardStatistics()
        
        setDashboardData({
          projects: stats.projects || [],
          totalCards: stats.totalCards || 0,
          totalReports: stats.totalReports || 0,
          recentActivity: stats.projects?.slice(0, 5) || []
        })
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return

    try {
      setIsSearching(true)
      setError('')
      
      console.log('🔍 Starting global search:', { query: searchQuery })
      const results = await llmService.globalSemanticSearch(searchQuery, 50)
      
      console.log('✅ Search completed:', {
        totalResults: results.length,
        query: searchQuery
      })
      
      setSearchResults(results)
      setActiveTab('search') // Switch to search tab after search
      
    } catch (err) {
      console.error('❌ Search failed:', err)
      setError(`Search failed: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setError('')
  }

  const navigateToProject = (projectId) => {
    navigate(`/project/${projectId}`)
  }

  const openCardsExplorer = (projectId) => {
    setSelectedProjectId(projectId)
    setShowCardsExplorer(true)
  }

  const closeCardsExplorer = () => {
    setShowCardsExplorer(false)
    setSelectedProjectId(null)
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'projects', name: 'Projects', icon: '📁' },
    { id: 'search', name: 'Search', icon: '🔍' },
    { id: 'analytics', name: 'Analytics', icon: '📈' }
  ]

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mr-4"></div>
          <span className="text-gray-600 text-lg">Loading knowledge base...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-4">🧠</span>
            Knowledge Base Dashboard
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Explore and manage all your research content, projects, and insights
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all projects, cards, reports, and content..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSearching}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching || !llmService.isWorkerEnabled}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Search</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-3">❌</span>
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            data={dashboardData} 
            onNavigateToProject={navigateToProject}
            onOpenCardsExplorer={openCardsExplorer}
            onSwitchToTab={setActiveTab}
          />
        )}
        
        {activeTab === 'projects' && (
          <ProjectsTab 
            projects={dashboardData.projects} 
            onNavigateToProject={navigateToProject}
            onOpenCardsExplorer={openCardsExplorer}
            onRefresh={loadDashboardData}
          />
        )}
        
        {activeTab === 'search' && (
          <SearchTab 
            searchQuery={searchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearch={handleSearch}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab data={dashboardData} />
        )}
      </div>

      {/* Cards Explorer Modal */}
      {showCardsExplorer && (
        <CardsExplorer 
          projectId={selectedProjectId}
          onClose={closeCardsExplorer}
        />
      )}
    </div>
  )
}

// Overview Tab Component
const OverviewTab = ({ data, onNavigateToProject, onOpenCardsExplorer, onSwitchToTab }) => {
  const stats = [
    { name: 'Total Projects', value: data.projects.length, icon: '📁', color: 'bg-blue-50 text-blue-600' },
    { name: 'Research Cards', value: data.totalCards, icon: '📄', color: 'bg-green-50 text-green-600' },
    { name: 'Reports Generated', value: data.totalReports, icon: '📊', color: 'bg-purple-50 text-purple-600' },
    { name: 'Active Projects', value: data.projects.filter(p => p.status === 'executing' || p.status === 'planning' || p.status === 'planned').length, icon: '⚡', color: 'bg-orange-50 text-orange-600' }
  ]

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            <button
              onClick={() => onSwitchToTab('projects')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </button>
          </div>
        </div>
        <div className="p-6">
          {data.projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">Start your first research project to see it here.</p>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.projects.slice(0, 6).map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onNavigateToProject={onNavigateToProject}
                  onOpenCardsExplorer={onOpenCardsExplorer}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">➕</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">New Project</div>
              <div className="text-sm text-gray-600">Start a new research project</div>
            </div>
          </button>
          
          <button
            onClick={() => onSwitchToTab('search')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">🔍</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">Search Content</div>
              <div className="text-sm text-gray-600">Find research across projects</div>
            </div>
          </button>
          
          <button
            onClick={() => onSwitchToTab('analytics')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📈</span>
            <div className="text-left">
              <div className="font-medium text-gray-900">View Analytics</div>
              <div className="text-sm text-gray-600">Research productivity insights</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Project Card Component
const ProjectCard = ({ project, onNavigateToProject, onOpenCardsExplorer }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'executing': return 'bg-blue-100 text-blue-800'
      case 'planning': 
      case 'planned': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 
          onClick={() => onNavigateToProject(project.id)}
          className="font-medium text-gray-900 line-clamp-2 flex-1 cursor-pointer hover:text-blue-600"
        >
          {project.title}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
          {project.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{project.description}</p>
      
      {/* Statistics */}
      <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
        <span>📄 {project.cardCount || 0} cards</span>
        <span>📊 {project.reportCount || 0} reports</span>
        <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          onClick={() => onNavigateToProject(project.id)}
          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
        >
          Open Project
        </button>
        
        {(project.cardCount || 0) > 0 && (
          <button
            onClick={() => onOpenCardsExplorer(project.id)}
            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded transition-colors"
          >
            View Cards ({project.cardCount})
          </button>
        )}
        
        <div className="flex-1"></div>
        <span className="text-gray-400">🏷️ {project.topic}</span>
      </div>
    </div>
  )
}

// Projects Tab Component
const ProjectsTab = ({ projects, onNavigateToProject, onOpenCardsExplorer, onRefresh }) => {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true
    return project.status === filter
  })

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'created_at':
        return new Date(b.created_at) - new Date(a.created_at)
      case 'updated_at':
      default:
        return new Date(b.updated_at) - new Date(a.updated_at)
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header with filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            🔄 Refresh
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Projects</option>
              <option value="planned">Planned</option>
              <option value="planning">Planning</option>
              <option value="executing">Executing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="updated_at">Last Updated</option>
              <option value="created_at">Created Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="p-6">
        {sortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">Try adjusting your filters or create a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onNavigateToProject={onNavigateToProject}
                onOpenCardsExplorer={onOpenCardsExplorer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Search Tab Component
const SearchTab = ({ searchQuery, searchResults, isSearching }) => {
  return (
    <div className="space-y-6">
      {/* Search Results */}
      {searchResults.length > 0 && (
        <SearchResults 
          results={searchResults}
          query={searchQuery}
          isLoading={isSearching}
        />
      )}

      {/* Search Tips */}
      {searchResults.length === 0 && !isSearching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Search Tips</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">What you can search for:</h4>
              <ul className="space-y-1">
                <li>• Research topics and concepts</li>
                <li>• Specific data or statistics</li>
                <li>• Author names or sources</li>
                <li>• Geographic locations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search techniques:</h4>
              <ul className="space-y-1">
                <li>• Use natural language queries</li>
                <li>• Try multiple related terms</li>
                <li>• Search for synonyms</li>
                <li>• Use specific vs. general terms</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Pro tip:</strong> The search uses AI-powered semantic understanding, so you can search using natural language rather than just keywords.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Analytics Tab Component
const AnalyticsTab = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Research Analytics</h2>
        
        {/* Project Status Distribution */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Project Status Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['planned', 'planning', 'executing', 'completed'].map(status => {
              const count = data.projects.filter(p => p.status === status).length
              const percentage = data.projects.length > 0 ? Math.round((count / data.projects.length) * 100) : 0
              
              return (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Timeline */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {data.projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">📁</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{project.title}</p>
                  <p className="text-xs text-gray-600">Updated {new Date(project.updated_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'executing' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeDashboard