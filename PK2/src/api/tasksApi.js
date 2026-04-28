export const STORAGE_KEY = 'pk2-static-tasks'

const allowedPriorities = new Set(['low', 'medium', 'high'])

function normalizeTask(task) {
  return {
    id: typeof task.id === 'string' ? task.id : crypto.randomUUID(),
    text: typeof task.text === 'string' ? task.text.trim() : '',
    completed: Boolean(task.completed),
    priority: allowedPriorities.has(task.priority) ? task.priority : 'medium',
    createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
  }
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return []
  }

  return tasks.map(normalizeTask).filter((task) => task.text)
}

export async function fetchTasks() {
  try {
    const rawTasks = window.localStorage.getItem(STORAGE_KEY)

    if (!rawTasks) {
      return []
    }

    return normalizeTasks(JSON.parse(rawTasks))
  } catch {
    return []
  }
}

export async function saveTasks(tasks) {
  const normalizedTasks = normalizeTasks(tasks)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTasks))
  return normalizedTasks
}
