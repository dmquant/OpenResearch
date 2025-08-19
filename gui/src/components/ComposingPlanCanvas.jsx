import { useState } from 'react'
import { useWorkflow, useLLMService } from '../context/WorkflowContext'

const ComposingPlanCanvas = () => {
  const { state, dispatch } = useWorkflow()
  const llmService = useLLMService()
  const [draggedIndex, setDraggedIndex] = useState(null)

  const selectedCards = state.composingPlan?.selectedCards || []

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    
    console.log('🎯 ComposingPlanCanvas: Handling card drop', {
      draggedIndex,
      dropIndex,
      totalCards: selectedCards.length
    })
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log('⚠️ Drop cancelled - same position or invalid drag')
      setDraggedIndex(null)
      return
    }

    const newCards = [...selectedCards]
    const draggedCard = newCards[draggedIndex]
    
    console.log('📦 Moving card:', {
      cardTitle: draggedCard.title,
      from: draggedIndex,
      to: dropIndex
    })
    
    // Remove the dragged card from its original position
    newCards.splice(draggedIndex, 1)
    
    // Insert it at the new position
    newCards.splice(dropIndex, 0, draggedCard)
    
    dispatch({
      type: 'REORDER_COMPOSING_PLAN',
      payload: newCards
    })
    
    console.log('✅ Card reordering completed')
    setDraggedIndex(null)
  }

  const removeCard = (cardId) => {
    console.log('🗑️ ComposingPlanCanvas: Removing card from composition plan', { cardId })
    console.log('📊 Before removal - Selected cards count:', selectedCards.length)
    
    dispatch({
      type: 'REMOVE_FROM_COMPOSING_PLAN',
      payload: cardId
    })
    
    console.log('✅ Card removal dispatch sent')
  }

  const generateReport = async () => {
    console.log('🚀 ComposingPlanCanvas: Starting report generation')
    console.log('📊 Generation Parameters:', {
      selectedCardsCount: selectedCards.length,
      topic: state.topic,
      cardTitles: selectedCards.map(card => card.title)
    })
    
    if (selectedCards.length === 0) {
      console.warn('⚠️ Report generation cancelled - no cards selected')
      alert('Please select at least one card to generate a report.')
      return
    }

    console.log('📝 Setting generation state to true')
    dispatch({ type: 'SET_GENERATING_REPORT', payload: true })
    
    try {
      console.log('🔧 Using LLM service for report generation...')
      
      // Add projectId to selected cards for storage context
      const cardsWithProjectId = selectedCards.map(card => ({
        ...card,
        projectId: state.projectId
      }))
      
      console.log('🌍 Generating bilingual report with storage...')
      const startTime = Date.now()
      
      // Generate bilingual report using the service (will automatically store to R2/Vectorize!)
      const bilingualReports = await llmService.generateBilingualReport(
        cardsWithProjectId,
        state.topic,
        'english' // Start with English as the original language
      )

      const endTime = Date.now()
      
      console.log('✅ Bilingual report generation completed successfully')
      console.log('📊 Generation Stats:', {
        duration: `${endTime - startTime}ms`,
        englishLength: bilingualReports.english?.content?.length || 0,
        chineseLength: bilingualReports.chinese?.content?.length || 0,
        projectId: state.projectId,
        cloudStored: llmService.isWorkerEnabled
      })

      // Set both language versions in the bilingual state
      dispatch({
        type: 'SET_BILINGUAL_REPORT',
        payload: {
          language: 'english',
          report: bilingualReports.english
        }
      })
      
      dispatch({
        type: 'SET_BILINGUAL_REPORT',
        payload: {
          language: 'chinese',
          report: bilingualReports.chinese
        }
      })

      // Also set the legacy report for backward compatibility
      dispatch({
        type: 'SET_GENERATED_REPORT',
        payload: bilingualReports.english
      })
      
      console.log('📦 Bilingual reports dispatched to state')

    } catch (error) {
      console.error('❌ Error generating report:', error)
      console.error('📊 Error Details:', {
        message: error.message,
        stack: error.stack,
        selectedCardsCount: selectedCards.length,
        topic: state.topic
      })
      
      dispatch({ type: 'SET_ERROR', payload: 'Failed to generate report. Please try again.' })
      dispatch({ type: 'SET_GENERATING_REPORT', payload: false })
    }
  }

  // Log when component renders with selected cards
  console.log('📝 ComposingPlanCanvas: Rendering with selected cards', {
    selectedCount: selectedCards.length,
    isGenerating: state.composingPlan?.isGenerating,
    hasGeneratedReport: !!state.composingPlan?.generatedReport
  })

  if (selectedCards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📝</span>
            Composing Plan Canvas
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Your research cards will be automatically loaded here when you start the composition phase.
          </p>
        </div>
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cards loading...</h3>
          <p className="text-gray-600 text-sm">
            All your research cards will be automatically added to the composing plan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="mr-2">📝</span>
              Composing Plan Canvas
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Drag and drop to reorder cards. Click remove to exclude cards from the report.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{selectedCards.length}</div>
              <div className="text-xs text-gray-500">Cards Selected</div>
            </div>
            <button
              onClick={generateReport}
              disabled={state.composingPlan?.isGenerating}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {state.composingPlan?.isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {selectedCards.map((card, index) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-move hover:border-gray-300 transition-colors ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-2xl">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {card.title}
                    </h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {card.type.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>{card.metadata?.source?.replace('_', ' ') || 'Unknown'}</span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {card.content.substring(0, 200)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <div className="text-gray-400 text-xl cursor-move">
                    ⋮⋮
                  </div>
                  <button
                    onClick={() => removeCard(card.id)}
                    className="text-red-600 hover:text-red-800 transition-colors p-1 rounded"
                    title="Remove from composing plan"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedCards.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📋 Report Structure Preview</h4>
            <p className="text-blue-800 text-sm mb-3">
              Your report will be generated using these {selectedCards.length} cards in the order shown above.
            </p>
            <div className="space-y-1">
              {selectedCards.map((card, index) => (
                <div key={card.id} className="text-sm text-blue-700">
                  {index + 1}. {card.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComposingPlanCanvas