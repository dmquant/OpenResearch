import { ProjectService } from '../services/projectService.js';

/**
 * Execute research plan - runs all tasks sequentially
 */
export async function executeResearchPlan(projectId, env, embeddingService, storageService) {
  const projectService = new ProjectService(env.DB);
  
  try {
    // Get project and its tasks
    const project = await projectService.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.tasks || project.tasks.length === 0) {
      throw new Error('No tasks found for project');
    }

    // Update project status to executing
    await env.DB
      .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
      .bind('executing', new Date().toISOString(), projectId)
      .run();

    await projectService.logExecution(projectId, null, 'info', 'Starting project execution');

    const completedCards = [];

    // Execute each task sequentially
    for (const task of project.tasks) {
      if (task.status === 'completed') {
        continue; // Skip already completed tasks
      }

      try {
        console.log(`Executing task: ${task.title}`);
        
        // Execute the task and get the generated card
        const card = await projectService.executeTask(task.id, env.GEMINI_API_KEY);
        completedCards.push(card);

        // Store embedding for the card
        try {
          const embeddingResult = await embeddingService.storeCardEmbedding(
            card.id, 
            card.content,
            {
              projectId: projectId,
              taskId: task.id,
              cardType: card.card_type,
              title: card.title
            }
          );

          // Update card to mark embedding as stored
          await env.DB
            .prepare('UPDATE cards SET embedding_stored = ? WHERE id = ?')
            .bind(true, card.id)
            .run();

          // Store embedding metadata in D1
          await env.DB
            .prepare(`
              INSERT INTO embeddings (id, card_id, vector_id, content_hash, dimensions, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(
              embeddingResult.vectorId,
              card.id,
              embeddingResult.vectorId,
              hashContent(card.content),
              embeddingResult.dimensions,
              new Date().toISOString()
            )
            .run();

          console.log(`Stored embedding for card: ${card.id}`);
        } catch (embeddingError) {
          console.error('Failed to store embedding:', embeddingError);
          // Continue execution even if embedding fails
        }

        // Store card backup in R2
        try {
          await storageService.storeCard(projectId, card);
        } catch (storageError) {
          console.error('Failed to store card backup:', storageError);
          // Continue execution even if R2 storage fails
        }

        // Small delay between tasks to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (taskError) {
        console.error(`Task ${task.id} failed:`, taskError);
        await projectService.logExecution(
          projectId, 
          task.id, 
          'error', 
          `Task failed: ${taskError.message}`,
          { error: taskError.message, stack: taskError.stack }
        );
        
        // Continue with next task even if this one fails
        continue;
      }
    }

    // Update project status to completed
    const now = new Date().toISOString();
    await env.DB
      .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
      .bind('completed', now, projectId)
      .run();

    await projectService.logExecution(
      projectId, 
      null, 
      'success', 
      `Project execution completed. Generated ${completedCards.length} cards.`,
      { cardsGenerated: completedCards.length, completedAt: now }
    );

    console.log(`Project ${projectId} execution completed successfully`);

    return {
      success: true,
      projectId,
      cardsGenerated: completedCards.length,
      completedAt: now
    };

  } catch (error) {
    console.error('Project execution failed:', error);
    
    // Update project status to failed
    await env.DB
      .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
      .bind('failed', new Date().toISOString(), projectId)
      .run();

    await projectService.logExecution(
      projectId, 
      null, 
      'error', 
      `Project execution failed: ${error.message}`,
      { error: error.message, stack: error.stack }
    );

    throw error;
  }
}

/**
 * Simple hash function for content
 */
function hashContent(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}