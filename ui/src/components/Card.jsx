import { useState } from 'react'
import { CARD_TYPES } from '../types'

const Card = ({ card }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getCardIcon = (type) => {
    switch (type) {
      case CARD_TYPES.TEXT_SUMMARY: return '📄'
      case CARD_TYPES.CHART: return '📊'
      case CARD_TYPES.TABLE: return '📋'
      case CARD_TYPES.QUOTE: return '💬'
      case CARD_TYPES.IMAGE: return '🖼️'
      default: return '📄'
    }
  }

  const getCardColor = (type) => {
    switch (type) {
      case CARD_TYPES.TEXT_SUMMARY: return 'border-blue-200 bg-blue-50'
      case CARD_TYPES.CHART: return 'border-green-200 bg-green-50'
      case CARD_TYPES.TABLE: return 'border-purple-200 bg-purple-50'
      case CARD_TYPES.QUOTE: return 'border-yellow-200 bg-yellow-50'
      case CARD_TYPES.IMAGE: return 'border-pink-200 bg-pink-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getCardColor(card.type)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCardIcon(card.type)}</span>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">{card.title}</h3>
            <p className="text-xs text-gray-600 capitalize">
              {card.type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      <div className="space-y-3">
        {/* Content Preview */}
        <div className="text-sm text-gray-700">
          {isExpanded ? (
            <div className="whitespace-pre-wrap">{card.content}</div>
          ) : (
            <div className="line-clamp-3">
              {card.content.length > 100 
                ? `${card.content.substring(0, 100)}...` 
                : card.content
              }
            </div>
          )}
        </div>

        {/* Metadata */}
        {isExpanded && card.metadata && (
          <div className="border-t pt-3 space-y-2">
            {card.metadata.source && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Source:</span>
                <span className="text-gray-700">{card.metadata.source}</span>
              </div>
            )}
            {card.metadata.confidence && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Confidence:</span>
                <span className="text-gray-700">
                  {Math.round(card.metadata.confidence * 100)}%
                </span>
              </div>
            )}
            {card.metadata.timestamp && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Generated:</span>
                <span className="text-gray-700">
                  {formatTimestamp(card.metadata.timestamp)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Raw Data Preview */}
        {isExpanded && card.rawData && (
          <div className="border-t pt-3">
            <details className="text-xs">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                Raw Data
              </summary>
              <pre className="mt-2 bg-white p-2 rounded border text-xs overflow-auto">
                {JSON.stringify(card.rawData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex space-x-2">
            <button className="text-xs text-blue-600 hover:text-blue-800">
              Edit
            </button>
            <button className="text-xs text-green-600 hover:text-green-800">
              Export
            </button>
          </div>
          <div className="text-xs text-gray-500">
            ID: {card.id}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Card