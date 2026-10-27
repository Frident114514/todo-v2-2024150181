"use strict";
(() => {
  // src/todo-core.ts
  var MAX_TEXT = 100;
  function parseTodoId(value) {
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
  function validNumberId(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  }
  function validateText(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text.length >= 1 && text.length <= MAX_TEXT ? text : null;
  }
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function nextTodoId(todos2, now = Date.now()) {
    const used = new Set(todos2.map((todo) => todo.id));
    let id = validNumberId(now) ? now : 1;
    while (used.has(id)) id = id === Number.MAX_SAFE_INTEGER ? 1 : id + 1;
    return id;
  }
  function decodeStoredTodos(raw, now = Date.now()) {
    if (raw === null) return { todos: [], repaired: false, invalid: false };
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return { todos: [], repaired: false, invalid: true };
    }
    if (!Array.isArray(value)) return { todos: [], repaired: false, invalid: true };
    const result = [];
    const reserved = /* @__PURE__ */ new Set();
    for (const entry of value) {
      if (!isRecord(entry)) continue;
      const numeric = validNumberId(entry.id) ? entry.id : parseTodoId(entry.id);
      if (numeric !== null) reserved.add(numeric);
    }
    let candidate = validNumberId(now) ? now : 1;
    const allocate = () => {
      while (reserved.has(candidate)) candidate = candidate === Number.MAX_SAFE_INTEGER ? 1 : candidate + 1;
      const id = candidate;
      reserved.add(id);
      candidate = id === Number.MAX_SAFE_INTEGER ? 1 : id + 1;
      return id;
    };
    const seen = /* @__PURE__ */ new Set();
    let repaired = false;
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.completed !== "boolean") {
        repaired = true;
        continue;
      }
      const text = validateText(entry.text);
      if (text === null) {
        repaired = true;
        continue;
      }
      let id = validNumberId(entry.id) ? entry.id : parseTodoId(entry.id);
      if (id === null) {
        if (typeof entry.id !== "string" || !/^\d+-[1-9]\d*$/.test(entry.id)) {
          repaired = true;
          continue;
        }
        id = allocate();
        repaired = true;
      } else if (seen.has(id)) {
        id = allocate();
        repaired = true;
      }
      if (typeof entry.id !== "number" || entry.text !== text) repaired = true;
      seen.add(id);
      result.push({ id, text, completed: entry.completed });
    }
    return { todos: result, repaired, invalid: false };
  }
  function addTodo(todos2, value, id) {
    const text = validateText(value);
    if (text === null || !validNumberId(id) || todos2.some((todo) => todo.id === id)) return todos2;
    return [...todos2, { id, text, completed: false }];
  }
  function toggleTodo(todos2, id) {
    if (!validNumberId(id) || !todos2.some((todo) => todo.id === id)) return todos2;
    return todos2.map((todo) => todo.id === id ? { ...todo, completed: !todo.completed } : todo);
  }
  function deleteTodo(todos2, id) {
    if (!validNumberId(id) || !todos2.some((todo) => todo.id === id)) return todos2;
    return todos2.filter((todo) => todo.id !== id);
  }
  function editTodo(todos2, id, value) {
    const text = validateText(value);
    if (text === null || !validNumberId(id) || !todos2.some((todo) => todo.id === id && todo.text !== text)) return todos2;
    return todos2.map((todo) => todo.id === id ? { ...todo, text } : todo);
  }
  function clearCompleted(todos2) {
    if (!todos2.some((todo) => todo.completed)) return todos2;
    return todos2.filter((todo) => !todo.completed);
  }
  function filterTodos(todos2, filter2) {
    return todos2.filter((todo) => filter2 === "all" || (filter2 === "done" ? todo.completed : !todo.completed));
  }

  // src/app.ts
  var KEY = "szu-todo-v2-2024150181";
  function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (element === null) throw new Error(`\u627E\u4E0D\u5230\u9875\u9762\u5143\u7D20\uFF1A${selector}`);
    return element;
  }
  var list = requiredElement("#todo-list");
  var input = requiredElement("#todo-input");
  var form = requiredElement("#todo-form");
  var message = requiredElement("#message");
  var count = requiredElement("#todo-count");
  var empty = requiredElement("#empty-state");
  var filterButtons = document.querySelectorAll("[data-filter]");
  function readStored() {
    try {
      return decodeStoredTodos(localStorage.getItem(KEY));
    } catch (error) {
      console.error("\u6062\u590D\u5F85\u529E\u5931\u8D25\uFF1A", error);
      return { todos: [], repaired: false, invalid: true };
    }
  }
  var initial = readStored();
  var todos = initial.todos;
  var filter = "all";
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(todos));
      return true;
    } catch (error) {
      console.error("\u4FDD\u5B58\u5F85\u529E\u5931\u8D25\uFF1A", error);
      return false;
    }
  }
  function notify(text, isError = false) {
    message.textContent = text;
    message.dataset.error = String(isError);
  }
  function render() {
    const shown = filterTodos(todos, filter);
    const fragment = document.createDocumentFragment();
    for (const todo of shown) {
      const li = document.createElement("li");
      li.dataset.id = String(todo.id);
      if (todo.completed) li.classList.add("done");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "toggle";
      toggle.dataset.action = "toggle";
      toggle.textContent = todo.completed ? "\u2713" : "";
      toggle.setAttribute("aria-label", `${todo.completed ? "\u6807\u8BB0\u672A\u5B8C\u6210" : "\u6807\u8BB0\u5B8C\u6210"}\uFF1A${todo.text}`);
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = todo.text;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit";
      edit.dataset.action = "edit";
      edit.textContent = "\u7F16\u8F91";
      edit.setAttribute("aria-label", `\u7F16\u8F91\uFF1A${todo.text}`);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete";
      del.dataset.action = "delete";
      del.setAttribute("aria-label", `\u5220\u9664\uFF1A${todo.text}`);
      const icon = document.createElement("span");
      icon.className = "delete-icon";
      icon.textContent = "\xD7";
      icon.setAttribute("aria-hidden", "true");
      del.append(icon);
      li.append(toggle, text, edit, del);
      fragment.append(li);
    }
    list.replaceChildren(fragment);
    count.textContent = `${todos.length} \u9879`;
    empty.hidden = shown.length > 0;
    empty.textContent = todos.length ? "\u5F53\u524D\u7B5B\u9009\u4E0B\u6CA1\u6709\u4EFB\u52A1\u3002" : "\u8FD8\u6CA1\u6709\u4EFB\u52A1\uFF0C\u5148\u6DFB\u52A0\u4E00\u9879\u5427\u3002";
  }
  function commit(next, success, failure) {
    if (next === todos) return false;
    todos = next;
    const saved = save();
    render();
    notify(saved ? success : failure, !saved);
    return true;
  }
  function addTodo2(value) {
    const next = addTodo(todos, value, nextTodoId(todos));
    if (next === todos) {
      notify("\u8BF7\u8F93\u5165 1\u2013100 \u4E2A\u5B57\u7B26\u7684\u4EFB\u52A1\uFF0C\u4E0D\u80FD\u53EA\u542B\u7A7A\u683C\u3002", true);
      return false;
    }
    return commit(next, "\u4EFB\u52A1\u5DF2\u6DFB\u52A0\u3002", "\u4EFB\u52A1\u5DF2\u6DFB\u52A0\uFF0C\u4F46\u65E0\u6CD5\u4FDD\u5B58\uFF1B\u5237\u65B0\u540E\u53EF\u80FD\u4E22\u5931\u3002");
  }
  function deleteTodo2(id) {
    const next = deleteTodo(todos, id);
    if (next !== todos) {
      console.log("[delete]", id);
      commit(next, "\u4EFB\u52A1\u5DF2\u5220\u9664\u3002", "\u4EFB\u52A1\u5DF2\u5220\u9664\uFF0C\u4F46\u65E0\u6CD5\u4FDD\u5B58\uFF1B\u5237\u65B0\u540E\u53EF\u80FD\u6062\u590D\u3002");
    }
  }
  function toggleTodo2(id) {
    const next = toggleTodo(todos, id);
    if (next !== todos) {
      console.log("[toggle]", id);
      commit(next, "\u4EFB\u52A1\u72B6\u6001\u5DF2\u66F4\u65B0\u3002", "\u4EFB\u52A1\u72B6\u6001\u5DF2\u66F4\u65B0\uFF0C\u4F46\u65E0\u6CD5\u4FDD\u5B58\uFF1B\u5237\u65B0\u540E\u53EF\u80FD\u6062\u590D\u3002");
    }
  }
  function updateTodo(id, value) {
    if (validateText(value) === null) {
      notify("\u4FEE\u6539\u5185\u5BB9\u987B\u4E3A 1\u2013100 \u4E2A\u5B57\u7B26\uFF0C\u4E0D\u80FD\u53EA\u542B\u7A7A\u683C\u3002", true);
      return;
    }
    const next = editTodo(todos, id, value);
    if (next !== todos) {
      console.log("[edit]", id);
      commit(next, "\u4EFB\u52A1\u5185\u5BB9\u5DF2\u66F4\u65B0\u3002", "\u4EFB\u52A1\u5DF2\u4FEE\u6539\uFF0C\u4F46\u65E0\u6CD5\u4FDD\u5B58\uFF1B\u5237\u65B0\u540E\u53EF\u80FD\u6062\u590D\u3002");
    }
  }
  function clearCompleted2() {
    commit(clearCompleted(todos), "\u5DF2\u6E05\u9664\u6240\u6709\u5B8C\u6210\u9879\u3002", "\u5B8C\u6210\u9879\u5DF2\u6E05\u9664\uFF0C\u4F46\u65E0\u6CD5\u4FDD\u5B58\uFF1B\u5237\u65B0\u540E\u53EF\u80FD\u6062\u590D\u3002");
  }
  function setFilter(value) {
    if (value !== "all" && value !== "active" && value !== "done") return;
    filter = value;
    filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === value)));
    render();
  }
  list.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const item = event.target.closest("li");
    if (item === null || !list.contains(item)) return;
    const id = parseTodoId(item.dataset.id);
    if (id === null) return;
    const todo = todos.find((task) => task.id === id);
    if (todo === void 0) return;
    const action = event.target.closest("[data-action]");
    if (action !== null && item.contains(action) && action.dataset.action === "delete") {
      deleteTodo2(id);
    } else if (action !== null && item.contains(action) && action.dataset.action === "edit") {
      const edited = window.prompt("\u4FEE\u6539\u4EFB\u52A1", todo.text);
      if (edited !== null) updateTodo(id, edited);
    } else {
      toggleTodo2(id);
    }
  });
  filterButtons.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (addTodo2(input.value)) input.value = "";
    input.focus();
  });
  if (initial.repaired) {
    const saved = save();
    notify(saved ? "\u65E7\u7248\u6216\u90E8\u5206\u635F\u574F\u7684\u6570\u636E\u5DF2\u6574\u7406\u5E76\u4FDD\u5B58\u3002" : "\u6570\u636E\u5DF2\u6574\u7406\uFF0C\u4F46\u4FDD\u5B58\u5931\u8D25\u3002", !saved);
  } else if (initial.invalid) {
    notify("\u5DF2\u4FDD\u5B58\u7684\u6570\u636E\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u5F53\u524D\u663E\u793A\u7A7A\u5217\u8868\u3002", true);
  }
  render();
  window.clearCompleted = clearCompleted2;
})();
