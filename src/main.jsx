import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { logError } from './lib/logger.js'

window.onerror = (message, source, lineno, colno, error) => {
  logError('Uncaught error', { message, source, lineno, colno, stack: error?.stack });
};

window.onunhandledrejection = (event) => {
  logError('Unhandled promise rejection', {
    reason: event.reason instanceof Error
      ? { message: event.reason.message, stack: event.reason.stack }
      : String(event.reason),
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
