export class EmbeddingService {
  constructor(vectorize, ai) {
    this.vectorize = vectorize;
    this.ai = ai; // Cloudflare Workers AI
    this.embeddingModel = '@cf/baai/bge-base-en-v1.5';
    this.dimensions = 768; // BGE model dimensions
    this.maxChunkSize = 8000; // Maximum characters per chunk (leave room for metadata)
  }

  /**
   * Generate embeddings for text content using Cloudflare Workers AI
   */
  async generateEmbedding(text) {
    try {
      const response = await this.ai.run(this.embeddingModel, {
        text: [text]
      });
      
      return response.data[0];
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Chunk large text content into smaller pieces
   */
  chunkText(text, maxChunkSize = this.maxChunkSize) {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = currentIndex + maxChunkSize;
      
      // If we're not at the end, try to break at a sentence or paragraph
      if (endIndex < text.length) {
        const nextParagraph = text.lastIndexOf('\n\n', endIndex);
        const nextSentence = text.lastIndexOf('. ', endIndex);
        const nextSpace = text.lastIndexOf(' ', endIndex);
        
        // Prefer paragraph breaks, then sentence breaks, then word breaks
        if (nextParagraph > currentIndex + maxChunkSize * 0.5) {
          endIndex = nextParagraph + 2;
        } else if (nextSentence > currentIndex + maxChunkSize * 0.5) {
          endIndex = nextSentence + 2;
        } else if (nextSpace > currentIndex + maxChunkSize * 0.5) {
          endIndex = nextSpace + 1;
        }
      }

      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }

    return chunks;
  }

  /**
   * Store card content embedding in Vectorize with chunking support
   */
  async storeCardEmbedding(cardId, content, metadata = {}) {
    try {
      // Chunk the content if it's too large
      const chunks = this.chunkText(content);
      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = chunks.length > 1 ? `${cardId}_chunk_${i}` : cardId;
        
        const embedding = await this.generateEmbedding(chunk);
        
        // Minimal metadata to stay under 10KB limit
        const vectorMetadata = {
          projectId: metadata.projectId,
          cardId,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'card',
          title: metadata.title ? metadata.title.substring(0, 100) : undefined,
          timestamp: new Date().toISOString()
        };

        const vectorData = {
          id: chunkId,
          values: embedding,
          metadata: vectorMetadata
        };

        await this.vectorize.upsert([vectorData]);
        
        results.push({
          chunkId,
          vectorId: chunkId,
          chunkIndex: i,
          dimensions: embedding.length,
          success: true
        });
      }
      
      return {
        cardId,
        chunks: results.length,
        results,
        success: true
      };
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw new Error(`Failed to store embedding: ${error.message}`);
    }
  }

  /**
   * Perform semantic search across project cards
   */
  async semanticSearch(projectId, queryText, limit = 10, filter = {}) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      // Build filter for project-specific search
      const searchFilter = { ...filter };
      if (projectId) {
        searchFilter.projectId = projectId;
      }

      // Search in Vectorize - respect 50-result limit with metadata
      const effectiveLimit = Math.min(limit * 2, 50); // Max 50 with metadata
      const searchResults = await this.vectorize.query(queryEmbedding, {
        topK: effectiveLimit,
        filter: searchFilter,
        returnMetadata: true
      });

      // Group chunks by cardId and keep the highest scoring chunk per card
      const cardResults = new Map();
      
      for (const match of searchResults.matches) {
        const cardId = match.metadata.cardId || match.id;
        
        if (!cardResults.has(cardId) || match.score > cardResults.get(cardId).score) {
          cardResults.set(cardId, {
            cardId,
            score: match.score,
            metadata: match.metadata,
            chunkId: match.id
          });
        }
      }

      // Return top results, limited to requested count
      return Array.from(cardResults.values())
        .slice(0, limit)
        .map(result => ({
          cardId: result.cardId,
          score: result.score,
          metadata: result.metadata,
          title: result.metadata?.title,
          type: result.metadata?.type
        }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw new Error(`Failed to perform semantic search: ${error.message}`);
    }
  }

