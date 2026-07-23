import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const info = errorInfo.componentStack ?? ''
    this.setState({ errorInfo: info })

    // Log to main process
    const payload = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack ?? '',
      componentStack: info
    }
    try {
      window.api?.logError?.(JSON.stringify(payload))
    } catch {
      // Last resort — can't even log
    }

    console.error('[ErrorBoundary]', error, info)
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.hash = '#/dashboard'
    window.location.reload()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { error } = this.state

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8 text-center">
          {/* Warning icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>

          <p className="text-gray-600 mb-2">
            The app ran into an unexpected problem and needs to restart.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Your data is safe — this is a display error, not a data problem.
            <br />
            If this keeps happening, please contact support.
          </p>

          {error?.message && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Error details
              </p>
              <p className="text-sm text-gray-700 font-mono break-all">{error.message}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleRestart}
              className="h-11 px-6 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700"
            >
              Restart App
            </button>
            <button
              onClick={this.handleGoHome}
              className="h-11 px-6 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }
}
