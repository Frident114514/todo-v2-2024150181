import { expect, test } from 'vitest';
import {
  addTodo,
  clearCompleted,
  decodeStoredTodos,
  deleteTodo,
  editTodo,
  filterTodos,
  nextTodoId,
  parseTodoId,
  toggleTodo,
  type Todo
} from '../src/todo-core';

const first: Todo = { id: 101, text: '复习 TypeScript', completed: false };
const second: Todo = { id: 102, text: '跑步 3 公里', completed: true };

test('addTodo 去空格、默认未完成且不改原数组', () => {
  const original = [first];
  const result = addTodo(original, '  写单测  ', 103);
  expect(result).toEqual([first, { id: 103, text: '写单测', completed: false }]);
  expect(result).not.toBe(original);
  expect(original).toEqual([first]);
});

test('addTodo 拒绝空值、纯空格、非字符串和超长文本', () => {
  const original = [first];
  for (const invalid of ['', '  \n ', null, 42, '字'.repeat(101)]) {
    expect(addTodo(original, invalid, 103)).toBe(original);
  }
  expect(addTodo(original, '字'.repeat(100), 103)[1]?.text.length).toBe(100);
});

test('addTodo 拒绝重复及非法 ID', () => {
  const original = [first];
  for (const id of [101, 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    expect(addTodo(original, '有效文本', id)).toBe(original);
  }
});

test('toggleTodo 仅改变目标状态并保持旧对象不变', () => {
  const original = [first, second];
  const result = toggleTodo(original, 101);
  expect(result).toEqual([{ ...first, completed: true }, second]);
  expect(result).not.toBe(original);
  expect(result[0]).not.toBe(first);
  expect(result[1]).toBe(second);
  expect(original).toEqual([first, second]);
  expect(toggleTodo(result, 101)).toEqual(original);
});

test('toggleTodo 对不存在或非法 ID 不改变状态', () => {
  const original = [first, second];
  for (const id of [999, 0, -1, Number.NaN]) {
    expect(toggleTodo(original, id)).toBe(original);
  }
});

test('dataset.id 只接受规范的正整数数字字符串', () => {
  expect(parseTodoId('101')).toBe(101);
  for (const value of [
    undefined,
    null,
    101,
    '',
    '0',
    '-1',
    '01',
    '1.2',
    '1x',
    '9007199254740992'
  ]) {
    expect(parseTodoId(value)).toBeNull();
  }
});

test('损坏的持久化内容和脏记录安全处理', () => {
  expect(decodeStoredTodos(null)).toEqual({ todos: [], repaired: false, invalid: false });
  expect(decodeStoredTodos('{')).toEqual({ todos: [], repaired: false, invalid: true });
  expect(decodeStoredTodos('{}')).toEqual({ todos: [], repaired: false, invalid: true });
  const raw = JSON.stringify([
    null,
    { id: 5, text: '  正常  ', completed: false },
    { id: 6, text: '', completed: true },
    { id: 7, text: '类型错', completed: 'yes' }
  ]);
  expect(decodeStoredTodos(raw, 100)).toEqual({
    todos: [{ id: 5, text: '正常', completed: false }],
    repaired: true,
    invalid: false
  });
});

test('旧版字符串 ID 和重复 ID 迁移成唯一数字 ID', () => {
  const raw = JSON.stringify([
    { id: '1700000000000-1', text: '旧版', completed: false },
    { id: '42', text: '数字字符串', completed: true },
    { id: 42, text: '重复 ID', completed: false }
  ]);
  const result = decodeStoredTodos(raw, 100);
  expect(result).toEqual({
    todos: [
      { id: 100, text: '旧版', completed: false },
      { id: 42, text: '数字字符串', completed: true },
      { id: 101, text: '重复 ID', completed: false }
    ],
    repaired: true,
    invalid: false
  });
  expect(new Set(result.todos.map((todo) => todo.id)).size).toBe(3);
});

test('序号、删除、编辑、清除完成项和筛选保持数据一致', () => {
  const original = [first, second];
  expect(nextTodoId(original, 101)).toBe(103);
  expect(deleteTodo(original, 102)).toEqual([first]);
  expect(deleteTodo(original, 999)).toBe(original);
  expect(editTodo(original, 101, '  已修改  ')).toEqual([{ ...first, text: '已修改' }, second]);
  expect(editTodo(original, 101, ' ')).toBe(original);
  expect(clearCompleted(original)).toEqual([first]);
  expect(filterTodos(original, 'active')).toEqual([first]);
  expect(filterTodos(original, 'done')).toEqual([second]);
  expect(filterTodos(original, 'all')).toEqual(original);
});
