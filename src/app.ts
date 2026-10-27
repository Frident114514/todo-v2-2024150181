import {
  addTodo as addTask,
  clearCompleted as clearTasks,
  decodeStoredTodos,
  deleteTodo as deleteTask,
  editTodo as editTask,
  filterTodos,
  nextTodoId,
  parseTodoId,
  toggleTodo as toggleTask,
  validateText,
  type LoadResult,
  type Todo,
  type TodoFilter
} from './todo-core.js';

const KEY = 'szu-todo-v2-2024150181';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`找不到页面元素：${selector}`);
  return element;
}

const list = requiredElement<HTMLUListElement>('#todo-list');
const input = requiredElement<HTMLInputElement>('#todo-input');
const form = requiredElement<HTMLFormElement>('#todo-form');
const message = requiredElement<HTMLParagraphElement>('#message');
const count = requiredElement<HTMLElement>('#todo-count');
const empty = requiredElement<HTMLParagraphElement>('#empty-state');
const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-filter]');

function readStored(): LoadResult {
  try {
    return decodeStoredTodos(localStorage.getItem(KEY));
  } catch (error) {
    console.error('恢复待办失败：', error);
    return {todos: [], repaired: false, invalid: true};
  }
}

const initial = readStored();
let todos: readonly Todo[] = initial.todos;
let filter: TodoFilter = 'all';

function save(): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
    return true;
  } catch (error) {
    console.error('保存待办失败：', error);
    return false;
  }
}

function notify(text: string, isError = false): void {
  message.textContent = text;
  message.dataset.error = String(isError);
}

function render(): void {
  const shown = filterTodos(todos, filter);
  const fragment = document.createDocumentFragment();
  for (const todo of shown) {
    const li = document.createElement('li');
    li.dataset.id = String(todo.id);
    if (todo.completed) li.classList.add('done');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toggle';
    toggle.dataset.action = 'toggle';
    toggle.textContent = todo.completed ? '✓' : '';
    toggle.setAttribute('aria-label', `${todo.completed ? '标记未完成' : '标记完成'}：${todo.text}`);

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = todo.text;

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit';
    edit.dataset.action = 'edit';
    edit.textContent = '编辑';
    edit.setAttribute('aria-label', `编辑：${todo.text}`);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.dataset.action = 'delete';
    del.setAttribute('aria-label', `删除：${todo.text}`);
    const icon = document.createElement('span');
    icon.className = 'delete-icon';
    icon.textContent = '×';
    icon.setAttribute('aria-hidden', 'true');
    del.append(icon);

    li.append(toggle, text, edit, del);
    fragment.append(li);
  }
  list.replaceChildren(fragment);
  count.textContent = `${todos.length} 项`;
  empty.hidden = shown.length > 0;
  empty.textContent = todos.length ? '当前筛选下没有任务。' : '还没有任务，先添加一项吧。';
}

function commit(next: readonly Todo[], success: string, failure: string): boolean {
  if (next === todos) return false;
  todos = next;
  const saved = save();
  render();
  notify(saved ? success : failure, !saved);
  return true;
}

function addTodo(value: unknown): boolean {
  const next = addTask(todos, value, nextTodoId(todos));
  if (next === todos) {
    notify('请输入 1–100 个字符的任务，不能只含空格。', true);
    return false;
  }
  return commit(next, '任务已添加。', '任务已添加，但无法保存；刷新后可能丢失。');
}

function deleteTodo(id: number): void {
  const next = deleteTask(todos, id);
  if (next !== todos) {
    console.log('[delete]', id);
    commit(next, '任务已删除。', '任务已删除，但无法保存；刷新后可能恢复。');
  }
}

function toggleTodo(id: number): void {
  const next = toggleTask(todos, id);
  if (next !== todos) {
    console.log('[toggle]', id);
    commit(next, '任务状态已更新。', '任务状态已更新，但无法保存；刷新后可能恢复。');
  }
}

function updateTodo(id: number, value: unknown): void {
  if (validateText(value) === null) {
    notify('修改内容须为 1–100 个字符，不能只含空格。', true);
    return;
  }
  const next = editTask(todos, id, value);
  if (next !== todos) {
    console.log('[edit]', id);
    commit(next, '任务内容已更新。', '任务已修改，但无法保存；刷新后可能恢复。');
  }
}

function clearCompleted(): void {
  commit(clearTasks(todos), '已清除所有完成项。', '完成项已清除，但无法保存；刷新后可能恢复。');
}

function setFilter(value: string | undefined): void {
  if (value !== 'all' && value !== 'active' && value !== 'done') return;
  filter = value;
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === value)));
  render();
}

list.addEventListener('click', (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return;
  const item = event.target.closest<HTMLLIElement>('li');
  if (item === null || !list.contains(item)) return;
  const id = parseTodoId(item.dataset.id);
  if (id === null) return;
  const todo = todos.find(task => task.id === id);
  if (todo === undefined) return;

  const action = event.target.closest<HTMLElement>('[data-action]');
  if (action !== null && item.contains(action) && action.dataset.action === 'delete') {
    deleteTodo(id);
  } else if (action !== null && item.contains(action) && action.dataset.action === 'edit') {
    const edited = window.prompt('修改任务', todo.text);
    if (edited !== null) updateTodo(id, edited);
  } else {
    toggleTodo(id);
  }
});

filterButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
form.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault();
  if (addTodo(input.value)) input.value = '';
  input.focus();
});

if (initial.repaired) {
  const saved = save();
  notify(saved ? '旧版或部分损坏的数据已整理并保存。' : '数据已整理，但保存失败。', !saved);
} else if (initial.invalid) {
  notify('已保存的数据无法读取，当前显示空列表。', true);
}
render();

declare global {
  interface Window {
    clearCompleted: () => void;
  }
}
window.clearCompleted = clearCompleted;
