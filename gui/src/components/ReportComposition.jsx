import { useState } from 'react'
import { useWorkflow } from '../context/WorkflowContext'
import { WORKFLOW_PHASES } from '../types'
import ComposingPlanCanvas from './ComposingPlanCanvas'
import BilingualMDXEditor from './BilingualMDXEditor'

const ReportComposition = () => {
  const { state, dispatch } = useWorkflow()
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Show composition section if we're in execution and have cards, OR if we're already in composition phase
  const shouldShow = (state.currentPhase === WORKFLOW_PHASES.EXECUTION && 
                     state.executionData?.cards && 
                     state.executionData.cards.length > 0) ||
                     state.currentPhase === WORKFLOW_PHASES.COMPOSITION

  const startComposition = async () => {
    console.log('🚀 ReportComposition: Starting composition phase transition')
    console.log('📊 Current State:', {
      currentPhase: state.currentPhase,
      topic: state.topic,
      hasExecutionData: !!state.executionData,
      cardCount: state.executionData?.cards?.length || 0,
      composingPlanState: {
        selectedCardsCount: state.composingPlan?.selectedCards?.length || 0,
        hasGeneratedReport: !!state.composingPlan?.generatedReport,
        isGenerating: state.composingPlan?.isGenerating
      }
    })
    
    setIsTransitioning(true)
    
    try {
      console.log('📝 Dispatching SET_PHASE action to COMPOSITION')
      dispatch({ type: 'SET_PHASE', payload: WORKFLOW_PHASES.COMPOSITION })
      
      // Auto-select all available cards for the composing plan
      const availableCards = state.executionData?.cards || []
      if (availableCards.length > 0) {
        console.log('📦 Auto-adding all cards to composing plan:', {
          cardCount: availableCards.length,
          cardTitles: availableCards.map(card => card.title)
        })
        
        dispatch({
          type: 'SET_ALL_CARDS_TO_COMPOSING_PLAN',
          payload: availableCards
        })
        
        console.log('✅ All cards automatically added to composing plan')
      }
      
      // Small delay to ensure state update is processed
      setTimeout(() => {
        setIsTransitioning(false)
        console.log('✅ Phase transition completed successfully')
      }, 100)
    } catch (error) {
      console.error('❌ Error during phase transition:', error)
      setIsTransitioning(false)
    }
  }

  if (!shouldShow) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Phase Transition */}
      {state.currentPhase === WORKFLOW_PHASES.EXECUTION && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🎉 Research Phase Complete!
              </h3>
              <p className="text-gray-700 mb-1">
                Your research cards are ready. Time to compose your report!
              </p>
              <p className="text-sm text-gray-600">
                Select cards from the research results below to include in your report, then generate and edit your final document.
              </p>
            </div>
            <button
              onClick={startComposition}
              disabled={isTransitioning}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 active:scale-95"
            >
              {isTransitioning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Adding All Cards...</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>Start Report Composition</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Composition Phase */}
      {state.currentPhase === WORKFLOW_PHASES.COMPOSITION && (
        <div className="space-y-8">
          <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              📝 Phase 2: Report Composition
            </h2>
            <p className="text-gray-600">
              Compose your research into a comprehensive report using the tools below.
            </p>
          </div>

          {/* Composing Plan Canvas */}
          <ComposingPlanCanvas />

          {/* Bilingual MDX Editor - show if we have any report */}
          {(state.composingPlan?.generatedReport || state.bilingual?.reports?.english || state.bilingual?.reports?.chinese) && (
            <BilingualMDXEditor />
          )}

          {/* Help Section */}
          {state.composingPlan?.selectedCards?.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-medium text-blue-900 mb-3">🚀 How to compose your report:</h3>
              <div className="space-y-2 text-blue-800 text-sm">
                <p><strong>All research cards have been automatically added to your composing plan!</strong></p>
                <p><strong>Step 1:</strong> Review and arrange your cards in the desired order using drag-and-drop in the Composing Plan Canvas above.</p>
                <p><strong>Step 2:</strong> Remove any cards you don't want to include by clicking the "✕" button.</p>
                <p><strong>Step 3:</strong> Click "Generate Report" to create an initial MDX report from your selected cards.</p>
                <p><strong>Step 4:</strong> Edit the generated report in the MDX Editor and export it as markdown or MDX.</p>
              </div>
            </div>
          )}
          
          {/* Instructions when cards are selected */}
          {state.composingPlan?.selectedCards?.length > 0 && !state.composingPlan?.generatedReport && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-medium text-green-900 mb-3">✅ Ready to Generate Your Report!</h3>
              <div className="space-y-2 text-green-800 text-sm">
                <p>You have <strong>{state.composingPlan.selectedCards.length} cards</strong> selected for your report.</p>
                <p><strong>Next steps:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Reorder cards by dragging them in the Composing Plan Canvas</li>
                  <li>Remove unwanted cards by clicking the "✕" button</li>
                  <li>Click "Generate Report" when you're satisfied with your selection</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportComposition