import { Component } from 'react'

// Catches render/lifecycle errors anywhere below and shows a recoverable
// fallback instead of a blank screen.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Hook for an error-reporting service later (Sentry, etc.)
    console.error('Unhandled UI error:', error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-bg px-4 text-center text-fg">
        <div className="max-w-md">
          <p className="text-3xl text-accent">★</p>
          <h1 className="mt-3 font-display text-2xl font-semibold">Something broke</h1>
          <p className="mt-2 text-sm text-muted">
            An unexpected error crashed this view. Your data is safe — try reloading.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-border bg-surface p-3 text-left text-xs text-faint">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => { this.reset(); window.location.assign('/dashboard') }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-fg hover:bg-surface2"
            >
              Go to dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-110"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
