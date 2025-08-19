import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ServiceFactory } from '../services/ServiceFactory'

const CardsExplorer = ({ projectId, onClose }) => {
  const [cards, setCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [expandedCard, setExpandedCard] = useState(null)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const llmService = ServiceFactory.getInstance()

  // Fetch real cards data from API
  useEffect(() => {
    loadCards()
  }, [projectId])

  const loadCards = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      if (llmService.isWorkerEnabled && projectId) {
        const cardsData = await llmService.getProjectCards(projectId)
        setCards(cardsData)
      } else {
        setCards([])
      }
    } catch (err) {
      console.error('Failed to load cards:', err)
      setError('Failed to load cards')
      setCards([])
    } finally {
      setIsLoading(false)
    }
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

  const getCardTypeColor = (type) => {
    switch (type) {
      case 'text_summary': return 'bg-blue-50 border-blue-200'
      case 'table': return 'bg-green-50 border-green-200'
      case 'chart': return 'bg-purple-50 border-purple-200'
      case 'quote': return 'bg-yellow-50 border-yellow-200'
      case 'list': return 'bg-indigo-50 border-indigo-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredCards = cards.filter(card => {
    if (filter === 'all') return true
    return card.card_type === filter
  })

  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'type':
        return (a.card_type || '').localeCompare(b.card_type || '')
      case 'created_at':
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  const toggleExpanded = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
            <span>Loading cards...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-red-900">Error</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={loadCards}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">📄</span>
              Research Cards Explorer
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
          
          {/* Filters and Controls */}
          <div className="flex items-center space-x-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Filter by type:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Types</option>
                <option value="text_summary">Text Summary</option>
                <option value="table">Table</option>
                <option value="chart">Chart</option>
                <option value="quote">Quote</option>
                <option value="list">List</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="created_at">Created Date</option>
                <option value="title">Title</option>
                <option value="type">Type</option>
              </select>
            </div>
            
            <div className="flex-1"></div>
            
            <div className="text-sm text-gray-600">
              {sortedCards.length} cards found
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {sortedCards.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
              <p className="text-gray-600">
                {cards.length === 0 
                  ? "This project doesn't have any research cards yet."
                  : "Try adjusting your filters to see more cards."
                }
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {sortedCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  isExpanded={expandedCard === card.id}
                  onToggleExpanded={() => toggleExpanded(card.id)}
                  getCardTypeIcon={getCardTypeIcon}
                  getCardTypeColor={getCardTypeColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Individual Card Item Component
const CardItem = ({ card, isExpanded, onToggleExpanded, getCardTypeIcon, getCardTypeColor }) => {
  const exportToMarkdown = () => {
    const markdown = `# ${card.title}\n\n**Type:** ${card.card_type || 'Unknown'}\n**Created:** ${new Date(card.created_at).toLocaleDateString()}\n\n## Content\n\n${card.content}\n\n---\n*Generated from OpenResearch*`
    
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${card.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`border-2 rounded-lg ${getCardTypeColor(card.card_type)} transition-all duration-200`}>
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-white hover:bg-opacity-50"
        onClick={onToggleExpanded}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-2xl">{getCardTypeIcon(card.card_type)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{card.title}</h3>
              <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
                <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-xs font-medium">
                  {card.card_type ? card.card_type.replace('_', ' ') : 'Unknown'}
                </span>
                <span>Created {new Date(card.created_at).toLocaleDateString()}</span>
                {card.task_type && (
                  <span>Task: {card.task_type.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          </div>
          
          <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded">
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
        
        {/* Content Preview */}
        {!isExpanded && (
          <div className="mt-3 text-sm text-gray-700">
            <p className="line-clamp-2">{card.content}</p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 pt-4">
            {/* Full Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {card.content}
              </div>
            </div>

            {/* Metadata */}
            {card.metadata && Object.keys(card.metadata).length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(card.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-gray-700">{key}:</span>
                      <span className="ml-1 text-gray-600">{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {card.citations && card.citations.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Sources ({card.citations.length})</h4>
                <div className="space-y-2">
                  {card.citations.map((citation, index) => (
                    <div key={index} className="text-xs bg-white bg-opacity-50 p-2 rounded">
                      <div className="font-medium text-blue-600">
                        <a href={citation.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {citation.title}
                        </a>
                      </div>
                      {citation.snippet && (
                        <p className="text-gray-600 mt-1">"{citation.snippet}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <div className="flex space-x-3 text-sm">
                <button 
                  onClick={exportToMarkdown}
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                >
                  <span>📄</span>
                  <span>Export</span>
                </button>
                
                <button
                  onClick={() => navigator.clipboard.writeText(card.content)}
                  className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1"
                >
                  <span>📋</span>
                  <span>Copy</span>
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                ID: {card.id}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CardsExplorer