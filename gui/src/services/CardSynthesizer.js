import LLMAbstractionLayer from './LLMAbstractionLayer'
import { CARD_TYPES } from '../types'

class CardSynthesizer {
  async synthesize(rawData, taskType) {
    console.log(`Synthesizing card from ${taskType} data:`, rawData.title)

    // Determine appropriate card type based on data
    const cardType = this.determineCardType(rawData, taskType)
    
    // Use LLM to synthesize the raw data into a structured card
    const card = await LLMAbstractionLayer.synthesizeCard(rawData, cardType)
    
    return {
      ...card,
      originalTask: taskType,
      rawData: rawData,
      synthesizedAt: new Date().toISOString()
    }
  }

  determineCardType(rawData, taskType) {
    // Simple heuristics to determine card type
    // In real implementation, would use more sophisticated analysis
    
    if (rawData.data?.results?.length > 0) {
      return CARD_TYPES.TEXT_SUMMARY
    }
    
    if (rawData.data?.records?.length > 0) {
      return CARD_TYPES.TABLE
    }
    
    if (rawData.source === 'web_search') {
      return CARD_TYPES.TEXT_SUMMARY
    }
    
    return CARD_TYPES.TEXT_SUMMARY
  }

  async createCustomCard(type, content, metadata = {}) {
    return {
      id: Date.now(),
      type,
      title: content.title || 'Custom Card',
      content: content.body || content.text || '',
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        source: 'manual'
      }
    }
  }
}

export default new CardSynthesizer()