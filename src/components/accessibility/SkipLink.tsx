/**
 * Skip Link Component
 *
 * Provides keyboard navigation shortcuts to skip to main content,
 * navigation, or other important sections. Improves accessibility
 * for keyboard users.
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${className}`}
    >
      <ChevronRight className="w-4 h-4" />
      {children}
    </a>
  );
};

// Pre-configured skip links for common sections
export const SkipToMain: React.FC = () => (
  <SkipLink href="#main-content">Skip to main content</SkipLink>
);

export const SkipToNavigation: React.FC = () => (
  <SkipLink href="#navigation">Skip to navigation</SkipLink>
);

export const SkipToSearch: React.FC = () => (
  <SkipLink href="#search">Skip to search</SkipLink>
);

export default SkipLink;