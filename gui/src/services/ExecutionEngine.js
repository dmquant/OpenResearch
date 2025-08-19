import { serviceFactory } from './ServiceFactory.js'

class ExecutionEngine {
  constructor() {
    this.activeExecutions = new Map()
    this.executionCallbacks = new Map()
    this.llmService = serviceFactory.createLLMService()
  }

  async executeResearchPlan(planId, researchPlan, callbacks = {}) {
    console.log(`Starting execution of research plan: ${planId}`)
    
    const execution = {
      id: planId,
      plan: researchPlan,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedTasks: 0,
      totalTasks: researchPlan.tasks?.length || 0,
      cards: [],
      errors: [],
      projectId: researchPlan.projectId // Pass through projectId for storage
    }

    this.activeExecutions.set(planId, execution)
    this.executionCallbacks.set(planId, callbacks)

    // Notify start
    this.notifyCallback(planId, 'onStart', execution)

    try {
      // Execute tasks sequentially to avoid overwhelming the API
      for (let i = 0; i < execution.totalTasks; i++) {
        const task = researchPlan.tasks[i]
        
        // Notify task start
        this.notifyCallback(planId, 'onTaskStart', { task, index: i })
        
        try {
          // Execute the research task using the appropriate LLM service
          const card = await this.llmService.executeResearchTask(task)
          
          // Store card immediately when completed (this is the key fix!)
          if (execution.projectId && this.llmService.storeCardInWorker) {
            try {
              console.log('💾 Storing card immediately upon completion:', {
                projectId: execution.projectId,
                taskId: task.id,
                cardTitle: card.title
              })
              
              const storedCard = await this.llmService.storeCardInWorker(
                execution.projectId, 
                task.id, 
                card
              )
              
              if (storedCard) {
                console.log('✅ Card stored successfully to worker infrastructure')
                // Update card with storage info
                card.storedCard = storedCard
                card.cloudStored = true
              }
            } catch (storageError) {
              console.warn('⚠️ Card storage failed, continuing execution:', storageError)
              card.cloudStored = false
            }
          }
          
          execution.cards.push(card)
          execution.completedTasks++
          
          // Notify task completion
          this.notifyCallback(planId, 'onTaskComplete', { 
            task, 
            card, 
            index: i,
            progress: execution.completedTasks / execution.totalTasks 
          })
          
          // Small delay between tasks to be respectful to the API
          await this.delay(1000)
          
        } catch (error) {
          console.error(`Error executing task ${task.title}:`, error)
          execution.errors.push({
            taskId: task.id,
            taskTitle: task.title,
            error: error.message,
            timestamp: new Date().toISOString()
          })
          
          // Notify task error
          this.notifyCallback(planId, 'onTaskError', { task, error, index: i })
          
          // Continue with other tasks even if one fails
          execution.completedTasks++
        }
      }

      // Mark execution as complete
      execution.status = 'completed'
      execution.completedAt = new Date().toISOString()
      
      // Notify completion
      this.notifyCallback(planId, 'onComplete', execution)
      
      console.log(`Research plan execution completed: ${planId}`)
      return execution

    } catch (error) {
      console.error(`Research plan execution failed: ${planId}`, error)
      execution.status = 'failed'
      execution.error = error.message
      execution.failedAt = new Date().toISOString()
      
      // Notify failure
      this.notifyCallback(planId, 'onError', { execution, error })
      
      throw error
    }
  }

  getExecutionStatus(planId) {
    return this.activeExecutions.get(planId)
  }

  cancelExecution(planId) {
    const execution = this.activeExecutions.get(planId)
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled'
      execution.cancelledAt = new Date().toISOString()
      
      this.notifyCallback(planId, 'onCancel', execution)
      console.log(`Research plan execution cancelled: ${planId}`)
    }
  }

  notifyCallback(planId, callbackName, data) {
    const callbacks = this.executionCallbacks.get(planId)
    if (callbacks && typeof callbacks[callbackName] === 'function') {
      try {
        callbacks[callbackName](data)
      } catch (error) {
        console.error(`Error in callback ${callbackName}:`, error)
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Clean up completed executions
  cleanup(planId) {
    this.activeExecutions.delete(planId)
    this.executionCallbacks.delete(planId)
  }

  // Get all active executions
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values())
  }
}

export default new ExecutionEngine()