import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LiveRegionProvider } from './components/accessibility';
import { devLog, devError } from './utils/devLog';
import './i18n'; // Initialize i18n for localization
import './index.css';

// NO SENTRY - 100% offline after activation. No data collection from user's app.

// Global unhandled promise rejection handler
// Prevents unhandled promise rejections from crashing the app
window.addEventListener('unhandledrejection', (event) => {
  devError('Unhandled promise rejection:', event.reason);
  // Prevent default browser error handling for unhandled rejections
  // This allows the app to continue running instead of crashing
  event.preventDefault();
});

// Ensure dark background is set immediately
document.documentElement.style.backgroundColor = '#1F2534';
document.body.style.backgroundColor = '#1F2534';

// DEV ONLY: Reset handling - does NOT auto-setup trial anymore
if (import.meta.env.DEV) {
  // Check if we need to reset (add ?reset to URL to force reset)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reset')) {
    localStorage.clear();
    sessionStorage.clear();
    devLog('🗑️ DEV: All data cleared! Redirecting to fresh state...');
    window.location.href = '/';
  }
  
  // NO auto-trial setup - let the app show the license screen for new users
  devLog('🔧 DEV: Running in development mode');
}

const rootElement = document.getElementById('root')!;

// Remove loading spinner and show app
const showApp = () => {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.remove();
  }
  rootElement.classList.add('loaded');
  document.body.style.overflow = 'visible';
};

// Create root and render app
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <LiveRegionProvider>
        <App />
      </LiveRegionProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Show app after a brief delay to ensure everything is rendered
setTimeout(showApp, 100);
