import { useEffect, useRef, useState } from 'react'

const MAX_TASK_LENGTH = 100

const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

function TaskItem({
  task,
  canDrag,
  isDragged,
  isDropTarget,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onDragStartTask,
  onDragEnterTask,
  onDropTask,
  onDragEndTask,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(task.text)
  const [error, setError] = useState('')
  const editFieldRef = useRef(null)

  useEffect(() => {
    if (isEditing) {
      editFieldRef.current?.focus()
    }
  }, [isEditing])

  function handleSubmit(event) {
    event.preventDefault()

    const nextValue = draft.trim()

    if (!nextValue) {
      setError('Пустое название недопустимо.')
      return
    }

    if (nextValue.length > MAX_TASK_LENGTH) {
      setError(`Максимум ${MAX_TASK_LENGTH} символов.`)
      return
    }

    onEditTask(task.id, nextValue)
    setIsEditing(false)
    setError('')
  }

  function handleCancel() {
    setDraft(task.text)
    setError('')
    setIsEditing(false)
  }

  return (
    <li
      className={[
        'task',
        `task--${task.priority}`,
        task.completed ? 'task--completed' : '',
        isDragged ? 'task--dragging' : '',
        isDropTarget ? 'task--target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable={canDrag && !isEditing}
      onDragStart={(event) => {
        if (!canDrag || isEditing) {
          return
        }

        event.dataTransfer.effectAllowed = 'move'
        onDragStartTask(task.id)
      }}
      onDragEnter={() => onDragEnterTask(task.id)}
      onDragOver={(event) => {
        if (canDrag) {
          event.preventDefault()
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDropTask(task.id)
      }}
      onDragEnd={onDragEndTask}
    >
      {isEditing ? (
        <form className="task__edit" onSubmit={handleSubmit}>
          <input
            ref={editFieldRef}
            type="text"
            value={draft}
            maxLength={MAX_TASK_LENGTH}
            onChange={(event) => {
              setDraft(event.target.value)

              if (error) {
                setError('')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                handleCancel()
              }
            }}
          />

          <div className="task__row">
            <span className="task__hint">{draft.trim().length}/{MAX_TASK_LENGTH}</span>
            {error ? <span className="task__error">{error}</span> : null}
          </div>

          <div className="task__actions">
            <button type="submit" className="button button--primary">
              Сохранить
            </button>
            <button type="button" className="button button--ghost" onClick={handleCancel}>
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <>
          <label className="task__main">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggleTask(task.id)}
            />
            <span className="task__text">{task.text}</span>
          </label>

          <div className="task__side">
            <span className={`badge badge--${task.priority}`}>
              {priorityLabels[task.priority]}
            </span>

            <div className="task__actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setDraft(task.text)
                  setError('')
                  setIsEditing(true)
                }}
              >
                Изменить
              </button>

              <button
                type="button"
                className="button button--ghost"
                onClick={() => onDeleteTask(task.id)}
              >
                Удалить
              </button>
            </div>
          </div>
        </>
      )}
    </li>
  )
}

export default TaskItem
