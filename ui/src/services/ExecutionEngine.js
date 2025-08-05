import LLMAbstractionLayer from './LLMAbstractionLayer'

class ExecutionEngine {
  constructor() {
    this.activeExecutions = new Map()
    this.executionCallbacks = new Map()
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
      errors: []
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
          // Execute the research task using Google Search grounding
          const card = await LLMAbstractionLayer.executeResearchTask(task)
          
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