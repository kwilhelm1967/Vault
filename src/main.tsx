import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure dark background is set immediately
document.documentElement.style.backgroundColor = '#0f172a';
document.body.style.backgroundColor = '#0f172a';

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
    <App />
  </StrictMode>
);

// Show app after a brief delay to ensure everything is rendered
setTimeout(showApp, 100);
