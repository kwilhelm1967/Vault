/**
 * Error Boundary Component
 * 
 * Catches React errors in component tree and displays a user-friendly error message.
 * Prevents the entire app from crashing due to unhandled errors.
 * 
 * Maintains privacy: No error data is transmitted externally.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { devError } from '../utils/devLog';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (dev mode only, no external transmission)
    devError('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear error state and navigate to home
    this.handleReset();
    // If using routing, navigate to home route
    // For now, just reset the error boundary
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 border border-red-500/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                <p className="text-sm text-slate-400">An unexpected error occurred</p>
              </div>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <p className="text-xs text-red-400 font-mono mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                aria-label="Try again"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                aria-label="Reload application"
              >
                Reload Application
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                aria-label="Go to home"
              >
                <Home className="w-4 h-4" strokeWidth={2} />
                Go to Home
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500 text-center">
              If this problem persists, please contact support@LocalPasswordVault.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
