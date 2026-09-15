import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last line of defence: a render crash shows a recoverable screen instead of a blank window. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Renderer crashed', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <pre className="bg-panel-2 text-danger max-w-xl overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap select-text">
          {error.message}
        </pre>
        <Button
          variant="primary"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    );
  }
}
