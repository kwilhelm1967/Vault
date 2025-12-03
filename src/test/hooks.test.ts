/**
 * Custom Hooks Tests
 *
 * Tests for React custom hooks to ensure proper functionality
 * and state management.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, ToastProvider } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';

// Test component wrapper for hooks
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

describe('useToast Hook', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const TestComponent = () => {
    const { showToast, hideToast } = useToast();

    const handleShowSuccess = () => {
      showToast('Success message!', 'success');
    };

    const handleShowError = () => {
      showToast('Error message!', 'error');
    };

    const handleShowInfo = () => {
      showToast('Info message!', 'info');
    };

    const handleHide = () => {
      hideToast();
    };

    return (
      <div>
        <button onClick={handleShowSuccess}>Show Success</button>
        <button onClick={handleShowError}>Show Error</button>
        <button onClick={handleShowInfo}>Show Info</button>
        <button onClick={handleHide}>Hide Toast</button>
      </div>
    );
  };

  it('should show success toast', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const successButton = screen.getByText('Show Success');
    await user.click(successButton);

    await waitFor(() => {
      expect(screen.getByText('Success message!')).toBeInTheDocument();
    });
  });

  it('should show error toast', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const errorButton = screen.getByText('Show Error');
    await user.click(errorButton);

    await waitFor(() => {
      expect(screen.getByText('Error message!')).toBeInTheDocument();
    });
  });

  it('should show info toast', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const infoButton = screen.getByText('Show Info');
    await user.click(infoButton);

    await waitFor(() => {
      expect(screen.getByText('Info message!')).toBeInTheDocument();
    });
  });

  it('should hide toast when requested', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const successButton = screen.getByText('Show Success');
    await user.click(successButton);

    await waitFor(() => {
      expect(screen.getByText('Success message!')).toBeInTheDocument();
    });

    const hideButton = screen.getByText('Hide Toast');
    await user.click(hideButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message!')).not.toBeInTheDocument();
    });
  });

  it('should auto-hide toast after duration', async () => {
    vi.useFakeTimers();

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const successButton = screen.getByText('Show Success');
    await user.click(successButton);

    await waitFor(() => {
      expect(screen.getByText('Success message!')).toBeInTheDocument();
    });

    // Fast-forward time
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByText('Success message!')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('should throw error when used outside ToastProvider', () => {
    const TestComponent = () => {
      useToast();
      return <div>Test</div>;
    };

    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleSpy.mockRestore();
  });
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestComponent = () => {
    const { isAuthenticated, login, logout, user } = useAuth();

    const handleLogin = () => {
      login('test@example.com', 'password123');
    };

    const handleLogout = () => {
      logout();
    };

    return (
      <div>
        <div data-testid="auth-status">
          {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </div>
        <div data-testid="user-email">{user?.email || 'No user'}</div>
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  };

  it('should start unauthenticated', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
  });

  it('should authenticate user on login', () => {
    render(<TestComponent />);

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
  });

  it('should logout user', () => {
    render(<TestComponent />);

    // Login first
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    // Then logout
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
  });

  it('should persist authentication across renders', () => {
    const { rerender } = render(<TestComponent />);

    // Login
    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    // Re-render
    rerender(<TestComponent />);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
  });
});

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestComponent = () => {
    const {
      currentStep,
      isComplete,
      nextStep,
      prevStep,
      goToStep,
      completeOnboarding,
      resetOnboarding
    } = useOnboarding();

    return (
      <div>
        <div data-testid="current-step">{currentStep}</div>
        <div data-testid="is-complete">{isComplete ? 'Complete' : 'Incomplete'}</div>
        <button onClick={nextStep}>Next</button>
        <button onClick={prevStep}>Previous</button>
        <button onClick={() => goToStep(2)}>Go to Step 2</button>
        <button onClick={completeOnboarding}>Complete</button>
        <button onClick={resetOnboarding}>Reset</button>
      </div>
    );
  };

  it('should start at step 0', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    expect(screen.getByTestId('is-complete')).toHaveTextContent('Incomplete');
  });

  it('should advance to next step', () => {
    render(<TestComponent />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(screen.getByTestId('current-step')).toHaveTextContent('1');
  });

  it('should go back to previous step', () => {
    render(<TestComponent />);

    // Go to step 1
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    expect(screen.getByTestId('current-step')).toHaveTextContent('1');

    // Go back to step 0
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
  });

  it('should go to specific step', () => {
    render(<TestComponent />);

    const goToStepButton = screen.getByText('Go to Step 2');
    fireEvent.click(goToStepButton);

    expect(screen.getByTestId('current-step')).toHaveTextContent('2');
  });

  it('should mark as complete', () => {
    render(<TestComponent />);

    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    expect(screen.getByTestId('is-complete')).toHaveTextContent('Complete');
  });

  it('should reset onboarding', () => {
    render(<TestComponent />);

    // Complete onboarding
    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);
    expect(screen.getByTestId('is-complete')).toHaveTextContent('Complete');

    // Reset
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    expect(screen.getByTestId('is-complete')).toHaveTextContent('Incomplete');
  });

  it('should persist state in localStorage', () => {
    const { rerender } = render(<TestComponent />);

    // Go to step 2
    const goToStepButton = screen.getByText('Go to Step 2');
    fireEvent.click(goToStepButton);

    // Re-render (simulating page refresh)
    rerender(<TestComponent />);

    expect(screen.getByTestId('current-step')).toHaveTextContent('2');
  });

  it('should handle step boundaries', () => {
    render(<TestComponent />);

    // Try to go below 0
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    expect(screen.getByTestId('current-step')).toHaveTextContent('0');

    // Go to step 2, then try to go beyond (assuming max step is 2)
    const goToStepButton = screen.getByText('Go to Step 2');
    fireEvent.click(goToStepButton);
    expect(screen.getByTestId('current-step')).toHaveTextContent('2');

    // Try to go next beyond max
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    expect(screen.getByTestId('current-step')).toHaveTextContent('2');
  });
});
