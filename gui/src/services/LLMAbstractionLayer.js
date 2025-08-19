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
    const groundingTool = {
      googleSearch: {}
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
}
Please process date carefully, since research is time-sensitive, so plan should align to current date and time.`

    try {
      console.log('Calling Gemini API with model:', this.modelName)
      
      // Use the new API format from the official documentation
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: -1 // Disable thinking for faster responses
          },
          tools: [groundingTool],
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

  // Helper method to split content into manageable blocks for translation
  splitContentIntoBlocks(content, maxBlockSize = 30000) {
    console.log('🔧 Splitting content into translation blocks', {
      contentLength: content.length,
      maxBlockSize
    })

    const blocks = []
    const lines = content.split('\n')
    let currentBlock = ''
    
    for (const line of lines) {
      // If adding this line would exceed max size and we have content, save current block
      if (currentBlock.length + line.length + 1 > maxBlockSize && currentBlock.trim()) {
        blocks.push(currentBlock.trim())
        currentBlock = line
      } else {
        currentBlock += (currentBlock ? '\n' : '') + line
      }
    }
    
    // Add the last block if it has content
    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim())
    }

    console.log('✅ Content split into blocks', {
      totalBlocks: blocks.length,
      blockSizes: blocks.map(block => block.length)
    })

    return blocks
  }

  // Translate content from one language to another
  async translateContent(content, fromLang, toLang) {
    console.log('🌍 Starting content translation', {
      fromLang,
      toLang,
      contentLength: content.length
    })

    const langNames = {
      english: 'English',
      chinese: 'Simplified Chinese'
    }

    try {
      // Split content into manageable blocks
      const blocks = this.splitContentIntoBlocks(content, 30000) // Leave room for prompt
      const translatedBlocks = []

      console.log(`📝 Translating ${blocks.length} blocks from ${langNames[fromLang]} to ${langNames[toLang]}`)

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        console.log(`🔄 Translating block ${i + 1}/${blocks.length} (${block.length} chars)`)

        const prompt = `Translate the following ${langNames[fromLang]} content to ${langNames[toLang]}. 
        
IMPORTANT INSTRUCTIONS:
- Maintain all MDX formatting, markdown syntax, and structure exactly
- Keep all code blocks, headings, links, and special characters intact
- Preserve frontmatter, metadata, and technical terms appropriately
- For technical terms, use commonly accepted ${langNames[toLang]} translations
- Maintain professional and academic tone
- Do not add any explanations or notes, just return the translated content

Content to translate:
${block}`

        try {
          const response = await this.client.models.generateContent({
            model: this.modelName,
            contents: prompt,
            config: {
              thinkingConfig: {
                thinkingBudget: 0
              }
            }
          })

          const translatedBlock = response.text.trim()
          translatedBlocks.push(translatedBlock)
          
          console.log(`✅ Block ${i + 1} translated successfully`)
          
          // Small delay between blocks to be respectful to the API
          if (i < blocks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
        } catch (blockError) {
          console.error(`❌ Error translating block ${i + 1}:`, blockError)
          // Keep original block if translation fails
          translatedBlocks.push(block)
        }
      }

      const translatedContent = translatedBlocks.join('\n\n')
      
      console.log('✅ Translation completed', {
        originalLength: content.length,
        translatedLength: translatedContent.length,
        blocksProcessed: blocks.length
      })

      return translatedContent

    } catch (error) {
      console.error('❌ Error during translation:', error)
      throw new Error(`Translation failed: ${error.message}`)
    }
  }

  // Generate bilingual report (both English and Chinese versions)
  async generateBilingualReport(selectedCards, topic, originalLanguage = 'english') {
    console.log('🌍 Generating bilingual report', {
      originalLanguage,
      cardsCount: selectedCards.length,
      topic
    })

    try {
      // First, generate the report in the original language
      const cardContents = selectedCards.map((card, index) => {
        return `## Section ${index + 1}: ${card.title}

**Type:** ${card.type.replace('_', ' ')}
**Source:** ${card.metadata?.source?.replace('_', ' ') || 'Unknown'}

${card.content}

---`
      }).join('\n\n')

      const prompt = `Create a comprehensive, well-structured report in MDX format using the following research cards. 

Research Topic: ${topic}

Available Research Data:
${cardContents}

Please create an in-depth report that:
1. Has a clear title and structure
2. Synthesizes information from all provided cards
3. Uses MDX components for rich formatting
4. Includes proper headings, sections, and flow
5. Cites sources appropriately
6. Provides analysis and insights, not just a summary
7. Is suitable for professional or academic use

Format the response as valid MDX with:
- Frontmatter with title and metadata
- Proper heading hierarchy
- Rich text formatting
- Code blocks where appropriate
- Tables for data presentation

Return only the MDX content, ready to be used in an MDX editor.`

      console.log('🤖 Generating original report...')
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })

      const originalContent = response.text
      console.log('✅ Original report generated')

      // Then translate to the other language
      const targetLanguage = originalLanguage === 'english' ? 'chinese' : 'english'
      console.log(`🔄 Translating to ${targetLanguage}...`)
      
      const translatedContent = await this.translateContent(originalContent, originalLanguage, targetLanguage)
      
      const reports = {
        [originalLanguage]: {
          content: originalContent,
          title: `Research Report: ${topic}`,
          createdAt: new Date().toISOString(),
          sourceCards: selectedCards.length,
          language: originalLanguage
        },
        [targetLanguage]: {
          content: translatedContent,
          title: originalLanguage === 'english' ? `研究报告：${topic}` : `Research Report: ${topic}`,
          createdAt: new Date().toISOString(),
          sourceCards: selectedCards.length,
          language: targetLanguage
        }
      }

      console.log('✅ Bilingual report generation completed')
      return reports

    } catch (error) {
      console.error('❌ Error generating bilingual report:', error)
      throw error
    }
  }
}

export default new LLMAbstractionLayer()