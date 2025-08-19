import { useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'

const ResearchCard = ({ card }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCitations, setShowCitations] = useState(false)
  const { state, dispatch } = useWorkflow()
  
  // Validate card object to prevent errors
  if (!card || typeof card !== 'object') {
    console.error('ResearchCard: Invalid card object received', card)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 text-sm">
          ⚠️ Error: Invalid research card data
        </div>
      </div>
    )
  }

  // Ensure required properties exist with defaults
  const safeCard = {
    id: card.id || `card_${Date.now()}`,
    title: card.title || 'Untitled Research Card',
    content: card.content || '',
    type: card.type || 'text_summary',
    metadata: card.metadata || {},
    citations: card.citations || [],
    task: card.task || null,
    ...card
  }
  
  // Check if this card is already in the composing plan
  const isInComposingPlan = state.composingPlan?.selectedCards?.some(selectedCard => selectedCard.id === safeCard.id) || false

  const getCardTypeIcon = (type) => {
    const icons = {
      text_summary: '📄',
      table: '📊',
      chart: '📈',
      quote: '💬',
      image: '🖼️'
    }
    return icons[type] || '📄'
  }

  const getCardTypeColor = (type) => {
    const colors = {
      text_summary: 'bg-blue-50 border-blue-200',
      table: 'bg-green-50 border-green-200',
      chart: 'bg-purple-50 border-purple-200',
      quote: 'bg-yellow-50 border-yellow-200',
      image: 'bg-pink-50 border-pink-200'
    }
    return colors[type] || 'bg-gray-50 border-gray-200'
  }

  const formatContent = (content) => {
    // Handle cases where content is undefined, null, or not a string
    if (!content || typeof content !== 'string') {
      return (
        <p className="mb-3 last:mb-0 leading-relaxed text-gray-500 italic">
          No content available
        </p>
      )
    }
    
    // Split content into paragraphs and format
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-3 last:mb-0 leading-relaxed">
        {paragraph}
      </p>
    ))
  }

  const getSourceIcon = (source) => {
    switch (source) {
      case 'google_search': return '🔍'
      case 'fallback': return '⚠️'
      default: return '📡'
    }
  }

  const exportToMarkdown = () => {
    console.log('📄 ResearchCard: Starting markdown export', {
      cardId: safeCard.id,
      cardTitle: safeCard.title,
      cardType: safeCard.type,
      contentLength: safeCard.content?.length || 0
    })
    
    try {
      const markdown = generateMarkdownFromCard(safeCard)
      const filename = `${safeCard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.md`
      
      console.log('📝 Generated markdown:', {
        markdownLength: markdown.length,
        filename: filename
      })
      
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('✅ Markdown export completed successfully')
    } catch (error) {
      console.error('❌ Error exporting markdown:', error)
      console.error('📊 Export Error Details:', {
        cardId: card.id,
        cardTitle: card.title,
        error: error.message
      })
    }
  }

  const generateMarkdownFromCard = (card) => {
    // Ensure card has required properties with defaults
    const title = card.title || 'Untitled Research Card'
    const type = card.type || 'text_summary'
    const content = card.content || 'No content available'
    const metadata = card.metadata || {}
    const task = card.task || null

    let markdown = `# ${title}\n\n`
    
    // Add metadata
    markdown += `**Type:** ${type.replace('_', ' ')}\n`
    markdown += `**Source:** ${metadata.source?.replace('_', ' ') || 'Unknown'}\n`
    markdown += `**Generated:** ${new Date(metadata.timestamp || Date.now()).toLocaleString()}\n`
    if (metadata.confidence) {
      markdown += `**Confidence:** ${Math.round(metadata.confidence * 100)}%\n`
    }
    markdown += '\n'

    // Add content
    markdown += `## Content\n\n${content}\n\n`

    // Add task information if available
    if (task) {
      markdown += `## Research Task\n\n`
      markdown += `**Type:** ${task.type?.replace('_', ' ') || 'Unknown'}\n`
      markdown += `**Description:** ${task.description || 'No description'}\n`
      markdown += `**Query:** ${task.query || 'No query'}\n\n`
    }

    // Add search queries if available
    if (metadata.searchQueries && metadata.searchQueries.length > 0) {
      markdown += `## Search Queries\n\n`
      metadata.searchQueries.forEach((query, index) => {
        markdown += `${index + 1}. "${query}"\n`
      })
      markdown += '\n'
    }

    // Add citations if available
    if (card.citations && card.citations.length > 0) {
      markdown += `## Sources\n\n`
      card.citations.forEach((citation) => {
        markdown += `### ${citation.title}\n`
        markdown += `**URL:** ${citation.url}\n`
        if (citation.snippet) {
          markdown += `**Excerpt:** "${citation.snippet}"\n`
        }
        markdown += '\n'
      })
    }

    return markdown
  }

  const addToComposingPlan = () => {    
    if (isInComposingPlan) {
      console.log('⚠️ ResearchCard: Card already in composing plan, removing instead', {
        cardId: card.id,
        cardTitle: card.title
      })
      
      dispatch({
        type: 'REMOVE_FROM_COMPOSING_PLAN',
        payload: card.id
      })
      
      console.log('✅ Card removed from composing plan')
      return
    }
    
    console.log('📝 ResearchCard: Adding card to composing plan', {
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.type,
      source: card.metadata?.source,
      contentPreview: card.content?.substring(0, 100) + '...'
    })
    
    try {
      dispatch({
        type: 'ADD_TO_COMPOSING_PLAN',
        payload: card
      })
      
      console.log('✅ Card successfully added to composing plan')
    } catch (error) {
      console.error('❌ Error adding card to composing plan:', error)
      console.error('📊 Add Card Error Details:', {
        cardId: card.id,
        cardTitle: card.title,
        error: error.message
      })
    }
  }

  return (
          <div className={`border-2 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 ${getCardTypeColor(safeCard.type)} ${
      isInComposingPlan ? 'ring-2 ring-green-400 bg-green-50' : ''
    }`}>
      {/* Card Header */}
      <div className="p-4 border-b border-gray-200 bg-white bg-opacity-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">{getCardTypeIcon(safeCard.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
                  {safeCard.title}
                </h3>
                {isInComposingPlan && (
                  <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    <span className="mr-1">✓</span>
                    <span>In Report</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center">
                  {getSourceIcon(safeCard.metadata?.source)}
                  <span className="ml-1">{safeCard.metadata?.source?.replace('_', ' ') || 'Unknown'}</span>
                </span>
                <span>•</span>
                <span>{safeCard.type.replace('_', ' ')}</span>
                {safeCard.metadata?.confidence && (
                  <>
                    <span>•</span>
                    <span>{Math.round(safeCard.metadata.confidence * 100)}% confidence</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          >
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className={`text-gray-700 text-sm ${isExpanded ? '' : 'line-clamp-3'}`}>
          {formatContent(safeCard.content)}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* Search Queries Used */}
            {safeCard.metadata?.searchQueries && safeCard.metadata.searchQueries.length > 0 && (
              <div className="bg-white bg-opacity-70 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2">
                  🔍 Search Queries Used:
                </h4>
                <div className="space-y-1">
                  {safeCard.metadata.searchQueries.map((query, index) => (
                    <div key={index} className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      "{query}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Information */}
            {safeCard.task && (
              <div className="bg-white bg-opacity-70 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2">
                  📋 Research Task:
                </h4>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Type:</strong> {safeCard.task.type.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Query:</strong> {safeCard.task.query}
                </p>
              </div>
            )}

            {/* Citations */}
            {safeCard.citations && safeCard.citations.length > 0 && (
              <div className="bg-white bg-opacity-70 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">
                    📚 Sources ({safeCard.citations.length}):
                  </h4>
                  <button
                    onClick={() => setShowCitations(!showCitations)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showCitations ? 'Hide' : 'Show'} Citations
                  </button>
                </div>
                
                {showCitations && (
                  <div className="space-y-2">
                    {safeCard.citations.map((citation, index) => (
                      <div key={citation.id} className="text-xs border-l-2 border-blue-300 pl-3">
                        <div className="font-medium text-gray-900">
                          [{citation.id}] {citation.title}
                        </div>
                        <a 
                          href={citation.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 break-all"
                        >
                          {citation.url}
                        </a>
                        {citation.snippet && (
                          <p className="text-gray-600 mt-1 italic">
                            "{citation.snippet}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white bg-opacity-70 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 text-sm mb-2">
                ℹ️ Metadata:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <strong>Generated:</strong> {new Date(safeCard.metadata?.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>Card ID:</strong> {String(safeCard.id).slice(-8)}
                </div>
                {safeCard.metadata?.error && (
                  <div className="col-span-2 text-red-600">
                    <strong>Error:</strong> {safeCard.metadata.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-center text-xs">
          <div className="flex space-x-3">
            <button 
              onClick={exportToMarkdown}
              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
            >
              <span>📄</span>
              <span>Export</span>
            </button>
            <button 
              onClick={addToComposingPlan}
              className={`transition-colors flex items-center space-x-1 ${
                isInComposingPlan 
                  ? 'text-orange-600 hover:text-orange-800' 
                  : 'text-green-600 hover:text-green-800'
              }`}
            >
              {isInComposingPlan ? (
                <>
                  <span>🗑️</span>
                  <span>Remove from Report</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>Use in Report</span>
                </>
              )}
            </button>
          </div>
          <div className="text-gray-500">
            {new Date(safeCard.metadata?.timestamp).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchCard