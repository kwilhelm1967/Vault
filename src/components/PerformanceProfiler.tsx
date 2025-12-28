/**
 * Performance Profiler Component
 * 
 * Wraps components with React.Profiler for performance tracking.
 * Only active in development mode.
 */

import React, { Profiler, ReactNode } from 'react';
import { onRenderCallback } from '../hooks/usePerformance';

const isDev = import.meta.env.DEV;

interface PerformanceProfilerProps {
  id: string;
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Performance Profiler wrapper component
 * 
 * Automatically tracks render performance when enabled.
 * Only active in development mode.
 * 
 * @example
 * ```tsx
 * <PerformanceProfiler id="MainVault">
 *   <MainVault {...props} />
 * </PerformanceProfiler>
 * ```
 */
export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  enabled = true,
}) => {
  if (!isDev || !enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};

