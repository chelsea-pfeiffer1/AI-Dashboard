import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
            color: '#e2e8f0',
            fontFamily: 'Arial, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 700, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
              Something went wrong
            </div>
            <div style={{ color: '#cbd5e1', marginBottom: 16, lineHeight: 1.6 }}>
              The dashboard failed to render. Please refresh the page or check the console for details.
            </div>
            <div style={{ color: '#f87171', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {String(this.state.error || 'Unknown error')}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
