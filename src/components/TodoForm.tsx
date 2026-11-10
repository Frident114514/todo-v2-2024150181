import { useRef, useState, type FormEvent } from 'react';

export interface TodoFormProps {
  onAdd: (text: string) => boolean;
}

export function TodoForm({ onAdd }: TodoFormProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onAdd(text)) setText('');
    inputRef.current?.focus();
  }

  return (
    <form id="todo-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="todo-input">新增任务</label>
      <div className="form-row">
        <input
          id="todo-input"
          ref={inputRef}
          type="text"
          maxLength={100}
          placeholder="例如：完成第11周实验"
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit">添加</button>
      </div>
    </form>
  );
}
