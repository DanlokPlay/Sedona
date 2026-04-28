import { useEffect, useRef, useState } from 'react'
import './App.css'
import { fetchTasks, saveTasks } from './api/tasksApi.js'
import TaskItem from './components/TaskItem.jsx'

const MAX_TASK_LENGTH = 100

const priorityOptions = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

const filterOptions = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'completed', label: 'Выполненные' },
]

const sortOptions = [
  { value: 'manual', label: 'Как в списке' },
  { value: 'new', label: 'Сначала новые' },
  { value: 'old', label: 'Сначала старые' },
  { value: 'az', label: 'По алфавиту' },
]

function sortTasks(tasks, sortType) {
  const nextTasks = [...tasks]

  if (sortType === 'new') {
    nextTasks.sort((firstTask, secondTask) => secondTask.createdAt - firstTask.createdAt)
  }

  if (sortType === 'old') {
    nextTasks.sort((firstTask, secondTask) => firstTask.createdAt - secondTask.createdAt)
  }

  if (sortType === 'az') {
    nextTasks.sort((firstTask, secondTask) => firstTask.text.localeCompare(secondTask.text, 'ru'))
  }

  return nextTasks
}

function getEmptyStateText(filter) {
  if (filter === 'active') {
    return 'Активных задач сейчас нет.'
  }

  if (filter === 'completed') {
    return 'Выполненных задач пока нет.'
  }

  return 'Добавьте первую задачу.'
}

