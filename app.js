'use strict';
const KEY = 'szu-todo-v2-2024150181';
const list = document.querySelector('#todo-list');
const input = document.querySelector('#todo-input');
const form = document.querySelector('#todo-form');
const message = document.querySelector('#message');
const count = document.querySelector('#todo-count');
const empty = document.querySelector('#empty-state');
let todos = load();
let filter = 'all';
let sequence = 0;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
    return true;
  } catch (error) {
    console.error('保存待办失败：', error);
    return false;
  }
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(todo => todo &&
      (typeof todo.id === 'string' || typeof todo.id === 'number') &&
      typeof todo.text === 'string' && typeof todo.completed === 'boolean')) {
      throw new TypeError('存储结构不是Todo数组');
    }
    return data;
  } catch (error) {
    console.error('恢复待办失败：', error);
    notify('已保存的数据无法读取，当前显示空列表。', true);
    return [];
  }
}
function nextId() { return `${Date.now()}-${++sequence}`; }
function notify(text, isError = false) {
  message.textContent = text;
  message.dataset.error = String(isError);
}
function render() {
  const shown = todos.filter(todo =>
    filter === 'done' ? todo.completed : filter === 'active' ? !todo.completed : true);
  const fragment = document.createDocumentFragment();
  for (const todo of shown) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
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
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.dataset.action = 'delete';
    const icon = document.createElement('span');
    icon.className = 'delete-icon';
    icon.textContent = '×';
    icon.setAttribute('aria-hidden', 'true');
    del.append(icon);
    del.setAttribute('aria-label', `删除：${todo.text}`);
    li.append(toggle, text, del);
    fragment.append(li);
  }
  list.replaceChildren(fragment);
  count.textContent = `${todos.length} 项`;
  empty.hidden = shown.length > 0;
  empty.textContent = todos.length ? '当前筛选下没有任务。' : '还没有任务，先添加一项吧。';
}
function addTodo(text) {
  const value = String(text).trim();
  if (!value || value.length > 100) {
    notify('请输入 1–100 个字符的任务，不能只含空格。', true);
    return false;
  }
  todos = [...todos, {id: nextId(), text: value, completed: false}];
  const saved = save(); render();
  notify(saved ? '任务已添加。' : '任务已添加，但无法保存；刷新后可能丢失。', !saved);
  return true;
}
function deleteTodo(id) {
  console.log('[delete]', id);
  todos = todos.filter(todo => todo.id !== id);
  const saved = save(); render();
  notify(saved ? '任务已删除。' : '任务已删除，但无法保存；刷新后可能恢复。', !saved);
}
function toggleTodo(id) {
  console.log('[toggle]', id);
  todos = todos.map(todo => todo.id === id ? {...todo, completed: !todo.completed} : todo);
  const saved = save(); render();
  notify(saved ? '任务状态已更新。' : '任务状态已更新，但无法保存；刷新后可能恢复。', !saved);
}
// 用户明确要求由 AI 协助完成本周的 clearCompleted，而非声称独立手写。
function clearCompleted() {
  todos = todos.filter(todo => !todo.completed);
  const saved = save(); render();
  notify(saved ? '已清除所有完成项。' : '完成项已清除，但无法保存；刷新后可能恢复。', !saved);
}
function setFilter(value) {
  if (!['all', 'active', 'done'].includes(value)) return;
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === value));
  });
  render();
}
// The UL survives render(). All task interactions are delegated here once.
function handleListClick(event) {
  if (!(event.target instanceof Element)) return;
  const item = event.target.closest('li');
  if (!item || !list.contains(item)) return;
  const id = item.dataset.id;
  if (!id) return;
  // dataset is a string; resolve the original ID type for W7 numeric IDs too.
  const task = todos.find(todo => String(todo.id) === id);
  if (!task) return;
  const delBtn = event.target.closest('[data-action="delete"]');
  if (delBtn && item.contains(delBtn)) {
    deleteTodo(task.id);
  } else {
    toggleTodo(task.id);
  }
}
list.addEventListener('click', handleListClick);
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => setFilter(button.dataset.filter));
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (addTodo(input.value)) input.value = '';
  input.focus();
});
render();
