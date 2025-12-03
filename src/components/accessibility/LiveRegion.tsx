/**
 * Live Region Provider for Screen Reader Announcements
 *
 * Provides a context for announcing dynamic content changes to screen readers.
 * Useful for form validation errors, status updates, and notifications.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LiveRegionContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | undefined>(undefined);

export const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
};

interface LiveRegionProviderProps {
  children: ReactNode;
}

export const LiveRegionProvider: React.FC<LiveRegionProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const [messageId, setMessageId] = useState(0);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = messageId + 1;
    setMessageId(id);

    if (priority === 'assertive') {
      setAssertiveMessage(`${message} (${id})`);
      // Clear after screen reader has time to announce
      setTimeout(() => setAssertiveMessage(''), 1000);
    } else {
      setPoliteMessage(`${message} (${id})`);
      // Clear after screen reader has time to announce
      setTimeout(() => setPoliteMessage(''), 1000);
    }
  };

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {/* Hidden live regions for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {assertiveMessage}
      </div>
      {children}
    </LiveRegionContext.Provider>
  );
};

export default LiveRegionProvider;