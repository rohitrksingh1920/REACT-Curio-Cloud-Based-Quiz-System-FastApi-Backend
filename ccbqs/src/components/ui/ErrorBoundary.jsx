import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          padding: 32,
          textAlign: 'center',
          background: 'var(--bg)',
        }}>
          <div style={{
            width: 72, height: 72,
            background: 'var(--danger-bg)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            color: 'var(--danger)',
            margin: '0 auto 8px',
          }}>
            <i className="ri-error-warning-line" />
          </div>
          <h2 style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-2)', maxWidth: 400 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard' }}
          >
            <i className="ri-home-line" /> Go to Dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
