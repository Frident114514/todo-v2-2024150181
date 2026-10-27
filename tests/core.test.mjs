import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTodo,
  clearCompleted,
  decodeStoredTodos,
  deleteTodo,
  editTodo,
  filterTodos,
  nextTodoId,
  parseTodoId,
  toggleTodo
} from '../dist/todo-core.js';

const first = {id: 101, text: '复习 TypeScript', completed: false};
const second = {id: 102, text: '跑步 3 公里', completed: true};

test('addTodo：去除前后空格，保留原列表，新增项默认未完成', () => {
  const original = [first];
  const result = addTodo(original, '  写单测  ', 103);
  assert.deepEqual(result, [first, {id: 103, text: '写单测', completed: false}]);
  assert.deepEqual(original, [first]);
  assert.notStrictEqual(result, original);
});

test('addTodo：拦截空值、纯空格、非字符串和超过 100 字', () => {
  const original = [first];
  for (const invalid of ['', '  \n ', null, 42, '字'.repeat(101)]) {
    assert.strictEqual(addTodo(original, invalid, 103), original);
  }
});

test('addTodo：100 字边界可添加，重复、负数和非安全整数 ID 被拒绝', () => {
  const original = [first];
  assert.equal(addTodo(original, '字'.repeat(100), 103)[1].text.length, 100);
  for (const id of [101, 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.strictEqual(addTodo(original, '有效文本', id), original);
  }
});

test('toggleTodo：只切换指定项，且不改写原数组或原对象', () => {
  const original = [first, second];
  const result = toggleTodo(original, 101);
  assert.deepEqual(result, [{...first, completed: true}, second]);
  assert.deepEqual(original, [first, second]);
  assert.notStrictEqual(result[0], first);
  assert.strictEqual(result[1], second);
  assert.deepEqual(toggleTodo(result, 101), original);
});

test('toggleTodo：不存在或非法 ID 不产生状态变化', () => {
  const original = [first, second];
  for (const id of [999, 0, -1, Number.NaN]) {
    assert.strictEqual(toggleTodo(original, id), original);
  }
});

test('dataset.id：只接受规范的正整数数字字符串', () => {
  assert.equal(parseTodoId('101'), 101);
  for (const value of [undefined, null, 101, '', '0', '-1', '01', '1.2', '1x', '9007199254740992']) {
    assert.equal(parseTodoId(value), null);
  }
});

test('持久化：无数据、损坏 JSON、非数组与脏项安全处理', () => {
  assert.deepEqual(decodeStoredTodos(null), {todos: [], repaired: false, invalid: false});
  assert.deepEqual(decodeStoredTodos('{'), {todos: [], repaired: false, invalid: true});
  assert.deepEqual(decodeStoredTodos('{}'), {todos: [], repaired: false, invalid: true});
  const raw = JSON.stringify([null, {id: 5, text: '  正常  ', completed: false}, {id: 6, text: '', completed: true}, {id: 7, text: '类型错', completed: 'yes'}]);
  assert.deepEqual(decodeStoredTodos(raw, 100), {
    todos: [{id: 5, text: '正常', completed: false}], repaired: true, invalid: false
  });
});

test('升级兼容：旧版字符串 ID 和重复 ID 迁移成唯一数字 ID', () => {
  const raw = JSON.stringify([
    {id: '1700000000000-1', text: '旧版', completed: false},
    {id: '42', text: '数字字符串', completed: true},
    {id: 42, text: '重复 ID', completed: false}
  ]);
  const result = decodeStoredTodos(raw, 100);
  assert.deepEqual(result, {
    todos: [
      {id: 100, text: '旧版', completed: false},
      {id: 42, text: '数字字符串', completed: true},
      {id: 101, text: '重复 ID', completed: false}
    ],
    repaired: true, invalid: false
  });
  assert.equal(new Set(result.todos.map(todo => todo.id)).size, 3);
});

test('序号、删除、编辑、清除完成项及筛选保持数据一致', () => {
  const original = [first, second];
  assert.equal(nextTodoId(original, 101), 103);
  assert.deepEqual(deleteTodo(original, 102), [first]);
  assert.strictEqual(deleteTodo(original, 999), original);
  assert.deepEqual(editTodo(original, 101, '  已修改  '), [{...first, text: '已修改'}, second]);
  assert.strictEqual(editTodo(original, 101, ' '), original);
  assert.deepEqual(clearCompleted(original), [first]);
  assert.deepEqual(filterTodos(original, 'active'), [first]);
  assert.deepEqual(filterTodos(original, 'done'), [second]);
  assert.deepEqual(filterTodos(original, 'all'), original);
});
