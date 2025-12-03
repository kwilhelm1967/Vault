/**
 * LazyErrorBoundary Component
 *
 * Wraps lazy-loaded components with error boundaries to prevent
 * single component failures from crashing the entire app.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically designed for lazy-loaded components
 * Provides recovery options and prevents app crashes
 */
export class LazyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (only in development)
    if (import.meta.env.DEV) {
      console.error(`Lazy component error (${this.props.componentName}):`, error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: errorReporting.captureException(error, { extra: errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Component Error
          </h3>

          <p className="text-slate-400 text-sm mb-6 max-w-md">
            {this.props.componentName
              ? `The ${this.props.componentName} component encountered an error.`
              : 'This component encountered an error.'
            }
            Your other data is safe.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <div className="mb-6 p-3 bg-slate-900/50 rounded-lg text-left max-w-md">
              <p className="text-xs text-slate-500 mb-1 font-medium">Error details:</p>
              <code className="text-xs text-red-400 break-all">
                {this.state.error.message}
              </code>
            </div>
          )}

          <button
            onClick={this.handleRetry}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a lazy component with error boundary
 */
export function withLazyErrorBoundary<T extends object>(
  LazyComponent: React.ComponentType<T>,
  componentName: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: T) => (
    <LazyErrorBoundary componentName={componentName} fallback={fallback}>
      <LazyComponent {...props} />
    </LazyErrorBoundary>
  );

  WrappedComponent.displayName = `withLazyErrorBoundary(${componentName})`;
  return WrappedComponent;
}

export default LazyErrorBoundary;
