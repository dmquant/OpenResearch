import LLMAbstractionLayer from './LLMAbstractionLayer.js';
import { workerApiService } from './WorkerApiService.js';

/**
 * Hybrid LLM Service - Uses existing LLMAbstractionLayer for AI, adds Worker infrastructure
 * This extends the comprehensive local LLM service with cloud storage capabilities
 */
class HybridLLMService {
  constructor() {
    // Use the existing, well-tested LLM service
    this.llm = LLMAbstractionLayer;
    
    // Check if worker API is available
    this.isWorkerEnabled = !!import.meta.env.VITE_WORKER_API_URL;
    
    // Only log once during first initialization
    if (!HybridLLMService._initialized) {
      console.log('🔧 HybridLLMService initialized:', {
        llmReady: !!this.llm,
        workerEnabled: this.isWorkerEnabled,
        workerUrl: this.isWorkerEnabled ? '✅ Connected' : '❌ Not configured'
      });
      HybridLLMService._initialized = true;
    }
  }

  /**
   * Generate research plan using local LLM and optionally store via Worker
   */
  async generateResearchPlan(topic) {
    console.log('🚀 Generating research plan with hybrid service for:', topic);

    try {
      // Generate plan using the existing, comprehensive LLM service
      const plan = await this.llm.generateResearchPlan(topic);
      console.log('✅ Plan generated locally:', plan);

      // If worker is available, store the plan for persistence and collaboration
      if (this.isWorkerEnabled) {
        try {
          // Create project in worker infrastructure
          const project = await workerApiService.createProject({
            title: plan.title,
            description: plan.description,
            topic: topic,
            metadata: {
              estimatedDuration: plan.estimatedDuration,
              taskCount: plan.tasks.length
            }
          });

          console.log('📁 Project created in worker:', project.id);

          // Store the plan in worker infrastructure (KV)
          const storedPlan = await workerApiService.storePlan(project.id, {
            plan: plan
          });

          console.log('💾 Plan stored in worker infrastructure:', storedPlan.id);

          // Save full plan content to R2 for persistent storage
          await this.savePlanToR2(project.id, plan);

          console.log('📄 Plan content saved to R2 storage');

          // Return enhanced plan with project context
          return {
            ...plan,
            projectId: project.id,
            storedPlanId: storedPlan.id,
            cloudStorage: true,
            infrastructure: 'worker'
          };

        } catch (workerError) {
          console.warn('⚠️ Worker storage failed, using local-only mode:', workerError);
          
          // Return local plan with fallback indicator
          return {
            ...plan,
            projectId: null,
            cloudStorage: false,
            infrastructure: 'local',
            storageWarning: 'Cloud storage unavailable - plan generated locally only'
          };
        }
      }

      // Return local-only plan
      return {
        ...plan,
        projectId: null,
        cloudStorage: false,
        infrastructure: 'local'
      };

    } catch (error) {
      console.error('❌ Error in hybrid plan generation:', error);
      throw error; // Let the LLM service handle its own fallbacks
    }
  }

