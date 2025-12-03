import React, { useState, useEffect, useCallback } from "react";

interface MiniVaultButtonProps {
  onClick: () => void;
}

export const MiniVaultButton: React.FC<MiniVaultButtonProps> = ({ onClick }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mini_vault_button_position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate position is within screen bounds
        const validX = Math.max(0, Math.min(window.innerWidth - 48, parsed.x));
        const validY = Math.max(0, Math.min(window.innerHeight - 48, parsed.y));
        setPosition({ x: validX, y: validY });
      } catch {
        // Default position: bottom-right
        setPosition({ x: window.innerWidth - 72, y: window.innerHeight - 140 });
      }
    } else {
      // Default position: bottom-right
      setPosition({ x: window.innerWidth - 72, y: window.innerHeight - 140 });
    }
  }, []);

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("mini_vault_button_position", JSON.stringify(position));
    }
  }, [position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(0, Math.min(window.innerWidth - 48, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight - 48, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.y));
      
      // Check if actually moved
      if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
        setHasMoved(true);
      }
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, position]);

  const handleClick = useCallback(() => {
    // Only trigger click if we didn't drag
    if (!hasMoved) {
      onClick();
    }
  }, [hasMoved, onClick]);

  return (
    <button
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`fixed z-50 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-shadow ${
        isDragging ? "cursor-grabbing scale-110" : "cursor-grab hover:scale-105"
      }`}
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging ? "none" : "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      title="Open Mini Vault (drag to move)"
      aria-label="Open Mini Vault"
    >
      <svg
        className="w-6 h-6 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
      </svg>
    </button>
  );
};




