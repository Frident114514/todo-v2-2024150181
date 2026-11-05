export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export type TodoFilter = 'all' | 'active' | 'done';

export interface LoadResult {
  todos: Todo[];
  repaired: boolean;
  invalid: boolean;
}

const MAX_TEXT = 100;

export function parseTodoId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validNumberId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function validateText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= MAX_TEXT ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storedId(value: unknown): number | null {
  return validNumberId(value) ? value : parseTodoId(value);
}

function reservedIds(entries: readonly unknown[]): Set<number> {
  const reserved = new Set<number>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const id = storedId(entry.id);
    if (id !== null) reserved.add(id);
  }
  return reserved;
}

function createIdAllocator(reserved: Set<number>, now: number): () => number {
  let candidate = validNumberId(now) ? now : 1;
  return () => {
    while (reserved.has(candidate))
      candidate = candidate === Number.MAX_SAFE_INTEGER ? 1 : candidate + 1;
    const id = candidate;
    reserved.add(id);
    candidate = id === Number.MAX_SAFE_INTEGER ? 1 : id + 1;
    return id;
  };
}

function resolveStoredId(value: unknown, seen: Set<number>, allocate: () => number): number | null {
  const id = storedId(value);
  if (id !== null) return seen.has(id) ? allocate() : id;
  // W7/W8 generated IDs as "timestamp-sequence". Preserve those tasks.
  if (typeof value === 'string' && /^\d+-[1-9]\d*$/.test(value)) return allocate();
  return null;
}

function normalizeStoredTodo(
  entry: unknown,
  seen: Set<number>,
  allocate: () => number
): { todo: Todo | null; repaired: boolean } {
  if (!isRecord(entry) || typeof entry.completed !== 'boolean')
    return { todo: null, repaired: true };
  const text = validateText(entry.text);
  if (text === null) return { todo: null, repaired: true };
  const id = resolveStoredId(entry.id, seen, allocate);
  if (id === null) return { todo: null, repaired: true };
  const repaired = typeof entry.id !== 'number' || entry.id !== id || entry.text !== text;
  seen.add(id);
  return { todo: { id, text, completed: entry.completed }, repaired };
}

export function nextTodoId(todos: readonly Todo[], now: number = Date.now()): number {
  const used = new Set(todos.map((todo) => todo.id));
  let id = validNumberId(now) ? now : 1;
  while (used.has(id)) id = id === Number.MAX_SAFE_INTEGER ? 1 : id + 1;
  return id;
}

export function decodeStoredTodos(raw: string | null, now: number = Date.now()): LoadResult {
  if (raw === null) return { todos: [], repaired: false, invalid: false };
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { todos: [], repaired: false, invalid: true };
  }
  if (!Array.isArray(value)) return { todos: [], repaired: false, invalid: true };

  const result: Todo[] = [];
  const allocate = createIdAllocator(reservedIds(value as unknown[]), now);
  const seen = new Set<number>();
  let repaired = false;

  for (const entry of value as unknown[]) {
    const normalized = normalizeStoredTodo(entry, seen, allocate);
    if (normalized.repaired) repaired = true;
    if (normalized.todo !== null) result.push(normalized.todo);
  }
  return { todos: result, repaired, invalid: false };
}

export function addTodo(todos: readonly Todo[], value: unknown, id: number): readonly Todo[] {
  const text = validateText(value);
  if (text === null || !validNumberId(id) || todos.some((todo) => todo.id === id)) return todos;
  return [...todos, { id, text, completed: false }];
}

export function toggleTodo(todos: readonly Todo[], id: number): readonly Todo[] {
  if (!validNumberId(id) || !todos.some((todo) => todo.id === id)) return todos;
  return todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo));
}

export function deleteTodo(todos: readonly Todo[], id: number): readonly Todo[] {
  if (!validNumberId(id) || !todos.some((todo) => todo.id === id)) return todos;
  return todos.filter((todo) => todo.id !== id);
}

export function editTodo(todos: readonly Todo[], id: number, value: unknown): readonly Todo[] {
  const text = validateText(value);
  if (
    text === null ||
    !validNumberId(id) ||
    !todos.some((todo) => todo.id === id && todo.text !== text)
  )
    return todos;
  return todos.map((todo) => (todo.id === id ? { ...todo, text } : todo));
}

export function clearCompleted(todos: readonly Todo[]): readonly Todo[] {
  if (!todos.some((todo) => todo.completed)) return todos;
  return todos.filter((todo) => !todo.completed);
}

export function filterTodos(todos: readonly Todo[], filter: TodoFilter): Todo[] {
  return todos.filter(
    (todo) => filter === 'all' || (filter === 'done' ? todo.completed : !todo.completed)
  );
}
