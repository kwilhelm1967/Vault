/**
 * Notification Component & Hook
 * 
 * Replaces browser alert() with styled toast notifications.
 */

import React, { useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationState {
  type: NotificationType;
  message: string;
  duration?: number; // ms, default 4000
}

interface NotificationProps {
  notification: NotificationState | null;
  onDismiss: () => void;
}

const colors = {
  success: {
    bg: "rgba(34, 197, 94, 0.15)",
    border: "rgba(34, 197, 94, 0.4)",
    text: "#22c55e",
    icon: CheckCircle,
  },
  error: {
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
    text: "#ef4444",
    icon: XCircle,
  },
  warning: {
    bg: "rgba(217, 119, 6, 0.15)",
    border: "rgba(217, 119, 6, 0.4)",
    text: "#D97706",
    icon: AlertTriangle,
  },
  info: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.4)",
    text: "#3b82f6",
    icon: Info,
  },
};

export const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setIsLeaving(false);

      const duration = notification.duration ?? 4000;
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification || !isVisible) return null;

  const config = colors[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-sm transition-all duration-300 ${
        isLeaving ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: "12px",
        backdropFilter: "blur(8px)",
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: config.text }}
          strokeWidth={1.5}
        />
        <p className="flex-1 text-sm text-slate-200">{notification.message}</p>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(onDismiss, 300);
          }}
          className="p-1 text-slate-400 hover:text-white transition-colors rounded"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook for managing notifications
 */
export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((config: NotificationState) => {
    setNotification(config);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Convenience methods
  const notify = {
    success: (message: string, duration?: number) =>
      showNotification({ type: "success", message, duration }),
    error: (message: string, duration?: number) =>
      showNotification({ type: "error", message, duration }),
    warning: (message: string, duration?: number) =>
      showNotification({ type: "warning", message, duration }),
    info: (message: string, duration?: number) =>
      showNotification({ type: "info", message, duration }),
  };

  return {
    notification,
    showNotification,
    dismissNotification,
    notify,
  };
};

export default Notification;

