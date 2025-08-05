import LLMAbstractionLayer from './LLMAbstractionLayer'
import { TASK_TYPES } from '../types'

class PlannerService {
  async createResearchPlan(topic) {
    if (!topic.trim()) {
      throw new Error('Topic is required')
    }

    try {
      const plan = await LLMAbstractionLayer.generateResearchPlan(topic)
      return this.validatePlan(plan)
    } catch (error) {
      console.error('Error creating research plan:', error)
      throw new Error('Failed to create research plan')
    }
  }

  validatePlan(plan) {
    if (!plan.tasks || plan.tasks.length === 0) {
      throw new Error('Plan must contain at least one task')
    }

    // Validate each task
    plan.tasks.forEach(task => {
      if (!task.type || !Object.values(TASK_TYPES).includes(task.type)) {
        throw new Error(`Invalid task type: ${task.type}`)
      }
      if (!task.title || !task.description) {
        throw new Error('Task must have title and description')
      }
    })

    return plan
  }

  async updatePlan(planId, updates) {
    // In real implementation, would update plan in database
    return { ...updates, id: planId, updatedAt: new Date().toISOString() }
  }
}

export default new PlannerService()