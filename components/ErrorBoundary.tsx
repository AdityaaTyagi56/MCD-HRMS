import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <AlertTriangle size={40} style={{ color: '#dc2626' }} />
            </div>

            <h2 style={{ color: '#1e293b', fontSize: '24px', fontWeight: 'bold', margin: '0 0 12px' }}>
              कुछ गलत हुआ
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 8px' }}>
              Something went wrong
            </p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 24px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={18} />
              पुनः प्रयास करें
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
