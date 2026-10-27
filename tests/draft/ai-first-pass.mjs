// AI 初稿，仅用于第 9 周审查记录；不参与 npm run test。
// 这些断言会“通过”，却无法证明目标行为正确。
import assert from 'node:assert/strict';
import {addTodo, toggleTodo} from '../../dist/todo-core.js';

const original = [{id: 1, text: '示例', completed: false}];
assert.equal(addTodo([], '新任务', 2).length, 1);
assert.ok(toggleTodo(original, 1));
