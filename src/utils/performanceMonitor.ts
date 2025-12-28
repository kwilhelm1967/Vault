/**
 * Performance Monitoring Utility
 * 
 * Provides lightweight performance tracking for the application.
 * Only active in development mode.
 */

import { devLog, devWarn, devError } from "./devLog";
import { 
  checkRenderBudget, 
  checkOperationBudget, 
  checkMemoryBudget,
  getPerformanceBudgets 
} from "../config/performanceBudgets";

const isDev = import.meta.env.DEV;

// Performance metrics storage
interface PerformanceMetrics {
  componentRenders: Map<string, { count: number; totalTime: number; lastTime: number }>;
  operations: Map<string, { count: number; totalTime: number; avgTime: number }>;
  memorySnapshots: Array<{ timestamp: number; usedJSHeapSize: number }>;
}

const metrics: PerformanceMetrics = {
  componentRenders: new Map(),
  operations: new Map(),
  memorySnapshots: [],
};

/**
 * Track component render performance with budget checking
 */
export function trackRender(
  componentName: string, 
  renderTime: number, 
  isMount: boolean = false
): void {
  if (!isDev) return;
  
  const existing = metrics.componentRenders.get(componentName) || { count: 0, totalTime: 0, lastTime: 0 };
  metrics.componentRenders.set(componentName, {
    count: existing.count + 1,
    totalTime: existing.totalTime + renderTime,
    lastTime: renderTime,
  });
  
  // Check against performance budgets
  const budgetCheck = checkRenderBudget(renderTime, isMount);
  
  if (budgetCheck.exceeds) {
    devError(
      `❌ Budget exceeded: ${componentName} took ${renderTime.toFixed(2)}ms ` +
      `(budget: ${budgetCheck.budget}ms, threshold: ${budgetCheck.warningThreshold}ms)`
    );
  } else if (budgetCheck.warning) {
    devWarn(
      `⚠️ Budget warning: ${componentName} took ${renderTime.toFixed(2)}ms ` +
      `(threshold: ${budgetCheck.warningThreshold}ms)`
    );
  }
}

/**
 * Measure async operation performance
 */
