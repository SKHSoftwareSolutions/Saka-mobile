import React from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './assets/main.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

// Log renderer errors not caught by the error boundary
window.onerror = (message, source, lineno, colno, error) => {
  const payload = {
    timestamp: new Date().toISOString(),
    message: String(message),
    source: source ?? '',
    line: lineno ?? 0,
    col: colno ?? 0,
    stack: error instanceof Error ? error.stack ?? '' : ''
  }
  try {
    window.api?.logError?.(JSON.stringify(payload))
  } catch {
    // swallow
  }
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const payload = {
    timestamp: new Date().toISOString(),
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack ?? '' : ''
  }
  try {
    window.api?.logError?.(JSON.stringify(payload))
  } catch {
    // swallow
  }
})

