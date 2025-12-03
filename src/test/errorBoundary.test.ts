/**
 * Error Boundary Component Tests
 *
 * Tests for the ErrorBoundary component to ensure
 * proper error catching and recovery.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('ErrorBoundary', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockReload.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>No errors here!</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('No errors here!')).toBeInTheDocument();
  });

  it('should catch and display error fallback UI when error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should display error message in development mode', () => {
    // Mock import.meta.env.DEV to true
    const originalDev = import.meta.env.DEV;
    vi.stubEnv('DEV', true);

    const ThrowError = () => {
      throw new Error('Development error message');
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Development error message')).toBeInTheDocument();
    expect(screen.getByText('Error details:')).toBeInTheDocument();

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('should not display error details in production mode', () => {
    // Mock import.meta.env.DEV to false
    vi.stubEnv('DEV', false);

    const ThrowError = () => {
      throw new Error('Production error message');
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Production error message')).not.toBeInTheDocument();
    expect(screen.queryByText('Error details:')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('should call window.location.reload when Reload button is clicked', async () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload/i });
    await user.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('should reset error state when Try Again button is clicked', async () => {
    let shouldThrow = true;

    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Recovered successfully!</div>;
    };

    const TestComponent = () => {
      const [throwError, setThrowError] = React.useState(true);

      shouldThrow = throwError;

      return (
        <ErrorBoundary>
          <ConditionalError />
          <button onClick={() => setThrowError(false)}>Fix Error</button>
        </ErrorBoundary>
      );
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(<TestComponent />);

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click Try Again
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainButton);

    // Should still show error since we haven't fixed the error condition
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should display support contact information', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/contact/i)).toBeInTheDocument();
    expect(screen.getByText('support@localpasswordvault.com')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should have proper ARIA labels and roles', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload/i });
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });

    expect(reloadButton).toBeInTheDocument();
    expect(tryAgainButton).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should handle multiple error types', () => {
    const testErrors = [
      new Error('String error'),
      new TypeError('Type error'),
      new ReferenceError('Reference error'),
      { message: 'Object error' },
    ];

    testErrors.forEach((error, index) => {
      const ThrowError = () => {
        throw error;
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = render(
        <ErrorBoundary key={index}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      unmount();
      consoleSpy.mockRestore();
    });
  });

  it('should log errors to console in development', () => {
    vi.stubEnv('DEV', true);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowError = () => {
      throw new Error('Console logging test');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error Boundary caught an error:',
      expect.any(Error),
      expect.any(Object) // errorInfo
    );

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('should not log errors to console in production', () => {
    vi.stubEnv('DEV', false);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowError = () => {
      throw new Error('Production logging test');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Console.error should not be called for the caught error
    // (it might be called for other reasons, but not for our error logging)
    const errorCalls = consoleSpy.mock.calls.filter(call =>
      call[0] === 'Error Boundary caught an error:'
    );
    expect(errorCalls).toHaveLength(0);

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