  /**
   * Execute research plan - uses local LLM for content generation
   */
  async executeResearchPlan(projectId, plan, callbacks = {}) {
    console.log('🎯 Executing research plan with hybrid service');

    const { onStart, onTaskStart, onTaskComplete, onTaskError, onComplete, onError } = callbacks;

    try {
      if (onStart) onStart();

      let generatedCards = [];

      // Execute each task locally using the comprehensive LLM service
      for (let i = 0; i < plan.tasks.length; i++) {
        const task = plan.tasks[i];
        
        try {
          if (onTaskStart) onTaskStart(task.id, task);

          console.log(`🔍 Executing task ${i + 1}/${plan.tasks.length}: ${task.title}`);
          
          // Use the existing LLM service to execute the task
          const card = await this.llm.executeResearchTask(task);
          generatedCards.push(card);

          // Store card in worker if available
          if (this.isWorkerEnabled && projectId) {
            try {
              await this.storeCardInWorker(projectId, task.id, card);
            } catch (storageError) {
              console.warn('⚠️ Card storage failed:', storageError);
            }
          }

          if (onTaskComplete) {
            onTaskComplete(task.id, 'completed', { card });
          }

        } catch (taskError) {
          console.error(`❌ Task ${task.title} failed:`, taskError);
          if (onTaskError) onTaskError(task.id, taskError);
        }
      }

      if (onComplete) {
        onComplete('completed', { 
          cardsGenerated: generatedCards.length,
          cards: generatedCards
        });
      }

      return generatedCards;

    } catch (error) {
      console.error('❌ Error executing research plan:', error);
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Store card in worker infrastructure with embedding and R2 backup
   */
  async storeCardInWorker(projectId, taskId, card) {
    if (!this.isWorkerEnabled) {
      console.warn('⚠️ Worker not enabled, skipping card storage');
      return null;
    }

    if (!projectId) {
      console.warn('⚠️ No projectId provided, skipping card storage');
      return null;
    }

    try {
      console.log('💾 Storing card to worker infrastructure:', {
        projectId,
        taskId,
        cardTitle: card.title
      });
      
      // Store card via worker API (worker will automatically generate embeddings and save to D1, R2, and Vectorize)
      const storedCard = await workerApiService.storeCard(projectId, {
        taskId: taskId,
        title: card.title,
        content: card.content,
        type: card.type,
        metadata: {
          ...card.metadata,
          originalId: card.id,
          contentType: 'research_card',
          savedAt: new Date().toISOString()
        }
      });

      console.log('✅ Card stored successfully:', {
        cardId: storedCard.id,
        projectId: projectId
      });
      
      return storedCard;

    } catch (error) {
      console.error('❌ Failed to store card in worker:', error);
      // Don't throw - card storage failure shouldn't break the research flow
      return null;
    }
  }

  /**
   * DEPRECATED: Generate embedding for text using gemini-embedding-001 model with rate limiting
   * Note: Embedding generation has been moved to the worker (server-side) for better performance
   */
  async generateEmbedding(text, retryCount = 0) {
    console.warn('⚠️ DEPRECATED: generateEmbedding called - embeddings are now generated server-side');
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    try {
      console.log('🧮 Generating embedding for text:', {
        textLength: text.length,
        textPreview: text.substring(0, 100) + '...',
        attempt: retryCount + 1
      });

      // Use the correct Google Generative AI API structure for embeddings
      let response;
      
      try {
        // Method 1: Use the correct API structure from documentation
        response = await this.llm.client.models.embedContent({
          model: 'gemini-embedding-001',
          contents: text,
        });
        
        console.log('✅ Embedding API response received:', {
          hasEmbeddings: !!response.embeddings,
          embeddingsLength: response.embeddings?.length
        });
        
      } catch (apiError) {
        // Handle rate limiting (429) and other errors
        if (apiError.status === 429 && retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.warn(`⚠️ Rate limited (429), retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateEmbedding(text, retryCount + 1);
        }
        
        console.warn('⚠️ Embedding API failed, falling back to simple vector...', apiError);
        
        // Fallback: Create a simple hash-based embedding
        const simpleEmbedding = this.createSimpleEmbedding(text);
        console.log('✅ Using fallback embedding:', {
          dimensions: simpleEmbedding.length,
          method: 'simple-hash'
        });
        return simpleEmbedding;
      }

      // Extract the embedding values from the response (note: it's embeddings array, not embedding)
      const embedding = response.embeddings?.[0]?.values;
      
      if (!embedding || !Array.isArray(embedding)) {
        console.error('Invalid embedding response:', response);
        // Fall back to simple embedding
        return this.createSimpleEmbedding(text);
      }

      // Truncate to 1536 dimensions (Cloudflare Vectorize limit)
      const truncatedEmbedding = embedding.slice(0, 1536);

      console.log('✅ Embedding generated successfully:', {
        originalDimensions: embedding.length,
        truncatedDimensions: truncatedEmbedding.length,
        sampleValues: truncatedEmbedding.slice(0, 5).map(v => v.toFixed(4))
      });

      return truncatedEmbedding;
      
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      
      // Fall back to simple embedding
      return this.createSimpleEmbedding(text);
    }
  }

  /**
   * Create a simple hash-based embedding as fallback
   */
  createSimpleEmbedding(text) {
    console.log('🔄 Creating simple hash-based embedding...');
    
    // Create a 1536-dimensional vector based on text content (matching Vectorize limit)
    const embedding = new Array(1536).fill(0);
    
    // Simple hash function to create deterministic but distributed values
    for (let i = 0; i < text.length && i < 1536; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % 1536] += (charCode * 0.001) % 1;
    }
    
    // Normalize to make it more realistic
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }
    
    console.log('✅ Simple embedding created:', {
      dimensions: embedding.length,
      sampleValues: embedding.slice(0, 5).map(v => v.toFixed(4))
    });
    
    return embedding;
  }

  /**
   * Generate bilingual report using local LLM and optionally store via Worker
   */
  async generateBilingualReport(selectedCards, topic, originalLanguage = 'english') {
    console.log('📝 Generating bilingual report with hybrid service');

    try {
      // Use the existing LLM service for report generation
      const reports = await this.llm.generateBilingualReport(selectedCards, topic, originalLanguage);
      
      // Store reports in worker if available - immediately when composed
      if (this.isWorkerEnabled && selectedCards[0]?.projectId) {
        try {
          const projectId = selectedCards[0].projectId;
          
          // Store both language versions with embeddings
          for (const [language, report] of Object.entries(reports)) {
            console.log(`🧮 Generating embedding for ${language} report:`, report.title);
            
            console.log(`💾 Storing ${language} report to worker infrastructure:`, {
              projectId,
              reportTitle: report.title
            });

            // Store report with enhanced metadata (worker will generate embeddings)
            await workerApiService.storeReport(projectId, {
              report: {
                title: report.title,
                content: report.content,
                language: language,
                report_type: 'comprehensive',
                metadata: {
                  topic: topic,
                  originalLanguage: originalLanguage,
                  cardCount: selectedCards.length,
                  contentType: 'bilingual_report',
                  generatedAt: new Date().toISOString()
                }
              }
            });

            console.log(`✅ ${language} report stored successfully`);
          }
          
          console.log('💾 All reports stored in worker infrastructure');
          
        } catch (storageError) {
          console.warn('⚠️ Report storage failed:', storageError);
        }
      }

      return reports;

    } catch (error) {
      console.error('❌ Error generating bilingual report:', error);
      throw error;
    }
  }

  /**
   * Simple semantic search across all content (requires worker infrastructure)
   */
  async globalSemanticSearch(query, limit = 20) {
    if (!this.isWorkerEnabled) {
      throw new Error('Semantic search requires cloud infrastructure');
    }

    try {
      console.log('🔍 Starting global semantic search:', { query, limit });

      // First get all projects
      const projects = await this.listAllProjects();
      
      console.log('📋 Found projects for search:', {
        projectCount: projects.length
      });

      console.log('🔍 Performing global search:', {
        queryPreview: query.substring(0, 50),
        projectCount: projects.length
      });

      let allResults = [];

      try {
        // Use global search endpoint
        const globalResults = await workerApiService.request('/api/search', {
          method: 'POST',
          body: JSON.stringify({
            query: query,
            limit: limit
          })
        });

        // Enhance results with project information
        const enhancedResults = await Promise.all(globalResults.map(async (result) => {
          try {
            const project = projects.find(p => p.id === result.metadata.projectId);
            return {
              ...result,
              projectTitle: project?.title || 'Unknown Project'
            };
          } catch (error) {
            return {
              ...result,
              projectTitle: 'Unknown Project'
            };
          }
        }));

        allResults = enhancedResults;
        
      } catch (globalError) {
        console.warn('⚠️ Global search failed, falling back to project-by-project search:', globalError.message);
        
        // Fallback: search individual projects
        const projectsWithContent = projects.filter(p => p.id && p.title);
        const searchLimit = Math.min(10, projectsWithContent.length);
        
        for (let i = 0; i < searchLimit; i++) {
          const project = projectsWithContent[i];
          
          try {
            console.log(`🔍 Searching project ${i + 1}/${searchLimit}: ${project.title.substring(0, 30)}...`);
            
            const projectResults = await workerApiService.request(`/api/projects/${project.id}/search`, {
              method: 'POST',
              body: JSON.stringify({
                query: query,
                limit: Math.ceil(limit / searchLimit)
              })
            });

            const enhancedResults = projectResults.map(result => ({
              ...result,
              projectId: project.id,
              projectTitle: project.title
            }));

            allResults = allResults.concat(enhancedResults);
            
          } catch (projectError) {
            console.warn(`⚠️ Search failed for project ${project.id}:`, projectError.message);
          }
        }
      }

      // Sort by relevance score and limit results
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      const finalResults = allResults.slice(0, limit);

      console.log('✅ Global semantic search completed:', {
        totalResults: allResults.length,
        finalResults: finalResults.length,
        topScore: finalResults[0]?.score
      });

      return finalResults;

    } catch (error) {
      console.error('❌ Error in global semantic search:', error);
      throw error;
    }
  }

  /**
   * Project-specific semantic search (requires worker infrastructure)
   */
  async semanticSearch(projectId, query, limit = 10) {
    if (!this.isWorkerEnabled) {
      throw new Error('Semantic search requires cloud infrastructure');
    }

    try {
      console.log('🔍 Starting semantic search:', { projectId, query, limit });

      // Search via worker API using text query
      const results = await workerApiService.request(`/api/projects/${projectId}/search`, {
        method: 'POST',
        body: JSON.stringify({
          query: query,
          limit: limit
        })
      });

      console.log('✅ Semantic search completed:', {
        resultsCount: results.length,
        topScore: results[0]?.score
      });

      return results;

    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * RAG (Retrieval Augmented Generation) - Search R2 content and generate enhanced responses
   */
  async performRAG(projectId, query, context = {}) {
    if (!this.isWorkerEnabled) {
      throw new Error('RAG requires cloud infrastructure');
    }

    try {
      console.log('🤖 Starting RAG process:', { projectId, query });

      // Step 1: Semantic search to find relevant content
      const searchResults = await this.semanticSearch(projectId, query, context.searchLimit || 5);
      
      if (!searchResults || searchResults.length === 0) {
        console.log('⚠️ No relevant content found for RAG');
        // Fallback to direct LLM response
        return await this.llm.client.models.generateContent({
          model: this.llm.modelName,
          contents: `${query}\n\nNote: No specific project context was found for this query.`
        });
      }

      console.log('📚 Found relevant content:', {
        resultsCount: searchResults.length,
        topTitles: searchResults.slice(0, 3).map(r => r.title)
      });

      // Step 2: Retrieve full content from R2 for top results
      const retrievedContent = await this.retrieveContentFromR2(searchResults);

      // Step 3: Generate enhanced response using retrieved content
      const contextualContent = retrievedContent.map((content, index) => {
        const result = searchResults[index];
        return `## Source ${index + 1}: ${result.title} (Relevance: ${(result.score * 100).toFixed(1)}%)

${content}

---`;
      }).join('\n\n');

      const ragPrompt = `Based on the following retrieved project content, provide a comprehensive and accurate answer to the user's question.

User Question: ${query}

Retrieved Project Content:
${contextualContent}

Please provide a well-structured response that:
1. Directly answers the user's question
2. References specific information from the retrieved content
3. Maintains accuracy by staying close to the source material
4. Indicates which sources support each claim
5. Notes any limitations or gaps in the available information

Response:`;

      console.log('🧠 Generating RAG response with context');
      const response = await this.llm.client.models.generateContent({
        model: this.llm.modelName,
        contents: ragPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      });

      const ragResponse = {
        answer: response.text,
        sources: searchResults.map(result => ({
          title: result.title,
          relevanceScore: result.score,
          cardId: result.cardId,
          preview: result.content
        })),
        metadata: {
          query: query,
          sourcesUsed: searchResults.length,
          projectId: projectId,
          generatedAt: new Date().toISOString(),
          method: 'RAG'
        }
      };

      console.log('✅ RAG response generated successfully');
      return ragResponse;

    } catch (error) {
      console.error('❌ Error in RAG process:', error);
      throw error;
    }
  }

  /**
   * Save research plan content to R2 storage
   */
  async savePlanToR2(projectId, plan) {
    if (!this.isWorkerEnabled) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const planContent = JSON.stringify(plan, null, 2);
      
      // Create a comprehensive plan document
      const planDocument = {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        estimatedDuration: plan.estimatedDuration,
        tasks: plan.tasks,
        metadata: {
          projectId: projectId,
          createdAt: timestamp,
          taskCount: plan.tasks.length,
          contentType: 'research_plan'
        },
        content: planContent
      };

      // Save to R2 via a custom endpoint (we'll need to add this to the worker)
      const response = await workerApiService.request(`/api/projects/${projectId}/plans/r2`, {
        method: 'POST',
        body: JSON.stringify({
          planDocument: planDocument,
          fileName: `${timestamp}-research-plan.json`
        })
      });

      console.log('✅ Plan saved to R2:', response);
      return response;

    } catch (error) {
      console.error('❌ Failed to save plan to R2:', error);
      // Don't throw - plan saving to R2 is supplementary
    }
  }

  /**
   * Retrieve full content from R2 for search results
   */
  async retrieveContentFromR2(searchResults) {
    try {
      // For now, use the preview content from search results
      // In a full implementation, you might fetch full content from R2 using the r2Path
      const retrievedContent = searchResults.map(result => {
        // Use the content preview from the search result metadata
        return result.content || result.metadata?.contentPreview || 'Content not available';
      });

      console.log('📄 Retrieved content from search results:', {
        itemsRetrieved: retrievedContent.length,
        avgLength: Math.round(retrievedContent.reduce((sum, content) => sum + content.length, 0) / retrievedContent.length),
        r2Paths: searchResults.map(r => r.r2Path).filter(Boolean)
      });

      return retrievedContent;

    } catch (error) {
      console.error('❌ Error retrieving content from R2:', error);
      // Return empty content rather than failing
      return searchResults.map(() => 'Content retrieval failed');
    }
  }

  /**
   * Export project data or get project list
   */
  async exportProject(projectId) {
    if (!this.isWorkerEnabled) {
      throw new Error('Project export requires cloud infrastructure');
    }

    // Special case: list all projects
    if (projectId === 'list-all') {
      return this.listAllProjects();
    }

    return workerApiService.exportProject(projectId);
  }

  /**
   * Get list of all projects
   */
  async listAllProjects() {
    if (!this.isWorkerEnabled) {
      throw new Error('Project listing requires cloud infrastructure');
    }

    try {
      console.log('📋 Fetching project list...');
      
      const response = await workerApiService.request('/api/projects', {
        method: 'GET'
      });

      console.log('✅ Projects retrieved:', {
        count: response.length
      });

      return response;
      
    } catch (error) {
      console.error('❌ Failed to list projects:', error);
      throw error;
    }
  }

  /**
   * Get all cards for a specific project
   */
  async getProjectCards(projectId) {
    if (!this.isWorkerEnabled) {
      throw new Error('Card retrieval requires cloud infrastructure');
    }

    try {
      console.log('📄 Fetching cards for project:', projectId);
      
      const cards = await workerApiService.getProjectCards(projectId);

      console.log('✅ Cards retrieved:', {
        projectId,
        count: cards.length
      });

      return cards;
      
    } catch (error) {
      console.error('❌ Failed to get project cards:', error);
      throw error;
    }
  }

  /**
   * Get all reports for a specific project
   */
  async getProjectReports(projectId) {
    if (!this.isWorkerEnabled) {
      throw new Error('Report retrieval requires cloud infrastructure');
    }

    try {
      console.log('📊 Fetching reports for project:', projectId);
      
      const reports = await workerApiService.getProjectReports(projectId);

      console.log('✅ Reports retrieved:', {
        projectId,
        count: reports.length
      });

      return reports;
      
    } catch (error) {
      console.error('❌ Failed to get project reports:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics across all projects
   */
  async getDashboardStatistics() {
    if (!this.isWorkerEnabled) {
      throw new Error('Statistics require cloud infrastructure');
    }

    try {
      console.log('📈 Fetching dashboard statistics...');
      
      const projects = await this.listAllProjects();
      
      // Fetch cards and reports for each project in parallel
      const projectDetails = await Promise.all(
        projects.map(async (project) => {
          try {
            const [cards, reports] = await Promise.all([
              this.getProjectCards(project.id),
              this.getProjectReports(project.id)
            ]);
            
            return {
              ...project,
              cardCount: cards.length,
              reportCount: reports.length,
              cards,
              reports
            };
          } catch (error) {
            console.warn(`Failed to get details for project ${project.id}:`, error);
            return {
              ...project,
              cardCount: 0,
              reportCount: 0,
              cards: [],
              reports: []
            };
          }
        })
      );

      const stats = {
        totalProjects: projects.length,
        totalCards: projectDetails.reduce((sum, p) => sum + p.cardCount, 0),
        totalReports: projectDetails.reduce((sum, p) => sum + p.reportCount, 0),
        activeProjects: projects.filter(p => p.status === 'executing' || p.status === 'planning' || p.status === 'planned').length,
        projects: projectDetails
      };

      console.log('✅ Dashboard statistics computed:', stats);

      return stats;
      
    } catch (error) {
      console.error('❌ Failed to get dashboard statistics:', error);
      throw error;
    }
  }

  // Delegate all other methods to the existing LLM service
  async executeResearchTask(task) {
    return this.llm.executeResearchTask(task);
  }

  async synthesizeCard(rawData, cardType) {
    return this.llm.synthesizeCard(rawData, cardType);
  }

  async translateContent(content, fromLang, toLang) {
    return this.llm.translateContent(content, fromLang, toLang);
  }

  getCardTypeFromTask(taskType) {
    return this.llm.getCardTypeFromTask(taskType);
  }

  extractCitations(groundingMetadata) {
    return this.llm.extractCitations(groundingMetadata);
  }

  splitContentIntoBlocks(content, maxBlockSize) {
    return this.llm.splitContentIntoBlocks(content, maxBlockSize);
  }
}

// Initialize static property
HybridLLMService._initialized = false;

export { HybridLLMService };