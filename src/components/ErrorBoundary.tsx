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
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-4xl mb-4">💥</div>
          <h2 className="text-xl font-bold mb-2 text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">
            An unexpected error occurred. You can try again or send us a quick report.
          </p>

          {submitted ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-600 dark:text-green-400 text-sm mb-5">
              Report sent — thank you!
            </div>
          ) : (
            <form onSubmit={(e) => this.handleReport(e)} className="mb-4 space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  What were you doing?{' '}
                  <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => this.setState({ description: e.target.value })}
                  placeholder="e.g. I clicked on a board card and the page crashed…"
                  rows={3}
                  className="w-full bg-secondary/40 border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 p-3 resize-none outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}

          <button
            onClick={() => this.setState({ hasError: false, error: null, submitted: false, description: '' })}
            className="w-full py-2.5 bg-transparent text-muted-foreground border border-border/60 text-sm font-medium rounded-lg hover:bg-secondary/40 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
