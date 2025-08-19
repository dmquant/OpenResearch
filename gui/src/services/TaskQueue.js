// Simple task queue implementation
class TaskQueue {
  constructor() {
    this.queue = []
  }

  enqueue(task) {
    this.queue.push({
      ...task,
      queuedAt: new Date().toISOString()
    })
    console.log(`Task queued: ${task.title}`)
  }

  dequeue() {
    const task = this.queue.shift()
    if (task) {
      console.log(`Task dequeued: ${task.title}`)
    }
    return task
  }

  hasNext() {
    return this.queue.length > 0
  }

  size() {
    return this.queue.length
  }

  clear() {
    this.queue = []
  }

  getAll() {
    return [...this.queue]
  }
}

export default new TaskQueue()