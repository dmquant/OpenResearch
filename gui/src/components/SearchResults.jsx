import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SearchResults = ({ results, query, isLoading }) => {
  const [expandedResults, setExpandedResults] = useState(new Set())
  const navigate = useNavigate()

  const toggleExpanded = (resultId) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId)
    } else {
      newExpanded.add(resultId)
    }
    setExpandedResults(newExpanded)
  }

  const navigateToProject = (projectId, projectTitle) => {
    if (projectId) {
      console.log('🚀 Navigating to project:', { projectId, projectTitle })
      // Navigate to the project details page
      navigate(`/project/${projectId}`)
    }
  }

  const exportToMarkdown = (result) => {
    const markdown = generateMarkdownFromSearchResult(result, query)
    const filename = `search_result_${result.title?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'untitled'}.md`
    
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateMarkdownFromSearchResult = (result, searchQuery) => {
    let markdown = `# ${result.title || 'Search Result'}\n\n`
    
    // Add metadata
    markdown += `**Search Query:** "${searchQuery}"\n`
    markdown += `**Relevance Score:** ${formatScore(result.score)}%\n`
    markdown += `**Content Type:** ${getContentTypeLabel(result.metadata?.contentType || result.metadata?.type)}\n`
    markdown += `**Project:** ${result.projectTitle || 'Unknown'}\n`
    markdown += `**Found Date:** ${new Date().toLocaleDateString()}\n\n`
    
    // Add content
    if (result.content) {
      markdown += `## Content\n\n${result.content}\n\n`
    }
    
    // Add metadata if available
    if (result.metadata) {
      markdown += `## Metadata\n\n`
      Object.entries(result.metadata).forEach(([key, value]) => {
        if (key !== 'content' && key !== 'contentType' && typeof value === 'string') {
          markdown += `**${key}:** ${value}\n`
        }
      })
      markdown += '\n'
    }
    
    markdown += `---\n*Generated from OpenResearch search on ${new Date().toLocaleString()}*`
    
    return markdown
  }

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'research_card': return '📄'
      case 'bilingual_report': return '📊'
      case 'research_plan': return '📋'
      default: return '📄'
    }
  }

  const getContentTypeLabel = (contentType) => {
    switch (contentType) {
      case 'research_card': return 'Research Card'
      case 'bilingual_report': return 'Report'
      case 'research_plan': return 'Project Plan'
      case 'card': return 'Research Card'
      case 'report': return 'Report'
      default: return 'Content'
    }
  }

  const getCardTypeColor = (contentType) => {
    switch (contentType) {
      case 'research_card':
      case 'card':
        return 'border-blue-400 bg-blue-50'
      case 'bilingual_report':
      case 'report':
        return 'border-green-400 bg-green-50'
      case 'research_plan':
        return 'border-purple-400 bg-purple-50'
      default:
        return 'border-gray-400 bg-gray-50'
    }
  }

  const formatScore = (score) => {
    return Math.round((score || 0) * 100)
  }

  const highlightText = (text, query) => {
    if (!query || !text) return text
    
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2)
    let highlightedText = text
    
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    })
    
    return highlightedText
  }

  const truncateContent = (content, maxLength = 300) => {
    if (!content) return ''
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
          <span className="text-gray-600">Searching across your research content...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Results Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Search Results
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Sorted by relevance
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y divide-gray-200">
        {results.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">We couldn't find any content matching your search query.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">💡 Note: Search requires embeddings</p>
              <p>
                If you have existing projects but see no results, you may need to regenerate content 
                to create embeddings with the new search system. Try creating new research content 
                or cards to populate the search index.
              </p>
            </div>
          </div>
        ) : (
          results.map((result, index) => {
          const isExpanded = expandedResults.has(result.id || index)
          const contentType = result.metadata?.contentType || 'unknown'
          const score = formatScore(result.score)
          
          return (
            <div key={result.id || index} className={`border-l-4 ${getCardTypeColor(contentType)} hover:shadow-md transition-all duration-200`}>
              {/* Card Header - Clickable */}
              <div 
                className="p-6 cursor-pointer hover:bg-blue-50 hover:bg-opacity-30 transition-colors"
                onClick={() => toggleExpanded(result.id || index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Result Header */}
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">
                        {getContentTypeIcon(contentType)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                          {result.title || 'Untitled'}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {getContentTypeLabel(contentType)}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {score}% match
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToProject(result.metadata?.projectId, result.projectTitle)
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-xs"
                          >
                            📁 {result.projectTitle || 'Unknown Project'}
                          </button>
                          {!isExpanded && (
                            <span className="text-blue-600 font-medium text-xs">Click to expand</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  <button
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(result.id || index)
                    }}
                  >
                    <span className={`transform transition-transform duration-200 text-gray-600 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                </div>

                {/* Content Preview */}
                {!isExpanded && (
                  <div className="mt-3">
                    <div 
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(truncateContent(result.content), query)
                      }}
                    />
                  </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 bg-blue-50 bg-opacity-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">{getContentTypeIcon(contentType)}</span>
                      Full Content
                    </h4>
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4 max-h-64 overflow-y-auto bg-white bg-opacity-60 rounded p-3"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.content || '', query)
                      }}
                    />

                    {/* Citations if available */}
                    {result.citations && result.citations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Sources ({result.citations.length})</h4>
                        <div className="space-y-2">
                          {result.citations.slice(0, 3).map((citation, index) => (
                            <div key={index} className="text-xs bg-white bg-opacity-70 p-2 rounded border">
                              <div className="font-medium text-blue-600">
                                <a href={citation.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {citation.title}
                                </a>
                              </div>
                              {citation.snippet && (
                                <p className="text-gray-600 mt-1 line-clamp-2">"{citation.snippet}"</p>
                              )}
                            </div>
                          ))}
                          {result.citations.length > 3 && (
                            <div className="text-xs text-gray-500">
                              And {result.citations.length - 3} more sources...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Expanded Metadata */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {getContentTypeLabel(contentType)}
                        </span>
                        {result.metadata?.timestamp && (
                          <span>Created {new Date(result.metadata.timestamp).toLocaleDateString()}</span>
                        )}
                        {result.metadata?.chunkIndex !== undefined && result.metadata?.totalChunks > 1 && (
                          <span>Part {result.metadata.chunkIndex + 1} of {result.metadata.totalChunks}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(result.content || '')
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Actions Bar */}
              {isExpanded && (
                <div className="px-6 pb-6 bg-gray-50 bg-opacity-50">
                  <div className="border-t border-gray-200 pt-4">
                    {/* Action Buttons */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-3 text-sm">
                        <button 
                          onClick={() => exportToMarkdown(result)}
                          className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1"
                        >
                          <span>📄</span>
                          <span>Export</span>
                        </button>
                        
                        <button
                          onClick={() => navigateToProject(result.metadata?.projectId, result.projectTitle)}
                          className="text-purple-600 hover:text-purple-800 transition-colors flex items-center space-x-1"
                        >
                          <span>🚀</span>
                          <span>View Project</span>
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Result ID: {result.cardId || result.id}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
        )}
      </div>

      {/* Results Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
        {results.length >= 50 && (
          <p>Showing top 50 results. Refine your search for more specific results.</p>
        )}
        {results.length < 50 && results.length > 0 && (
          <p>All available results are shown above.</p>
        )}
      </div>
    </div>
  )
}

export default SearchResults