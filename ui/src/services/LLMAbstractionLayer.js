import { GoogleGenAI } from '@google/genai'

// LLM Abstraction Layer - handles all AI interactions
class LLMAbstractionLayer {
  constructor() {
    // Load from environment variables
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY
    this.modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
    
    if (!this.apiKey) {
      console.error('VITE_GEMINI_API_KEY not found in environment variables')
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.')
    }
    
    // Initialize the client with the API key
    this.client = new GoogleGenAI({
      apiKey: this.apiKey
    })
    
    console.log('LLM initialized with model:', this.modelName)
  }

  async generateResearchPlan(topic) {
    console.log('Starting research plan generation for topic:', topic)
    console.log('Model name:', this.modelName)
    console.log('Environment check:', {
      VITE_GEMINI_API_KEY: this.apiKey ? 'Present' : 'Missing',
      VITE_GEMINI_MODEL: this.modelName || 'Not set'
    })

    if (!topic || topic.trim().length === 0) {
      throw new Error('Research topic is required')
    }

    const prompt = `Create a comprehensive research plan for the topic: "${topic}"

Please provide a structured research plan with the following format:
- Title: A clear title for the research plan
- Description: A brief description of what the research will accomplish
- Tasks: In-depth research tasks, each with:
  - Title: Task name
  - Description: What this task will accomplish
  - Query: Specific search query or research question
  - Type: Either "literature_review", "current_data", "expert_analysis", or "comparative_study"

Focus on creating actionable research tasks that would provide comprehensive coverage of the topic.
Respond in JSON format with this structure:
{
  "title": "Research Plan Title",
  "description": "Brief description",
  "estimatedDuration": "X-Y minutes",
  "tasks": [
    {
      "title": "Task Title",
      "description": "Task description",
      "query": "Search query",
      "type": "task_type"
    }
  ]
}`

    try {
      console.log('Calling Gemini API with model:', this.modelName)
      
      // Use the new API format from the official documentation
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0 // Disable thinking for faster responses
          }
        }
      })
      
      const text = response.text
      console.log('Gemini API response:', text)
      
      // Extract JSON from the response - try multiple patterns
      let jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // Try to find JSON in code blocks
        jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1]
        }
      }
      
      if (!jsonMatch) {
        console.error('No JSON found in response:', text)
        throw new Error('Invalid response format from Gemini API - no JSON found')
      }
      
      let planData
      try {
        planData = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        console.error('Attempted to parse:', jsonMatch[0])
        throw new Error('Failed to parse JSON response from Gemini API')
      }
      
      // Validate required fields
      if (!planData.title || !planData.tasks || !Array.isArray(planData.tasks)) {
        console.error('Invalid plan structure:', planData)
        throw new Error('Invalid plan structure from Gemini API')
      }
      
      // Add IDs and agent assignments to tasks
      const tasksWithIds = planData.tasks.map((task, index) => ({
        ...task,
        id: `task_${Date.now()}_${index}`, // Use string IDs for better React key handling
        agent: 'web' // Simplified to only use web search for first stage
      }))
      
      return {
        id: Date.now(),
        ...planData,
        tasks: tasksWithIds
      }
      
    } catch (error) {
      console.error('Error generating research plan:', error)
      console.error('Error details:', error.message)
      
      // Fallback plan if API fails
      return {
        id: Date.now(),
        title: `Research Plan: ${topic}`,
        description: `Comprehensive research plan to analyze ${topic} (API Error - using fallback)`,
        tasks: [
          {
            id: 'task_fallback_1',
            type: 'literature_review',
            title: 'Literature Review',
            description: 'Search for academic papers and existing research',
            query: `${topic} academic research papers`,
            agent: 'web'
          },
          {
            id: 'task_fallback_2',
            type: 'current_data',
            title: 'Current Data Analysis',
            description: 'Find recent statistics and data',
            query: `${topic} current statistics data 2024`,
            agent: 'web'
          }
        ],
        estimatedDuration: '10-15 minutes'
      }
    }
  }

  async executeResearchTask(task) {
    console.log(`Executing research task: ${task.title}`)
    
    try {
      // Use Google Search grounding tool for research
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: `Research the following topic and provide a comprehensive summary with key findings:

Topic: ${task.title}
Description: ${task.description}
Research Query: ${task.query}

Please provide:
1. A clear summary of the key findings
2. Important statistics or data points
3. Recent developments or trends
4. Credible sources and citations

Focus on factual, up-to-date information that would be valuable for research purposes.`,
        config: {
          tools: [{
            googleSearch: {}
          }]
        }
      })

      const content = response.text
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata

      // Create research card from the grounded response
      return {
        id: Date.now() + Math.random(),
        type: this.getCardTypeFromTask(task.type),
        title: task.title,
        content: content,
        task: task,
        metadata: {
          source: 'google_search',
          timestamp: new Date().toISOString(),
          searchQueries: groundingMetadata?.webSearchQueries || [],
          groundingChunks: groundingMetadata?.groundingChunks || [],
          groundingSupports: groundingMetadata?.groundingSupports || [],
          taskType: task.type,
          confidence: 0.9 // High confidence for grounded results
        },
        citations: this.extractCitations(groundingMetadata)
      }
    } catch (error) {
      console.error('Error executing research task:', error)
      
      // Fallback: create a basic research card without grounding
      return {
        id: Date.now() + Math.random(),
        type: this.getCardTypeFromTask(task.type),
        title: task.title,
        content: `Research task: ${task.description}\n\nQuery: ${task.query}\n\nNote: This task requires Google Search integration to provide real-time results.`,
        task: task,
        metadata: {
          source: 'fallback',
          timestamp: new Date().toISOString(),
          taskType: task.type,
          error: error.message
        },
        citations: []
      }
    }
  }

  getCardTypeFromTask(taskType) {
    const typeMapping = {
      literature_review: 'text_summary',
      current_data: 'table',
      expert_analysis: 'text_summary',
      comparative_study: 'chart',
      web_search: 'text_summary'
    }
    return typeMapping[taskType] || 'text_summary'
  }

  extractCitations(groundingMetadata) {
    if (!groundingMetadata?.groundingChunks) return []
    
    return groundingMetadata.groundingChunks.map((chunk, index) => ({
      id: index + 1,
      title: chunk.web?.title || 'Source',
      url: chunk.web?.uri || '#',
      snippet: chunk.web?.snippet || ''
    }))
  }

  async synthesizeCard(rawData, cardType) {
    // Legacy method - kept for backward compatibility
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Date.now(),
          type: cardType,
          title: rawData.title || 'Generated Card',
          content: rawData.content || 'Synthesized content from raw data',
          metadata: {
            source: rawData.source,
            timestamp: new Date().toISOString(),
            confidence: Math.random() * 0.3 + 0.7
          }
        })
      }, 1000)
    })
  }
}

export default new LLMAbstractionLayer()