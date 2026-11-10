import type { Todo } from '../todo-core';

export interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  return (
    <li className={todo.completed ? 'done' : undefined} data-id={todo.id}>
      <button
        type="button"
        className="toggle"
        data-action="toggle"
        aria-label={`${todo.completed ? '标记未完成' : '标记完成'}：${todo.text}`}
        onClick={() => onToggle(todo.id)}
      >
        {todo.completed ? '✓' : ''}
      </button>
      <button
        type="button"
        className="task-text task-toggle-text"
        aria-label={`切换完成状态：${todo.text}`}
        onClick={() => onToggle(todo.id)}
      >
        {todo.text}
      </button>
      <button
        type="button"
        className="edit"
        data-action="edit"
        aria-label={`编辑：${todo.text}`}
        onClick={() => onEdit(todo.id)}
      >
        编辑
      </button>
      <button
        type="button"
        className="delete"
        data-action="delete"
        aria-label={`删除：${todo.text}`}
        onClick={() => onDelete(todo.id)}
      >
        <span className="delete-icon" aria-hidden="true">
          ×
        </span>
      </button>
    </li>
  );
}
