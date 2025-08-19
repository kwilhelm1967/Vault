import React, { useState, useEffect, useRef } from "react";
import { Lock, EyeOff } from "lucide-react";

export const FloatingButton: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout>();
  const clickTimeoutRef = useRef<NodeJS.Timeout>();
  const lastClickTime = useRef<number>(0);

  // Check if floating panel is open on component mount and when panel might change
  const checkPanelStatus = async () => {
    if (window.electronAPI && window.electronAPI.isFloatingPanelOpen) {
      try {
        const isOpen = await window.electronAPI.isFloatingPanelOpen();
        setIsPanelOpen(isOpen);
      } catch (error) {
        console.error('Failed to check panel status:', error);
      }
    }
  };

  useEffect(() => {
    checkPanelStatus();

    // Set up interval to check panel status periodically, but less frequently
    const interval = setInterval(checkPanelStatus, 2000);

    // Cleanup function
    return () => {
      clearInterval(interval);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only handle left click

    setIsDragging(true);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const buttonSize = 60;
    const newX = Math.max(0, Math.min(window.screen.availWidth - buttonSize, e.screenX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.screen.availHeight - buttonSize, e.screenY - dragOffset.y));

    // Move the window using Electron API for real-time movement
    if (window.electronAPI && window.electronAPI.moveFloatingButton) {
      window.electronAPI.moveFloatingButton(newX, newY);
    }
  };

  const handleMouseUp = async (e: MouseEvent) => {
    if (!isDragging) return;

    const buttonSize = 60;
    const snapThreshold = 100; // Distance from edge to snap
    
    let newX = Math.max(0, Math.min(window.screen.availWidth - buttonSize, e.screenX - dragOffset.x));
    let newY = Math.max(0, Math.min(window.screen.availHeight - buttonSize, e.screenY - dragOffset.y));

    // Snap to edges
    const distanceToLeft = newX;
    const distanceToRight = window.screen.availWidth - newX - buttonSize;
    const distanceToTop = newY;
    const distanceToBottom = window.screen.availHeight - newY - buttonSize;

    // Snap to the nearest edge if within threshold
    if (distanceToLeft < snapThreshold || distanceToRight < snapThreshold) {
      if (distanceToLeft < distanceToRight) {
        newX = 10; // Snap to left edge
      } else {
        newX = window.screen.availWidth - buttonSize - 10; // Snap to right edge
      }
    }

    if (distanceToTop < snapThreshold || distanceToBottom < snapThreshold) {
      if (distanceToTop < distanceToBottom) {
        newY = 10; // Snap to top edge
      } else {
        newY = window.screen.availHeight - buttonSize - 10; // Snap to bottom edge
      }
    }

    // Save the snapped position
    if (window.electronAPI && window.electronAPI.saveFloatingButtonPosition) {
      await window.electronAPI.saveFloatingButtonPosition(newX, newY);
    }

    // Clear any existing timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    // Set a short delay before allowing clicks again
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
    }, 150);
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    // Prevent click if we just finished dragging or are already processing
    if (isDragging || isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Prevent double-clicking
    const now = Date.now();
    if (now - lastClickTime.current < 500) { // 500ms debounce
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    lastClickTime.current = now;

    // Prevent event bubbling
    e.preventDefault();
    e.stopPropagation();

    setIsProcessing(true);

    try {
      if (window.electronAPI && window.electronAPI.toggleFloatingPanelFromButton) {
        console.log('Toggling floating panel, current state:', isPanelOpen);
        const panelOpened = await window.electronAPI.toggleFloatingPanelFromButton();
        console.log('Panel toggle result:', panelOpened);
        
        // Update state immediately
        setIsPanelOpen(panelOpened);
        
        // Also check status after a short delay to ensure consistency
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
          checkPanelStatus();
        }, 300);
      }
    } catch (error) {
      console.error('Failed to toggle floating panel:', error);
    } finally {
      // Reset processing state after a short delay
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }
  };

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      document.body.style.cursor = 'grabbing';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div 
      ref={buttonRef}
      className="floating-button-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onMouseDown={handleMouseDown}
        onClick={handleButtonClick}
        disabled={isProcessing}
        className={`floating-button-main ${isPanelOpen ? 'panel-open' : 'panel-closed'} ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        title={isProcessing ? "Processing..." : isPanelOpen ? "Hide Password Vault" : "Show Password Vault"}
        style={{
          width: isHovered && !isDragging ? '60px' : '50px',
          height: isHovered && !isDragging ? '60px' : '50px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: isProcessing ? '#9333ea' : isPanelOpen ? '#ef4444' : '#3b82f6',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isProcessing ? 'wait' : isDragging ? 'grabbing' : 'grab',
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDragging 
            ? '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 0 4px rgba(59, 130, 246, 0.5)' 
            : isHovered
            ? '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 0 4px rgba(59, 130, 246, 0.3)' 
            : '0 8px 25px rgba(0, 0, 0, 0.5)',
          fontSize: '20px',
          outline: 'none',
          transform: isProcessing 
            ? 'scale(0.95)' 
            : isDragging 
            ? 'scale(1.1)' 
            : isHovered ? 'scale(1.2)' : isPanelOpen ? 'scale(1.05)' : 'scale(1)',
          backdropFilter: 'blur(10px)',
          opacity: isProcessing ? 0.8 : isDragging ? 0.9 : 1,
          zIndex: 10000,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isDragging ? 'none' : 'transform 0.3s ease',
            transform: isHovered && !isDragging ? 'scale(1.1)' : 'scale(1)',
            pointerEvents: 'none', // Prevent interference with drag events
          }}
        >
          {isPanelOpen ? (
            <EyeOff size={isHovered && !isDragging ? 28 : 24} />
          ) : (
            <Lock size={isHovered && !isDragging ? 28 : 24} />
          )}
        </div>
      </button>

      {/* Floating text hint when hovered and not dragging */}
      {isHovered && !isDragging && (
        <div
          className="floating-hint"
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 10001,
            animation: 'fadeIn 0.2s ease-out',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          }}
        >
          {isDragging ? 'Drag to move' : isProcessing ? 'Processing...' : isPanelOpen ? 'Hide Vault' : 'Open Vault'}
        </div>
      )}

      {/* Drag hint when dragging */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '15px',
            fontSize: '10px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 10001,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
          }}
        >
          Release to snap to edge
        </div>
      )}
    </div>
  );
};
