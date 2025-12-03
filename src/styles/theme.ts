/**
 * Global Theme Configuration
 * Centralized styling for consistent UI across all components
 * 
 * Usage: import { theme } from '../styles/theme';
 */

export const theme = {
  // ============================================
  // COLORS
  // ============================================
  colors: {
    // Brand
    brandGold: '#C9AE66',
    brandGoldLight: '#D4BE7E',
    brandGoldDark: '#B89D55',
    
    // Primary Blues (Steel tones)
    primary: {
      600: '#4A6FA5',
      500: '#5B82B8',
      400: '#7A9DC7',
    },
    
    // Backgrounds
    bg: {
      primary: '#0F172A',      // Deep navy
      secondary: '#1E293B',    // Slate 800
      tertiary: '#334155',     // Slate 700
      card: 'rgba(30, 41, 59, 0.5)',  // Semi-transparent slate
      modal: 'rgba(15, 23, 42, 0.95)', // Modal backdrop
    },
    
    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8',    // Slate 400
      muted: '#64748B',        // Slate 500
      placeholder: '#94A3B8',
      label: '#C4CFD6',
    },
    
    // Borders
    border: {
      default: 'rgba(71, 85, 105, 0.5)',  // Slate 600/50
      light: 'rgba(71, 85, 105, 0.3)',
      focus: 'rgba(91, 130, 184, 0.5)',
    },
    
    // Status Colors
    success: {
      primary: '#10B981',      // Emerald 500
      light: '#34D399',        // Emerald 400
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
    },
    error: {
      primary: '#EF4444',      // Red 500
      light: '#FCA5A5',        // Red 300
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.2)',
    },
    warning: {
      primary: '#F59E0B',      // Amber 500
      light: '#FBBF24',        // Amber 400
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    // Font Family
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
    
    // Font Sizes
    fontSize: {
      xs: '0.625rem',     // 10px
      sm: '0.75rem',      // 12px
      base: '0.875rem',   // 14px
      lg: '1rem',         // 16px
      xl: '1.125rem',     // 18px
      '2xl': '1.25rem',   // 20px
      '3xl': '1.5rem',    // 24px
    },
    
    // Font Weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Line Heights
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625',
    },
  },

  // ============================================
  // SPACING
  // ============================================
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.625rem',   // 10px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },

  // ============================================
  // Z-INDEX
  // ============================================
  zIndex: {
    dropdown: 50,
    modal: 100,
    tooltip: 150,
    toast: 200,
  },
};

// ============================================
// COMPONENT STYLES (Tailwind-compatible classes)
// ============================================
export const componentStyles = {
  // Modal Styles
  modal: {
    overlay: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm',
    container: 'bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden',
    header: 'flex items-center justify-between px-5 py-4 border-b border-slate-700/50',
    title: 'text-lg font-semibold text-white',
    closeButton: 'p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors',
    body: 'p-5',
    footer: 'flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700/50 bg-slate-800/50',
  },

  // Button Styles
  button: {
    base: 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed',
    sizes: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
    },
    variants: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-300 hover:text-white',
      gold: 'bg-[#C9AE66] hover:bg-[#B89D55] text-slate-900 font-semibold focus:ring-[#C9AE66]',
    },
  },

  // Input Styles
  input: {
    base: 'w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-colors',
    error: 'border-red-400/50 bg-red-500/5 focus:border-red-400/50 focus:ring-red-400/20',
    label: 'block text-sm font-medium text-[#C4CFD6] mb-1.5',
  },

  // Card Styles
  card: {
    base: 'bg-slate-800/40 border border-slate-700/60 rounded-xl',
    hover: 'hover:border-slate-600/80 transition-colors',
    padding: {
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    },
  },

  // Badge Styles
  badge: {
    base: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    variants: {
      default: 'bg-slate-700 text-slate-300',
      success: 'bg-emerald-500/20 text-emerald-400',
      warning: 'bg-amber-500/20 text-amber-400',
      error: 'bg-red-500/20 text-red-400',
      info: 'bg-blue-500/20 text-blue-400',
    },
  },

  // Error Message Styles
  errorMessage: {
    container: 'flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2',
    icon: 'w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400',
    text: 'text-red-400',
  },

  // Success Message Styles
  successMessage: {
    container: 'flex items-start gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2',
    icon: 'w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400',
    text: 'text-emerald-400',
  },
};

// ============================================
// CSS CUSTOM PROPERTIES (for index.css)
// ============================================
export const cssVariables = `
:root {
  /* Brand Colors */
  --color-brand-gold: #C9AE66;
  --color-brand-gold-light: #D4BE7E;
  --color-brand-gold-dark: #B89D55;
  
  /* Primary Blues */
  --color-primary-600: #4A6FA5;
  --color-primary-500: #5B82B8;
  --color-primary-400: #7A9DC7;
  
  /* Backgrounds */
  --color-bg-primary: #0F172A;
  --color-bg-secondary: #1E293B;
  --color-bg-tertiary: #334155;
  
  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;
  --color-text-placeholder: #94A3B8;
  --color-text-label: #C4CFD6;
  
  /* Borders */
  --color-border-default: rgba(71, 85, 105, 0.5);
  --color-border-light: rgba(71, 85, 105, 0.3);
  --color-border-focus: rgba(91, 130, 184, 0.5);
  
  /* Status */
  --color-success: #10B981;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
  
  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  
  /* Font Sizes */
  --font-size-xs: 0.625rem;
  --font-size-sm: 0.75rem;
  --font-size-base: 0.875rem;
  --font-size-lg: 1rem;
  --font-size-xl: 1.125rem;
  --font-size-2xl: 1.25rem;
  --font-size-3xl: 1.5rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.25rem;
  --spacing-2xl: 1.5rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.625rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* Z-Index */
  --z-dropdown: 50;
  --z-modal: 100;
  --z-tooltip: 150;
  --z-toast: 200;
}
`;

export default theme;

