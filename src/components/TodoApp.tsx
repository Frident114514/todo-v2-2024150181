import { useEffect, useState } from 'react';
import {
  addTodo,
  clearCompleted,
  decodeStoredTodos,
  deleteTodo,
  editTodo,
  filterTodos,
  nextTodoId,
  toggleTodo,
  validateText,
  type LoadResult,
  type Todo,
  type TodoFilter
} from '../todo-core';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';

const STORAGE_KEY = 'szu-todo-v2-2024150181';

interface Notice {
  text: string;
  error: boolean;
}

function saveTodos(todos: readonly Todo[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch (error) {
    console.error('保存待办失败：', error);
    return false;
  }
}

function readStored(): LoadResult {
  try {
    return decodeStoredTodos(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error('恢复待办失败：', error);
    return { todos: [], repaired: false, invalid: true };
  }
}

function initialState(): { todos: readonly Todo[]; notice: Notice | null } {
  const loaded = readStored();
  if (loaded.repaired) {
    const saved = saveTodos(loaded.todos);
    return {
      todos: loaded.todos,
      notice: {
        text: saved ? '旧版或部分损坏的数据已整理并保存。' : '数据已整理，但保存失败。',
        error: !saved
      }
    };
  }
  if (loaded.invalid) {
    return {
      todos: loaded.todos,
      notice: { text: '已保存的数据无法读取，当前显示空列表。', error: true }
    };
  }
  return { todos: loaded.todos, notice: null };
}

const initial = initialState();

declare global {
  interface Window {
    todos?: readonly Todo[];
    clearCompleted?: () => void;
  }
}

export function TodoApp() {
  const [todos, setTodos] = useState<readonly Todo[]>(initial.todos);
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [notice, setNotice] = useState<Notice | null>(initial.notice);
  const shown = filterTodos(todos, filter);

  function commit(next: readonly Todo[], success: string, failure: string): boolean {
    if (next === todos) return false;
    const saved = saveTodos(next);
    setTodos(next);
    setNotice({ text: saved ? success : failure, error: !saved });
    return true;
  }

  function handleAdd(text: string): boolean {
    const next = addTodo(todos, text, nextTodoId(todos));
    if (next === todos) {
      setNotice({ text: '请输入 1–100 个字符的任务，不能只含空格。', error: true });
      return false;
    }
    return commit(next, '任务已添加。', '任务已添加，但无法保存；刷新后可能丢失。');
  }

  function handleToggle(id: number): void {
    const next = toggleTodo(todos, id);
    if (next !== todos) {
      console.log('[toggle]', id);
      commit(next, '任务状态已更新。', '任务状态已更新，但无法保存；刷新后可能恢复。');
    }
  }

  function handleDelete(id: number): void {
    const next = deleteTodo(todos, id);
    if (next !== todos) {
      console.log('[delete]', id);
      commit(next, '任务已删除。', '任务已删除，但无法保存；刷新后可能恢复。');
    }
  }

  function handleEdit(id: number): void {
    const todo = todos.find((item) => item.id === id);
    if (todo === undefined) return;
    const value = window.prompt('修改任务', todo.text);
    if (value === null) return;
    if (validateText(value) === null) {
      setNotice({ text: '修改内容须为 1–100 个字符，不能只含空格。', error: true });
      return;
    }
    const next = editTodo(todos, id, value);
    if (next !== todos) {
      console.log('[edit]', id);
      commit(next, '任务内容已更新。', '任务已修改，但无法保存；刷新后可能恢复。');
    }
  }

  function handleClearCompleted(): void {
    commit(
      clearCompleted(todos),
      '已清除所有完成项。',
      '完成项已清除，但无法保存；刷新后可能恢复。'
    );
  }

  useEffect(() => {
    window.clearCompleted = handleClearCompleted;
    return () => {
      delete window.clearCompleted;
    };
  }, [todos]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Read-only, detached snapshot for the course's console state check.
    Object.defineProperty(window, 'todos', {
      configurable: true,
      get: () => todos.map((todo) => ({ ...todo }))
    });
    return () => {
      delete window.todos;
    };
  }, [todos]);

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">WEB PROGRAMMING · WEEK 11</p>
        <h1>我的待办清单</h1>
        <p>
          锡汉唐 <span>2024150181</span>
        </p>
      </header>
      <section className="panel" aria-labelledby="todo-heading">
        <div className="panel-head">
          <h2 id="todo-heading">任务</h2>
          <span id="todo-count">{todos.length} 项</span>
        </div>
        <TodoForm onAdd={handleAdd} />
        <div className="filter-bar" role="group" aria-label="筛选任务">
          {(['all', 'active', 'done'] as const).map((value) => (
            <button
              key={value}
              type="button"
              data-filter={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {{ all: '全部', active: '未完成', done: '已完成' }[value]}
            </button>
          ))}
        </div>
        <p id="message" role="status" aria-live="polite" data-error={notice?.error ?? false}>
          {notice?.text ?? ''}
        </p>
        <p id="empty-state" hidden={shown.length > 0}>
          {todos.length ? '当前筛选下没有任务。' : '还没有任务，先添加一项吧。'}
        </p>
        <TodoList
          todos={shown}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </section>
      <footer>数据保存在本机浏览器中。</footer>
    </main>
  );
}
