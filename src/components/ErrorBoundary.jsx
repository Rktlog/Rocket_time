// src/components/ErrorBoundary.jsx
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
    console.error('UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          color: '#991b1b',
          margin: '16px auto',
          maxWidth: '600px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>⚠️ Something went wrong in this workspace view.</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#7f1d1d', wordBreak: 'break-word' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
