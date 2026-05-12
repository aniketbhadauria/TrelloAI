import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { logError } from './lib/logger';

window.addEventListener('error', (event) => {
  logError('uncaught.error', {
    message: event.message,
    stack: event.error instanceof Error ? event.error.stack : undefined,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError('uncaught.promise_rejection', {
    message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
  });
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