export async function measureOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - start;
    
    if (isDev) {
      const existing = metrics.operations.get(operationName) || { count: 0, totalTime: 0, avgTime: 0 };
      const newCount = existing.count + 1;
      const newTotal = existing.totalTime + duration;
      metrics.operations.set(operationName, {
        count: newCount,
        totalTime: newTotal,
        avgTime: newTotal / newCount,
      });
      
      // Check against performance budgets
      const budgetCheck = checkOperationBudget(duration, true);
      
      if (budgetCheck.exceeds) {
        devError(
          `❌ Budget exceeded: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(budget: ${budgetCheck.budget}ms, threshold: ${budgetCheck.warningThreshold}ms)`
        );
      } else if (budgetCheck.warning) {
        devWarn(
          `⚠️ Budget warning: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(threshold: ${budgetCheck.warningThreshold}ms)`
        );
      }
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    devWarn(`❌ Failed operation: ${operationName} after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Measure sync operation performance
 */
export function measureSync<T>(operationName: string, operation: () => T): T {
  const start = performance.now();
  
  try {
    const result = operation();
    const duration = performance.now() - start;
    
    if (isDev) {
      const existing = metrics.operations.get(operationName) || { count: 0, totalTime: 0, avgTime: 0 };
      const newCount = existing.count + 1;
      const newTotal = existing.totalTime + duration;
      metrics.operations.set(operationName, {
        count: newCount,
        totalTime: newTotal,
        avgTime: newTotal / newCount,
      });
      
      // Check against performance budgets
      const budgetCheck = checkOperationBudget(duration, false);
      
      if (budgetCheck.exceeds) {
        devError(
          `❌ Budget exceeded: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(budget: ${budgetCheck.budget}ms, threshold: ${budgetCheck.warningThreshold}ms)`
        );
      } else if (budgetCheck.warning) {
        devWarn(
          `⚠️ Budget warning: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(threshold: ${budgetCheck.warningThreshold}ms)`
        );
      }
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    devWarn(`❌ Failed sync operation: ${operationName} after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Take a memory snapshot
 */
export function snapshotMemory(): void {
  if (!isDev) return;
  
  // Check if memory API is available
  const performance = window.performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  
  if (performance.memory) {
    const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    metrics.memorySnapshots.push({
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
    });
    
    // Check against performance budgets
    const budgetCheck = checkMemoryBudget(memoryMB);
    
    if (budgetCheck.exceeds) {
      devError(
        `❌ Memory budget exceeded: ${memoryMB.toFixed(2)}MB ` +
        `(budget: ${budgetCheck.budget}MB, threshold: ${budgetCheck.warningThreshold}MB)`
      );
    } else if (budgetCheck.warning) {
      devWarn(
        `⚠️ Memory budget warning: ${memoryMB.toFixed(2)}MB ` +
        `(threshold: ${budgetCheck.warningThreshold}MB)`
      );
    }
    
    // Check for memory leaks (rapid growth)
    if (metrics.memorySnapshots.length >= 2) {
      const budgets = getPerformanceBudgets();
      const recent = metrics.memorySnapshots.slice(-2);
      const growthMB = (recent[1].usedJSHeapSize - recent[0].usedJSHeapSize) / 1024 / 1024;
      const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 1000 / 60; // minutes
      
      if (timeDiff > 0) {
        const growthPerMinute = growthMB / timeDiff;
        if (growthPerMinute > budgets.memory.maxMemoryGrowthMB) {
          devWarn(
            `⚠️ Potential memory leak: ${growthPerMinute.toFixed(2)}MB/min growth ` +
            `(threshold: ${budgets.memory.maxMemoryGrowthMB}MB/min)`
          );
        }
      }
    }
    
    // Keep only last 100 snapshots
    if (metrics.memorySnapshots.length > 100) {
      metrics.memorySnapshots.shift();
    }
  }
}

/**
 * Log current performance metrics
 */
export function logMetrics(): void {
  if (!isDev) return;
  
  devLog("📊 Performance Metrics:");
  
  // Component renders
  devLog("  Component Renders:");
  metrics.componentRenders.forEach((data, name) => {
    const avgTime = data.totalTime / data.count;
    devLog(`    ${name}: ${data.count} renders, avg ${avgTime.toFixed(2)}ms`);
  });
  
  // Operations
  devLog("  Operations:");
  metrics.operations.forEach((data, name) => {
    devLog(`    ${name}: ${data.count} calls, avg ${data.avgTime.toFixed(2)}ms`);
  });
  
  // Memory (if available)
  if (metrics.memorySnapshots.length > 0) {
    const latest = metrics.memorySnapshots[metrics.memorySnapshots.length - 1];
    const mb = (latest.usedJSHeapSize / 1024 / 1024).toFixed(2);
    devLog(`  Memory: ${mb} MB`);
  }
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.componentRenders.clear();
  metrics.operations.clear();
  metrics.memorySnapshots.length = 0;
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(): {
  totalRenders: number;
  totalOperations: number;
  avgRenderTime: number;
  avgOperationTime: number;
  memoryMB: number | null;
} {
  let totalRenders = 0;
  let totalRenderTime = 0;
  metrics.componentRenders.forEach((data) => {
    totalRenders += data.count;
    totalRenderTime += data.totalTime;
  });
  
  let totalOps = 0;
  let totalOpTime = 0;
  metrics.operations.forEach((data) => {
    totalOps += data.count;
    totalOpTime += data.totalTime;
  });
  
  const performance = window.performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  
  return {
    totalRenders,
    totalOperations: totalOps,
    avgRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
    avgOperationTime: totalOps > 0 ? totalOpTime / totalOps : 0,
    memoryMB: performance.memory 
      ? performance.memory.usedJSHeapSize / 1024 / 1024 
      : null,
  };
}

// Auto-snapshot memory every 30 seconds in dev mode
if (isDev) {
  setInterval(snapshotMemory, 30000);
}

// Log metrics on unload in dev mode
if (isDev && typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logMetrics();
  });
}










