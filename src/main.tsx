import { createRoot } from 'react-dom/client';
import { TodoApp } from './components/TodoApp';

// React owns the whole body. No application code manually edits Todo DOM nodes.
createRoot(document.body).render(<TodoApp />);
