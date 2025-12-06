import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LiveRegionProvider } from './components/accessibility';
import './i18n'; // Initialize i18n for localization
import './index.css';

// Ensure dark background is set immediately
document.documentElement.style.backgroundColor = '#1F2534';
document.body.style.backgroundColor = '#1F2534';

// DEV ONLY: Auto-setup trial mode for testing
if (import.meta.env.DEV) {
  // Check if we need to reset (add ?reset to URL to force reset)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('reset')) {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🗑️ DEV: All data cleared! Redirecting...');
    window.location.href = '/';
  }
  
  // Setup fresh 7-day trial
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Create JWT-like token that TrialService expects
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    isTrial: true,
    planType: 'trial',
    trialExpiryDate: expiryDate.toISOString(),
    trialDurationDisplay: '7 days',
    activationTime: now.toISOString(),
    licenseKey: 'TRIAL-DEV-7DAY-0001'
  }));
  const signature = 'dev_signature';
  
  localStorage.setItem('trial_start_date', now.toISOString());
  localStorage.setItem('trial_used', 'true');
  localStorage.setItem('trial_license_key', 'TRIAL-DEV-7DAY-0001');
  localStorage.setItem('license_token', `${header}.${payload}.${signature}`);
  localStorage.setItem('trial_expiry_time', expiryDate.toISOString());
  
  console.log('🎁 DEV: Trial mode active! Expires:', expiryDate.toLocaleString());
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
