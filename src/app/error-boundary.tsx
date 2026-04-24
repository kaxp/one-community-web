import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorState } from '@/components/error-state/ErrorState';
import { getReporter } from '@/lib/error-reporter';

interface Props {
  children: ReactNode;
}
interface State {
  error: unknown;
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    getReporter().captureException(error, { componentStack: info.componentStack });
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            error={this.state.error}
            onRetry={() => this.setState({ error: null })}
            onGoBack={() => {
              if (typeof window !== 'undefined') window.location.href = '/dashboard';
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
