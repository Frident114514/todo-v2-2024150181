// Intentional W8 PPT defect for reproduction only; never used by index.html.
function buggyClick(e) {
  if (!(e.target instanceof Element)) return;
  const item = e.target.closest('li');
  if (!item || !list.contains(item)) return;
  const id = item.dataset.id;
  if (!id) return;
  const delBtn = e.target.closest('[data-action="delete"]');
  if (delBtn && item.contains(delBtn)) {
    deleteTodo(id);
  }
  toggleTodo(id); // BUG: deletion falls through to toggle.
}