  /**
   * Store report content embedding in Vectorize with chunking support
   */
  async storeReportEmbedding(reportId, content, metadata = {}) {
    try {
      // Chunk the content if it's too large
      const chunks = this.chunkText(content);
      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = chunks.length > 1 ? `${reportId}_chunk_${i}` : reportId;
        
        const embedding = await this.generateEmbedding(chunk);
        
        // Minimal metadata to stay under 10KB limit
        const vectorMetadata = {
          projectId: metadata.projectId,
          reportId,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'report',
          title: metadata.title ? metadata.title.substring(0, 100) : undefined,
          language: metadata.language,
          timestamp: new Date().toISOString()
        };

        const vectorData = {
          id: chunkId,
          values: embedding,
          metadata: vectorMetadata
        };

        await this.vectorize.upsert([vectorData]);
        
        results.push({
          chunkId,
          vectorId: chunkId,
          chunkIndex: i,
          dimensions: embedding.length,
          success: true
        });
      }
      
      return {
        reportId,
        chunks: results.length,
        results,
        success: true
      };
    } catch (error) {
      console.error('Error storing report embedding:', error);
      throw new Error(`Failed to store report embedding: ${error.message}`);
    }
  }

  /**
   * Update report embedding when content changes
   */
  async updateReportEmbedding(reportId, content, metadata = {}) {
    try {
      // First, delete existing embeddings for this report
      // Note: Vectorize doesn't have a direct delete by metadata, so we need to handle this carefully
      // For now, we'll just upsert with the same IDs, which will overwrite existing embeddings
      
      // Chunk the new content
      const chunks = this.chunkText(content);
      const results = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = chunks.length > 1 ? `${reportId}_chunk_${i}` : reportId;
        
        const embedding = await this.generateEmbedding(chunk);
        
        // Minimal metadata to stay under 10KB limit
        const vectorMetadata = {
          projectId: metadata.projectId,
          reportId,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'report',
          title: metadata.title ? metadata.title.substring(0, 100) : undefined,
          language: metadata.language,
          timestamp: new Date().toISOString()
        };

        const vectorData = {
          id: chunkId,
          values: embedding,
          metadata: vectorMetadata
        };

        await this.vectorize.upsert([vectorData]);
        
        results.push({
          chunkId,
          vectorId: chunkId,
          chunkIndex: i,
          dimensions: embedding.length,
          success: true
        });
      }
      
      return {
        reportId,
        chunks: results.length,
        results,
        updated: true,
        success: true
      };
    } catch (error) {
      console.error('Error updating report embedding:', error);
      throw new Error(`Failed to update report embedding: ${error.message}`);
    }
  }

  /**
   * Pure vector search using pre-generated query embedding (no AI generation)
   */
  async vectorSearch(projectId, queryEmbedding, limit = 10, filter = {}) {
    try {
      // Build filter for project-specific search
      const searchFilter = { ...filter };
      if (projectId) {
        searchFilter.projectId = projectId;
      }

      // Search in Vectorize using provided embedding - respect 50-result limit with metadata
      const effectiveLimit = Math.min(limit * 2, 50); // Max 50 with metadata
      const searchResults = await this.vectorize.query(queryEmbedding, {
        topK: effectiveLimit,
        filter: searchFilter,
        returnMetadata: true
      });

      // Group chunks by original ID (cardId or reportId) and keep highest scoring chunk
      const groupedResults = new Map();
      
      for (const match of searchResults.matches) {
        const originalId = match.metadata.cardId || match.metadata.reportId || match.id;
        
        if (!groupedResults.has(originalId) || match.score > groupedResults.get(originalId).score) {
          groupedResults.set(originalId, {
            contentId: originalId,
            score: match.score,
            metadata: match.metadata,
            title: match.metadata?.title,
            type: match.metadata?.type,
            chunkId: match.id
          });
        }
      }

      // Return top results, limited to requested count
      return Array.from(groupedResults.values()).slice(0, limit);
    } catch (error) {
      console.error('Error in vector search:', error);
      throw new Error(`Failed to perform vector search: ${error.message}`);
    }
  }

  /**
   * Find similar cards to a given card
   */
  async findSimilarCards(cardId, limit = 5) {
    try {
      // Get the card's embedding from Vectorize
      const cardVector = await this.vectorize.getByIds([cardId]);
      
      if (!cardVector.length) {
        throw new Error('Card embedding not found');
      }

      // Search for similar vectors
      const searchResults = await this.vectorize.query(cardVector[0].values, {
        topK: limit + 1, // +1 to exclude the original card
        returnMetadata: true
      });

      // Filter out the original card and return results
      return searchResults.matches
        .filter(match => match.id !== cardId)
        .slice(0, limit)
        .map(match => ({
          cardId: match.id,
          score: match.score,
          metadata: match.metadata
        }));
    } catch (error) {
      console.error('Error finding similar cards:', error);
      throw new Error(`Failed to find similar cards: ${error.message}`);
    }
  }

  /**
   * Delete embedding from Vectorize (handles chunks)
   */
  async deleteEmbedding(contentId) {
    try {
      // First try to delete the main ID
      await this.vectorize.deleteByIds([contentId]);
      
      // Also try to delete potential chunks
      const chunkIds = [];
      for (let i = 0; i < 10; i++) { // Reasonable limit on chunks
        chunkIds.push(`${contentId}_chunk_${i}`);
      }
      
      // Delete chunks (this will silently fail for non-existent IDs)
      try {
        await this.vectorize.deleteByIds(chunkIds);
      } catch (chunkError) {
        // Ignore chunk deletion errors - some may not exist
        console.log('Note: Some chunks may not have existed for deletion');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting embedding:', error);
      throw new Error(`Failed to delete embedding: ${error.message}`);
    }
  }

  /**
   * Batch process embeddings for multiple cards
   */
  async batchStoreEmbeddings(cards) {
    const results = [];
    const batchSize = 5; // Smaller batches due to potential chunking

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const batchPromises = batch.map(async (card) => {
        try {
          const result = await this.storeCardEmbedding(
            card.id, 
            card.content, 
            {
              projectId: card.project_id,
              taskId: card.task_id,
              cardType: card.card_type,
              title: card.title
            }
          );
          return { ...result, error: null };
        } catch (error) {
          return { 
            cardId: card.id, 
            success: false, 
            error: error.message 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < cards.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }
}