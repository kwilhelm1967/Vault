import { useEffect } from "react";

/**
 * Custom hook for dark theme enforcement
 * 
 * Applies dark theme styles using CSS custom properties for better performance.
 * Only runs once on mount to avoid unnecessary re-renders.
 * 
 * @example
 * ```typescript
 * function App() {
 *   useDarkTheme();
 *   // ... rest of component
 * }
 * ```
 */
export const useDarkTheme = () => {
  useEffect(() => {
    // Apply dark theme using CSS custom properties for better performance
    const root = document.documentElement;
    const body = document.body;

    // Set CSS custom properties for consistent theming
    root.style.setProperty('--bg-primary', '#0f172a');
    root.style.setProperty('--bg-secondary', '#1e293b');
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', '#94a3b8');

    // Set basic dark theme colors
    root.style.backgroundColor = "var(--bg-primary)";
    root.style.color = "var(--text-primary)";
    body.style.backgroundColor = "var(--bg-primary)";
    body.style.color = "var(--text-primary)";

    // Add dark theme class for CSS-based theming
    root.classList.add('dark-theme');

    // Only run once on mount, not on every render
  }, []); // Empty dependency array - runs only once
};











