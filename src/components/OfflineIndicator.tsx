import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Offline Indicator Component
 * Shows a banner when the user loses internet connection.
 * Automatically hides when connection is restored.
 */
export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Briefly show "Back online" message
      setTimeout(() => setShowBanner(false), 2000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner && !isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
        isOffline
          ? "bg-amber-500/90 text-amber-950"
          : "bg-green-500/90 text-green-950"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline — data is saved locally</span>
        </>
      ) : (
        <span>✓ Back online</span>
      )}
    </div>
  );
};

