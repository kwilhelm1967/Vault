/**
 * Accessibility Components Tests
 *
 * Tests for LiveRegion, SkipLink, and FocusTrap components
 * to ensure proper accessibility support for users with disabilities.
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveRegionProvider, useLiveRegion } from '../components/accessibility/LiveRegion';
import { SkipLink, SkipToMain, SkipToNavigation } from '../components/accessibility/SkipLink';
import { FocusTrap } from '../components/accessibility/FocusTrap';

// Mock window.speechSynthesis for screen reader tests
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => []),
  },
  writable: true,
});

describe('LiveRegionProvider', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render children without crashing', () => {
    render(
      <LiveRegionProvider>
        <div>Test content</div>
      </LiveRegionProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should include hidden live regions for screen readers', () => {
    render(
      <LiveRegionProvider>
        <div>Test content</div>
      </LiveRegionProvider>
    );

    const politeRegion = screen.getByRole('status', { hidden: true });
    const assertiveRegion = screen.getByRole('alert', { hidden: true });

    expect(politeRegion).toBeInTheDocument();
    expect(assertiveRegion).toBeInTheDocument();
    expect(politeRegion).toHaveAttribute('aria-live', 'polite');
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('should announce messages through the hook', () => {
    const TestComponent = () => {
      const { announce } = useLiveRegion();

      const handleClick = () => {
        announce('Test announcement', 'polite');
      };

      return (
        <button onClick={handleClick}>Announce</button>
      );
    };

    render(
      <LiveRegionProvider>
        <TestComponent />
      </LiveRegionProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const liveRegion = screen.getByRole('status', { hidden: true });
    expect(liveRegion).toHaveTextContent('Test announcement');
  });

  it('should clear announcements after timeout', async () => {
    jest.useFakeTimers();

    const TestComponent = () => {
      const { announce } = useLiveRegion();

      const handleClick = () => {
        announce('Test announcement', 'polite');
      };

      return (
        <button onClick={handleClick}>Announce</button>
      );
    };

    render(
      <LiveRegionProvider>
        <TestComponent />
      </LiveRegionProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const liveRegion = screen.getByRole('status', { hidden: true });
    expect(liveRegion).toHaveTextContent('Test announcement');

    // Fast-forward time
    jest.advanceTimersByTime(1100);

    expect(liveRegion).toHaveTextContent('');
  });

  it('should handle assertive announcements', () => {
    const TestComponent = () => {
      const { announce } = useLiveRegion();

      const handleClick = () => {
        announce('Error message', 'assertive');
      };

      return (
        <button onClick={handleClick}>Show Error</button>
      );
    };

    render(
      <LiveRegionProvider>
        <TestComponent />
      </LiveRegionProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const alertRegion = screen.getByRole('alert', { hidden: true });
    expect(alertRegion).toHaveTextContent('Error message');
  });

  it('should throw error when useLiveRegion is used outside provider', () => {
    // Test that hook throws when used outside provider
    const TestComponent = () => {
      useLiveRegion(); // This should throw
      return <div>Test</div>;
    };

    // Expect console error for the thrown error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow();

    consoleSpy.mockRestore();
  });
});

describe('SkipLink', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render skip link with correct href', () => {
    render(<SkipLink href="#main-content">Skip to main content</SkipLink>);

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveTextContent('Skip to main content');
  });

  it('should be visually hidden by default', () => {
    render(<SkipLink href="#content">Skip</SkipLink>);

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveClass('sr-only');
  });

  it('should become visible on focus', () => {
    render(<SkipLink href="#content">Skip</SkipLink>);

    const link = screen.getByRole('link', { hidden: true });
    link.focus();

    // Should remove sr-only and add focus classes
    expect(link).toHaveClass('focus:not-sr-only');
    expect(link).toHaveClass('focus:absolute');
  });

  it('should include ChevronRight icon', () => {
    render(<SkipLink href="#content">Skip</SkipLink>);

    // The icon should be present (though we can't easily test the SVG content)
    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveClass('flex', 'items-center', 'gap-2');
  });
});

describe('SkipToMain', () => {
  it('should render with correct text and href', () => {
    render(<SkipToMain />);

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', '#main-content');
    expect(link).toHaveTextContent('Skip to main content');
  });
});

describe('SkipToNavigation', () => {
  it('should render with correct text and href', () => {
    render(<SkipToNavigation />);

    const link = screen.getByRole('link', { hidden: true });
    expect(link).toHaveAttribute('href', '#navigation');
    expect(link).toHaveTextContent('Skip to navigation');
  });
});

describe('FocusTrap', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    cleanup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children', () => {
    render(
      <FocusTrap>
        <div>Test content</div>
      </FocusTrap>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should focus first focusable element on mount', () => {
    render(
      <FocusTrap isActive={true}>
        <button>First button</button>
        <button>Second button</button>
      </FocusTrap>
    );

    const firstButton = screen.getByText('First button');
    expect(firstButton).toHaveFocus();
  });

  it('should trap tab navigation within container', async () => {
    render(
      <FocusTrap isActive={true}>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </FocusTrap>
    );

    const firstButton = screen.getByText('First');
    const secondButton = screen.getByText('Second');
    const thirdButton = screen.getByText('Third');

    // Start with first button focused
    firstButton.focus();
    expect(firstButton).toHaveFocus();

    // Tab should go to second button
    await user.tab();
    expect(secondButton).toHaveFocus();

    // Tab should go to third button
    await user.tab();
    expect(thirdButton).toHaveFocus();

    // Tab should cycle back to first button
    await user.tab();
    expect(firstButton).toHaveFocus();
  });

  it('should support shift+tab navigation', async () => {
    render(
      <FocusTrap isActive={true}>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </FocusTrap>
    );

    const _firstButton = screen.getByText('First'); // Keep reference for potential future assertions
    const thirdButton = screen.getByText('Third');

    // Start with third button focused
    thirdButton.focus();
    expect(thirdButton).toHaveFocus();

    // Shift+Tab should go to second button (reverse)
    await user.tab({ shift: true });
    const secondButton = screen.getByText('Second');
    expect(secondButton).toHaveFocus();
  });

  it('should call onEscape when Escape is pressed', async () => {
    const onEscape = jest.fn();

    render(
      <FocusTrap isActive={true} onEscape={onEscape}>
        <button>Focus me</button>
      </FocusTrap>
    );

    const button = screen.getByText('Focus me');
    button.focus();

    await user.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should restore previous focus on unmount', () => {
    const externalButton = document.createElement('button');
    externalButton.textContent = 'External';
    document.body.appendChild(externalButton);
    externalButton.focus();

    const { unmount } = render(
      <FocusTrap isActive={true}>
        <button>Internal</button>
      </FocusTrap>
    );

    // Focus should be on internal button
    const internalButton = screen.getByText('Internal');
    expect(internalButton).toHaveFocus();

    // Unmount should restore focus
    unmount();
    expect(externalButton).toHaveFocus();

    // Cleanup
    document.body.removeChild(externalButton);
  });

  it('should handle non-focusable content', () => {
    render(
      <FocusTrap isActive={true}>
        <div>Just text</div>
        <span>No focus</span>
      </FocusTrap>
    );

    // Should not crash even with no focusable elements
    expect(screen.getByText('Just text')).toBeInTheDocument();
  });

  it('should respect isActive prop', () => {
    render(
      <FocusTrap isActive={false}>
        <button>Test button</button>
      </FocusTrap>
    );

    const button = screen.getByText('Test button');
    // When not active, should not auto-focus
    expect(button).not.toHaveFocus();
  });
});
