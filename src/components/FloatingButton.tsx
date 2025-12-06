import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock } from "lucide-react";
import { devError } from "../utils/devLog";

export const FloatingButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();
  const isDragHandle = useRef(false);
  const DRAG_THRESHOLD = 5;
  const lastClickTsRef = useRef(0);
  const CLICK_THROTTLE_MS = 250;

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    isDragHandle.current = true;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        clientX: e.clientX,
        clientY: e.clientY,
      };
    }

    e.preventDefault();
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing || isDragging) return;

    const now = Date.now();
    if (now - lastClickTsRef.current < CLICK_THROTTLE_MS) return;
    lastClickTsRef.current = now;

    setIsProcessing(true);

    try {
      const isUnlocked = window.electronAPI?.isVaultUnlocked
        ? await window.electronAPI.isVaultUnlocked()
        : false;

      if (isUnlocked && window.electronAPI) {
        const isFloatingPanelOpen = window.electronAPI.isFloatingPanelOpen
          ? await window.electronAPI.isFloatingPanelOpen()
          : false;

        if (isFloatingPanelOpen) {
          window.electronAPI.restoreMainWindow();
          window.electronAPI.hideFloatingPanel();
        } else {
          window.electronAPI.showFloatingPanel();
          void (window.electronAPI.hideMainWindow?.() ?? window.electronAPI.minimizeMainWindow?.());
        }
      } else if (!isUnlocked && window.electronAPI?.showMainWindow) {
        window.electronAPI.showMainWindow();
      }
    } catch (error) {
      devError("Failed to toggle floating panel:", error);
    } finally {
      setTimeout(() => setIsProcessing(false), 120);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStartPos.current.clientX || !isDragHandle.current) return;

      const dx = Math.abs(e.clientX - dragStartPos.current.clientX);
      const dy = Math.abs(e.clientY - dragStartPos.current.clientY);

      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        setIsDragging(true);
      }

      if (!isDragging) return;

      const buttonSize = 48;
      const newX = Math.max(
        0,
        Math.min(
          window.screen.availWidth - buttonSize,
          e.screenX - dragStartPos.current.x
        )
      );
      const newY = Math.max(
        0,
        Math.min(
          window.screen.availHeight - buttonSize,
          e.screenY - dragStartPos.current.y
        )
      );

      if (window.electronAPI?.moveFloatingButton) {
        window.electronAPI.moveFloatingButton(newX, newY);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (!isDragHandle.current) return;

      isDragHandle.current = false;

      if (isDragging) {
        const buttonSize = 48;
        const snapThreshold = 100;

        let newX = Math.max(
          0,
          Math.min(
            window.screen.availWidth - buttonSize,
            e.screenX - dragStartPos.current.x
          )
        );
        let newY = Math.max(
          0,
          Math.min(
            window.screen.availHeight - buttonSize,
            e.screenY - dragStartPos.current.y
          )
        );

        const distanceToLeft = newX;
        const distanceToRight = window.screen.availWidth - newX - buttonSize;
        const distanceToTop = newY;
        const distanceToBottom = window.screen.availHeight - buttonSize - newY;

        if (distanceToLeft < snapThreshold || distanceToRight < snapThreshold) {
          newX =
            distanceToLeft < distanceToRight
              ? 10
              : window.screen.availWidth - buttonSize - 10;
        }

        if (distanceToTop < snapThreshold || distanceToBottom < snapThreshold) {
          newY =
            distanceToTop < distanceToBottom
              ? 10
              : window.screen.availHeight - buttonSize - 10;
        }

        if (window.electronAPI?.saveFloatingButtonPosition) {
          await window.electronAPI.saveFloatingButtonPosition(newX, newY);
        }
      }

      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }

      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(false);
      }, 100);

      dragStartPos.current = { x: 0, y: 0, clientX: 0, clientY: 0 };
    },
    [isDragging]
  );

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragHandle.current) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragHandle.current) {
        handleMouseUp(e);
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);

    if (isDragging) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={buttonRef}
      className="fixed z-[9999] flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        // Window is 80x80px, button is 48x48px - center it with padding for hover effects
        width: '80px',
        height: '80px',
        top: 0,
        left: 0,
      }}
    >
      {/* Simple gradient blue circle with lock - BRIGHT BLUE */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          boxShadow: isHovered
            ? '0 8px 28px rgba(59, 130, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
            : '0 4px 16px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          transform: isHovered && !isDragging ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
        }}
        title={isProcessing ? "Processing..." : "Toggle Local Password Vault"}
      >
        {isProcessing ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <Lock 
            className="w-5 h-5 text-white" 
            strokeWidth={2}
          />
        )}
      </div>
    </div>
  );
};
