/**
 * Performance Tracking Hook
 * 
 * Tracks component render performance in development mode.
 * Can be used with React.Profiler for detailed render analysis.
 */

import { useEffect, useRef, useCallback } from 'react';
import { trackRender, measureOperation, logMetrics, getMetricsSummary } from '../utils/performanceMonitor';
import { devWarn } from '../utils/devLog';

const isDev = import.meta.env.DEV;

/**
 * Track render performance of a component
 */
export function useRenderTracking(componentName: string): void {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (!isDev) return;
    
    const renderTime = performance.now() - lastRenderTime.current;
    renderCount.current += 1;
    const isMount = isFirstRender.current;
    trackRender(componentName, renderTime, isMount);
    isFirstRender.current = false;
    lastRenderTime.current = performance.now();
  });
}

/**
 * Create a measured async callback
 */
export function useMeasuredCallback<T extends unknown[], R>(
  operationName: string,
  callback: (...args: T) => Promise<R>,
  deps: React.DependencyList
): (...args: T) => Promise<R> {
  return useCallback(
    (...args: T) => measureOperation(operationName, () => callback(...args)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Log performance metrics
 */
export function useLogMetrics(intervalMs: number = 60000): void {
  useEffect(() => {
    if (!isDev) return;
    
    const interval = setInterval(logMetrics, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}

/**
 * Get performance summary
 */
export function usePerformanceSummary(): {
  totalRenders: number;
  totalOperations: number;
  avgRenderTime: number;
  avgOperationTime: number;
  memoryMB: number | null;
} | null {
  if (!isDev) return null;
  return getMetricsSummary();
}

/**
 * React Profiler onRender callback
 * Use with <Profiler id="ComponentName" onRender={onRenderCallback}>
 */
export const onRenderCallback = (
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void => {
  if (!isDev) return;
  
  const isMount = phase === "mount";
  trackRender(`${id} (${phase})`, actualDuration, isMount);
  
  // Additional detailed logging for expensive renders
  if (baseDuration > 16) {
    devWarn(
      `⚠️ Expensive component: ${id}`,
      `\n  Phase: ${phase}`,
      `\n  Actual: ${actualDuration.toFixed(2)}ms`,
      `\n  Base: ${baseDuration.toFixed(2)}ms`,
      `\n  Commit: ${(commitTime - startTime).toFixed(2)}ms`
    );
  }
};

