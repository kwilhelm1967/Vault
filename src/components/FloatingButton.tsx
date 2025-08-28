import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lock } from "lucide-react";

export const FloatingButton: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();
  const isDragHandle = useRef(false);
  const DRAG_THRESHOLD = 5; // pixels
  const lastClickTsRef = useRef(0);
  const CLICK_THROTTLE_MS = 250;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left click

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
    e.stopPropagation();
  };

  const handleMenuClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore while dragging or processing
    if (isProcessing || isDragging) {
      return;
    }

    // Simple throttle to avoid rapid re-triggers
    const now = Date.now();
    if (now - lastClickTsRef.current < CLICK_THROTTLE_MS) {
      return;
    }
    lastClickTsRef.current = now;

    setIsProcessing(true);

    try {
      // Check if vault is already unlocked
      const isUnlocked = window.electronAPI?.isVaultUnlocked
        ? await window.electronAPI.isVaultUnlocked()
        : false;

      if (isUnlocked && window.electronAPI?.toggleFloatingPanelFromButton) {
        await window.electronAPI.toggleFloatingPanelFromButton();
      } else if (!isUnlocked && window.electronAPI?.showMainWindow) {
        // If vault is locked, show main window to unlock
        window.electronAPI.showMainWindow();
      }
    } catch (error) {
      console.error("Failed to toggle floating panel:", error);
    } finally {
      setTimeout(() => setIsProcessing(false), 120);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStartPos.current.clientX || !isDragHandle.current) return;

      // Check if mouse has moved beyond threshold to start dragging
      const dx = Math.abs(e.clientX - dragStartPos.current.clientX);
      const dy = Math.abs(e.clientY - dragStartPos.current.clientY);

      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        setIsDragging(true);
      }

      if (!isDragging) return;

      const buttonSize = 48; // Updated smaller button size
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
        const buttonSize = 48; // Updated smaller button size
        const snapThreshold = 100; // Distance from edge to snap

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

        // Snap to edges
        const distanceToLeft = newX;
        const distanceToRight = window.screen.availWidth - newX - buttonSize;
        const distanceToTop = newY;
        const distanceToBottom = window.screen.availHeight - buttonSize - newY;

        // Snap to the nearest edge if within threshold
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

      // Reset drag start position
      dragStartPos.current = { x: 0, y: 0, clientX: 0, clientY: 0 };
    },
    [isDragging]
  );

  // Global mouse event listeners for dragging
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
      className="fixed z-[9999] bg-transparent w-full h-full flex items-center justify-center"
    >
      <div className={`w-12 h-12 rounded-full flex overflow-hidden`}>
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          onMouseDown={handleDragMouseDown}
          className={`w-4 h-full flex items-center justify-center cursor-grab active:cursor-grabbing
            ${isDragging ? "cursor-grabbing" : "cursor-grab"}
            hover:bg-black/10 transition-colors duration-200`}
          title="Drag to move"
        >
          <div className="text-white/80 text-xs leading-none select-none pointer-events-none">
            ⋮⋮
          </div>
        </div>

        {/* Menu Toggle */}
        <div
          onClick={handleMenuClick}
          className={`flex-1 h-full flex items-center justify-center cursor-pointer
            hover:bg-black/10 transition-colors duration-200
            ${isProcessing ? "cursor-wait" : "cursor-pointer"}`}
          title={isProcessing ? "Processing..." : "Toggle Password Vault"}
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Lock className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      {isDragging && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2
          bg-black/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold
          whitespace-nowrap backdrop-blur-md border border-white/20 z-[10001]
          shadow-lg"
        >
          Release to snap to edge
        </div>
      )}
    </div>
  );
};
