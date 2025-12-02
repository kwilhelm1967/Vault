import React, { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // milliseconds
}

/**
 * Undo Toast Component
 * Shows a toast with an undo button for reversible actions.
 * Auto-dismisses after duration (default 5 seconds).
 */
export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = 50; // Update every 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-slate-200 flex-1">{message}</span>
        <button
          onClick={() => {
            onUndo();
            onDismiss();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-slate-700">
        <div
          className="h-full bg-blue-500 transition-all ease-linear"
          style={{ width: `${progress}%`, transitionDuration: "50ms" }}
        />
      </div>
    </div>
  );
};

