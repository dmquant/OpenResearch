import { createContext, useContext, useReducer } from 'react'
import { WORKFLOW_PHASES } from '../types'

const WorkflowContext = createContext()

const initialState = {
  currentPhase: WORKFLOW_PHASES.TOPIC_INPUT,
  topic: '',
  researchPlan: null,
  executionData: null,
  composingPlan: {
    selectedCards: [],
    generatedReport: null,
    isGenerating: false
  },
  isLoading: false,
  error: null
}

function workflowReducer(state, action) {
  console.log('🔄 WorkflowContext: Action dispatched', {
    type: action.type,
    payload: action.type === 'ADD_TO_COMPOSING_PLAN' ? 
      { cardId: action.payload?.id, cardTitle: action.payload?.title } : 
      action.payload,
    currentPhase: state.currentPhase
  })
  
  switch (action.type) {
    case 'SET_TOPIC':
      console.log('📝 Setting topic:', action.payload)
      return { ...state, topic: action.payload }
    
    case 'SET_PHASE':
      console.log('🔄 Phase transition:', {
        from: state.currentPhase,
        to: action.payload
      })
      return { ...state, currentPhase: action.payload }
    
    case 'SET_RESEARCH_PLAN':
      return { ...state, researchPlan: action.payload }
    
    case 'SET_EXECUTION_DATA':
      return { ...state, executionData: action.payload }
    
    case 'UPDATE_EXECUTION_DATA':
      return { 
        ...state, 
        executionData: state.executionData ? { 
          ...state.executionData, 
          ...action.payload,
          // Special handling for cards array - append instead of replace
          cards: action.payload.cards !== undefined 
            ? action.payload.cards 
            : state.executionData.cards,
          // Special handling for taskStatuses - merge instead of replace
          taskStatuses: action.payload.taskStatuses !== undefined
            ? { ...state.executionData.taskStatuses, ...action.payload.taskStatuses }
            : state.executionData.taskStatuses
        } : action.payload 
      }
    
    case 'APPEND_EXECUTION_CARD':
      return {
        ...state,
        executionData: state.executionData ? {
          ...state.executionData,
          cards: [...(state.executionData.cards || []), action.payload]
        } : { cards: [action.payload] }
      }
    
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        executionData: state.executionData ? {
          ...state.executionData,
          taskStatuses: {
            ...state.executionData.taskStatuses,
            [action.payload.taskId]: action.payload.status
          }
        } : { taskStatuses: { [action.payload.taskId]: action.payload.status } }
      }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'ADD_TO_COMPOSING_PLAN':
      const cardExists = state.composingPlan.selectedCards.some(card => card.id === action.payload.id)
      
      console.log('📝 Adding card to composing plan:', {
        cardId: action.payload.id,
        cardTitle: action.payload.title,
        alreadyExists: cardExists,
        currentSelectionCount: state.composingPlan.selectedCards.length
      })
      
      if (cardExists) {
        console.log('⚠️ Card already exists in composing plan, skipping')
        return state
      }
      
      const newState = {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          selectedCards: [...state.composingPlan.selectedCards, action.payload]
        }
      }
      
      console.log('✅ Card added successfully, new selection count:', newState.composingPlan.selectedCards.length)
      return newState
    
    case 'REMOVE_FROM_COMPOSING_PLAN':
      const beforeCount = state.composingPlan.selectedCards.length
      const cardToRemove = state.composingPlan.selectedCards.find(card => card.id === action.payload)
      
      console.log('🗑️ Removing card from composing plan:', {
        cardId: action.payload,
        cardTitle: cardToRemove?.title || 'Unknown',
        beforeCount
      })
      
      const newStateAfterRemoval = {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          selectedCards: state.composingPlan.selectedCards.filter(card => card.id !== action.payload)
        }
      }
      
      console.log('✅ Card removed successfully, new count:', newStateAfterRemoval.composingPlan.selectedCards.length)
      return newStateAfterRemoval
    
    case 'SET_ALL_CARDS_TO_COMPOSING_PLAN':
      console.log('📦 Setting all cards to composing plan:', {
        cardCount: action.payload.length,
        cardTitles: action.payload.map(card => card.title),
        previousSelectionCount: state.composingPlan.selectedCards.length
      })
      
      return {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          selectedCards: [...action.payload] // Replace all selected cards with the new set
        }
      }
    
    case 'REORDER_COMPOSING_PLAN':
      console.log('🔄 Reordering composing plan cards:', {
        newOrder: action.payload.map((card, index) => `${index + 1}. ${card.title}`)
      })
      
      return {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          selectedCards: action.payload
        }
      }
    
    case 'SET_GENERATING_REPORT':
      return {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          isGenerating: action.payload
        }
      }
    
    case 'SET_GENERATED_REPORT':
      console.log('📄 Setting generated report:', {
        title: action.payload?.title,
        contentLength: action.payload?.content?.length || 0,
        sourceCards: action.payload?.sourceCards
      })
      
      return {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          generatedReport: action.payload,
          isGenerating: false
        }
      }
    
    case 'UPDATE_GENERATED_REPORT':
      return {
        ...state,
        composingPlan: {
          ...state.composingPlan,
          generatedReport: action.payload
        }
      }
    
    case 'RESET_WORKFLOW':
      console.log('🔄 Resetting workflow to initial state')
      return initialState
    
    default:
      console.log('⚠️ Unknown action type:', action.type)
      return state
  }
}

export function WorkflowProvider({ children }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState)

  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}