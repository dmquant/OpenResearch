import TaskQueue from './TaskQueue'
import AgentExecutionWorkers from './AgentExecutionWorkers'
import CardSynthesizer from './CardSynthesizer'

class WorkflowOrchestrator {
  constructor() {
    this.activeWorkflows = new Map()
  }

  async startWorkflow(workflowId, researchPlan) {
    console.log(`Starting workflow ${workflowId} with plan:`, researchPlan)
    
    // Break plan into tasks and queue them
    const tasks = researchPlan.tasks.map(task => ({
      ...task,
      workflowId,
      status: 'queued',
      createdAt: new Date().toISOString()
    }))

    // Add tasks to queue
    tasks.forEach(task => TaskQueue.enqueue(task))

    // Store workflow state
    this.activeWorkflows.set(workflowId, {
      id: workflowId,
      plan: researchPlan,
      tasks,
      status: 'running',
      startedAt: new Date().toISOString()
    })

    // Start processing tasks
    this.processTasks(workflowId)

    return workflowId
  }

  async processTasks(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow) return

    while (TaskQueue.hasNext()) {
      const task = TaskQueue.dequeue()
      if (task.workflowId !== workflowId) continue

      try {
        // Execute task with appropriate agent
        const rawData = await AgentExecutionWorkers.executeTask(task)
        
        // Synthesize raw data into card
        const card = await CardSynthesizer.synthesize(rawData, task.type)
        
        // Update task status
        task.status = 'completed'
        task.completedAt = new Date().toISOString()
        task.result = card

        // Notify observers (in real app, would emit events)
        console.log(`Task completed: ${task.title}`, card)

      } catch (error) {
        console.error(`Task failed: ${task.title}`, error)
        task.status = 'failed'
        task.error = error.message
      }
    }

    // Mark workflow as complete
    workflow.status = 'completed'
    workflow.completedAt = new Date().toISOString()
    console.log(`Workflow ${workflowId} completed`)
  }

  getWorkflowStatus(workflowId) {
    return this.activeWorkflows.get(workflowId)
  }

  async cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId)
    if (workflow) {
      workflow.status = 'cancelled'
      workflow.cancelledAt = new Date().toISOString()
    }
  }
}

export default new WorkflowOrchestrator()