function App() {
  const [tasks, setTasks] = useState([])
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('manual')
  const [formError, setFormError] = useState('')
  const [apiError, setApiError] = useState('')
  const [requestState, setRequestState] = useState('loading')
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    let ignore = false

    async function loadTasks() {
      try {
        const initialTasks = await fetchTasks()

        if (ignore) {
          return
        }

        setTasks(initialTasks)
        setApiError('')
        setRequestState('ready')
      } catch {
        if (ignore) {
          return
        }

        setApiError('Не удалось загрузить задачи из localStorage.')
        setRequestState('error')
      }
    }

    loadTasks()

    return () => {
      ignore = true
    }
  }, [])

  const remainingTasks = tasks.filter((task) => !task.completed).length
  const completedTasks = tasks.length - remainingTasks
  const canReorder = filter === 'all' && sort === 'manual'
  const visibleTasks = sortTasks(
    tasks.filter((task) => {
      if (filter === 'active') {
        return !task.completed
      }

      if (filter === 'completed') {
        return task.completed
      }

      return true
    }),
    sort,
  )

  const statusLabel = {
    loading: 'Загрузка...',
    saving: 'Сохранение...',
    ready: 'Сохранено локально',
    error: 'Ошибка хранилища',
  }[requestState]

  function createTask(taskText) {
    return {
      id: crypto.randomUUID(),
      text: taskText,
      completed: false,
      priority,
      createdAt: Date.now(),
    }
  }

  async function persistTasks(nextTasks) {
    setTasks(nextTasks)

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setRequestState('saving')

    try {
      const savedTasks = await saveTasks(nextTasks)

      if (requestIdRef.current !== requestId) {
        return
      }

      setTasks(savedTasks)
      setApiError('')
      setRequestState('ready')
    } catch {
      if (requestIdRef.current !== requestId) {
        return
      }

      setApiError('Не удалось сохранить изменения в localStorage.')
      setRequestState('error')
    }
  }

  function handleAddTask(event) {
    event.preventDefault()

    const trimmedTask = draft.trim()

    if (!trimmedTask) {
      setFormError('Введите задачу.')
      return
    }

    if (trimmedTask.length > MAX_TASK_LENGTH) {
      setFormError(`Максимум ${MAX_TASK_LENGTH} символов.`)
      return
    }

    persistTasks([createTask(trimmedTask), ...tasks])
    setDraft('')
    setPriority('medium')
    setFormError('')
  }

  function handleToggleTask(taskId) {
    persistTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    )
  }

  function handleDeleteTask(taskId) {
    persistTasks(tasks.filter((task) => task.id !== taskId))
  }

  function handleEditTask(taskId, nextText) {
    persistTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, text: nextText } : task,
      ),
    )
  }

  function handleClearCompleted() {
    if (!completedTasks) {
      return
    }

    persistTasks(tasks.filter((task) => !task.completed))
  }

  function moveTask(sourceId, targetId) {
    if (!canReorder || sourceId === targetId) {
      return
    }

    const nextTasks = [...tasks]
    const sourceIndex = nextTasks.findIndex((task) => task.id === sourceId)
    const targetIndex = nextTasks.findIndex((task) => task.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) {
      return
    }

    const [movedTask] = nextTasks.splice(sourceIndex, 1)
    nextTasks.splice(targetIndex, 0, movedTask)
    persistTasks(nextTasks)
  }

  function moveTaskToEnd() {
    if (!canReorder || !draggedTaskId) {
      return
    }

    const nextTasks = [...tasks]
    const sourceIndex = nextTasks.findIndex((task) => task.id === draggedTaskId)

    if (sourceIndex === -1 || sourceIndex === nextTasks.length - 1) {
      return
    }

    const [movedTask] = nextTasks.splice(sourceIndex, 1)
    nextTasks.push(movedTask)
    persistTasks(nextTasks)
  }

  function resetDragState() {
    setDraggedTaskId(null)
    setDropTargetId(null)
  }

  function handleDrop(targetId) {
    if (!draggedTaskId) {
      return
    }

    moveTask(draggedTaskId, targetId)
    resetDragState()
  }

  function handleListDrop(event) {
    event.preventDefault()

    if (event.target !== event.currentTarget) {
      return
    }

    moveTaskToEnd()
    resetDragState()
  }

  return (
    <main className="app">
      <section className="todo">
        <header className="todo__header">
          <div className="todo__title-wrap">
            <h1>To-Do List</h1>
            <p className="todo__summary">
              Осталось: <strong>{remainingTasks}</strong> из <strong>{tasks.length}</strong>
            </p>
          </div>

          <div className="todo__meta">
            <span className={`status status--${requestState}`}>{statusLabel}</span>
            <a className="link-button" href="./api/" target="_blank" rel="noreferrer">
              JSON
            </a>
          </div>
        </header>

        <form className="composer" onSubmit={handleAddTask}>
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)

              if (formError) {
                setFormError('')
              }
            }}
            placeholder="Новая задача"
            maxLength={MAX_TASK_LENGTH}
          />

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            aria-label="Приоритет"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="submit" className="button button--primary">
            Добавить
          </button>
        </form>

        {(formError || apiError) ? (
          <p className="message message--error" role="alert">
            {formError || apiError}
          </p>
        ) : null}

        <section className="toolbar" aria-label="Управление списком">
          <div className="toolbar__filters">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip${filter === option.value ? ' chip--active' : ''}`}
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="toolbar__actions">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Сортировка"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="button button--ghost"
              onClick={handleClearCompleted}
              disabled={!completedTasks}
            >
              Очистить выполненные
            </button>
          </div>
        </section>

        <section className="todo__viewport">
          {requestState === 'loading' ? (
            <div className="empty-state">
              <div className="empty-state__card">
                <p>Загрузка задач...</p>
              </div>
            </div>
          ) : visibleTasks.length ? (
            <ul
              className="task-list"
              onDragOver={(event) => {
                if (canReorder) {
                  event.preventDefault()
                }
              }}
              onDrop={handleListDrop}
            >
              {visibleTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  canDrag={canReorder}
                  isDragged={draggedTaskId === task.id}
                  isDropTarget={dropTargetId === task.id && draggedTaskId !== task.id}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={handleEditTask}
                  onDragStartTask={(taskId) => {
                    setDraggedTaskId(taskId)
                    setDropTargetId(taskId)
                  }}
                  onDragEnterTask={(taskId) => {
                    if (!canReorder || taskId === draggedTaskId) {
                      return
                    }

                    setDropTargetId(taskId)
                  }}
                  onDropTask={handleDrop}
                  onDragEndTask={resetDragState}
                />
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-state__card">
                <p>{getEmptyStateText(filter)}</p>
              </div>
            </div>
          )}
        </section>

        <footer className="todo__footer">
          <span>Выполнено: {completedTasks}</span>
          <span>{canReorder ? 'Перетаскивание включено' : 'Перетаскивание отключено'}</span>
        </footer>
      </section>
    </main>
  )
}

export default App
