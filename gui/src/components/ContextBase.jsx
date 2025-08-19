import { useWorkflow } from '../context/WorkflowContext'
import { WORKFLOW_PHASES, CARD_TYPES } from '../types'
import Card from './Card'

const ContextBase = () => {
  const { state } = useWorkflow()

  // Only show if we have cards or are in execution phase
  if (state.currentPhase === WORKFLOW_PHASES.TOPIC_INPUT || 
      (state.cards.length === 0 && state.currentPhase !== WORKFLOW_PHASES.EXECUTION)) {
    return null
  }

  const getCardTypeIcon = (type) => {
    switch (type) {
      case CARD_TYPES.TEXT_SUMMARY: return '📄'
      case CARD_TYPES.CHART: return '📊'
      case CARD_TYPES.TABLE: return '📋'
      case CARD_TYPES.QUOTE: return '💬'
      case CARD_TYPES.IMAGE: return '🖼️'
      default: return '📄'
    }
  }

  const getCardTypeColor = (type) => {
    switch (type) {
      case CARD_TYPES.TEXT_SUMMARY: return 'bg-blue-50 border-blue-200'
      case CARD_TYPES.CHART: return 'bg-green-50 border-green-200'
      case CARD_TYPES.TABLE: return 'bg-purple-50 border-purple-200'
      case CARD_TYPES.QUOTE: return 'bg-yellow-50 border-yellow-200'
      case CARD_TYPES.IMAGE: return 'bg-pink-50 border-pink-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="mr-2">🗃️</span>
              Context Base
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Generated research cards stored for report composition. Each card is an atomic unit of information.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{state.cards.length}</div>
            <div className="text-sm text-gray-600">Cards Generated</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {state.cards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generating Research Cards
            </h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              AI agents are processing your research tasks. Cards will appear here as they're completed and synthesized.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Card Type Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.values(CARD_TYPES).map(type => {
                const count = state.cards.filter(card => card.type === type).length
                return (
                  <div key={type} className={`p-3 rounded-lg border ${getCardTypeColor(type)}`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getCardTypeIcon(type)}</span>
                      <div>
                        <div className="font-medium text-sm capitalize">
                          {type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-600">{count} cards</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.cards.map(card => (
                <Card key={card.id} card={card} />
              ))}
            </div>

            {/* Export Options */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Ready for Phase 2</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Export cards to begin report composition phase
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Export JSON
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Composition
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContextBase