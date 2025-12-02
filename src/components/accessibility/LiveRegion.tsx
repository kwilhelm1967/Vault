/**
 * LiveRegion Component
 * 
 * ARIA live region for screen reader announcements.
 * Announces dynamic content changes to assistive technologies.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

interface LiveRegionContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null);

export const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error("useLiveRegion must be used within LiveRegionProvider");
  }
  return context;
};

interface LiveRegionProviderProps {
  children: React.ReactNode;
}

export const LiveRegionProvider: React.FC<LiveRegionProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      // Small delay to ensure screen readers pick up the change
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage("");
      setTimeout(() => setPoliteMessage(message), 50);
    }

    // Clear after announcement
    setTimeout(() => {
      if (priority === "assertive") {
        setAssertiveMessage("");
      } else {
        setPoliteMessage("");
      }
    }, 3000);
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite announcements (non-interrupting) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements (interrupting) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
};

/**
 * Custom hook for common announcements
 */
export const useAnnouncements = () => {
  const { announce } = useLiveRegion();

  return {
    announceCopied: (what: string = "Content") => {
      announce(`${what} copied to clipboard`);
    },
    announceDeleted: (what: string) => {
      announce(`${what} deleted`);
    },
    announceAdded: (what: string) => {
      announce(`${what} added successfully`);
    },
    announceUpdated: (what: string) => {
      announce(`${what} updated successfully`);
    },
    announceError: (message: string) => {
      announce(message, "assertive");
    },
    announceNavigation: (section: string) => {
      announce(`Navigated to ${section}`);
    },
    announceModalOpened: (title: string) => {
      announce(`${title} dialog opened`);
    },
    announceModalClosed: () => {
      announce("Dialog closed");
    },
    announceUndo: (what: string) => {
      announce(`${what} restored`);
    },
  };
};

