/**
 * Focus Trap Component
 *
 * Traps keyboard focus within a container (like modals or dialogs).
 * Ensures keyboard navigation stays within the component and
 * improves accessibility compliance.
 */

import React, { useEffect, useRef, useCallback, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  isActive = true,
  className = '',
  onEscape
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="menuitem"]'
      )
    ).filter((el) => {
      const htmlEl = el as HTMLElement;
      return htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0 && !htmlEl.hasAttribute('disabled');
    }) as HTMLElement[];
  }, []);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];

    // Focus the first element if none is focused
    if (firstElement && !containerRef.current.contains(document.activeElement)) {
      firstElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentFocus = document.activeElement as HTMLElement;
      if (!containerRef.current?.contains(currentFocus)) return;

      // Update focusable elements in case DOM changed
      const currentFocusable = getFocusableElements();
      const currentFirst = currentFocusable[0];
      const currentLast = currentFocusable[currentFocusable.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (currentFocus === currentFirst) {
          event.preventDefault();
          currentLast?.focus();
        }
      } else {
        // Tab
        if (currentFocus === currentLast) {
          event.preventDefault();
          currentFirst?.focus();
        }
      }
    };

    // Use capture phase to ensure we handle the event before other handlers
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);

      // Restore previous focus when unmounting
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        // Use setTimeout to avoid conflicts with React's focus management
        setTimeout(() => {
          try {
            previousFocusRef.current?.focus();
          } catch (error) {
            // Focus might fail if element was removed, ignore silently
          }
        }, 0);
      }
    };
  }, [isActive, onEscape, getFocusableElements]);

  return (
    <div
      ref={containerRef}
      className={className}
      // Ensure the container itself is not focusable
      tabIndex={-1}
      // Add ARIA attributes for better accessibility
      role="dialog"
      aria-modal={isActive ? "true" : undefined}
    >
      {children}
    </div>
  );
};

export default FocusTrap;