import { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  submitted: boolean;
  description: string;
  sending: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, submitted: false, description: '', sending: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('react.error_boundary', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private async handleReport(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    this.setState({ sending: true });
    const { error, description } = this.state;
    logError('user.error_report', {
      description,
      message: error?.message,
      stack: error?.stack,
      url: window.location.href,
    });
    this.setState({ submitted: true, sending: false });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { submitted, sending, description } = this.state;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'sans-serif', padding: '2rem',
      }}>
        <div style={{
          width: '100%', maxWidth: 460, background: '#111', border: '1px solid #222',
          borderRadius: 16, padding: '2rem',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 24px', color: '#737373', fontSize: 14 }}>
            An unexpected error occurred. You can try again or send us a quick report.
          </p>
          {submitted ? (
            <div style={{
              background: '#0d1f12', border: '1px solid #166534', borderRadius: 10,
              padding: '1rem', color: '#4ade80', fontSize: 14, marginBottom: 20,
            }}>
              Report sent — thank you!
            </div>
          ) : (
            <form onSubmit={(e) => this.handleReport(e)} style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#a3a3a3', marginBottom: 6 }}>
                What were you doing? <span style={{ color: '#525252' }}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => this.setState({ description: e.target.value })}
                placeholder="e.g. I clicked on a board card and the page crashed…"
                rows={3}
                style={{
                  width: '100%', background: '#0a0a0a', border: '1px solid #333',
                  borderRadius: 8, color: '#e5e5e5', fontSize: 14, padding: '10px 12px',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                type="submit" disabled={sending}
                style={{
                  marginTop: 10, width: '100%', padding: '10px', background: '#ec4899',
                  color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600,
                  fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null, submitted: false, description: '' })}
            style={{
              width: '100%', padding: '10px', background: 'transparent',
              color: '#a3a3a3', border: '1px solid #333', borderRadius: 8,
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
