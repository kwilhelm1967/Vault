/**
 * Performance Budgets Configuration
 * 
 * Defines performance thresholds for the application.
 * These budgets help ensure the app maintains good performance characteristics.
 */

export interface PerformanceBudgets {
  // Render performance budgets (in milliseconds)
  render: {
    /** Maximum time for a component to render (16ms = 60fps) */
    maxRenderTime: number;
    /** Warning threshold for render time */
    warningRenderTime: number;
    /** Maximum time for initial mount */
    maxMountTime: number;
    /** Warning threshold for mount time */
    warningMountTime: number;
  };
  
  // Operation performance budgets (in milliseconds)
  operations: {
    /** Maximum time for async operations */
    maxAsyncOperationTime: number;
    /** Warning threshold for async operations */
    warningAsyncOperationTime: number;
    /** Maximum time for sync operations */
    maxSyncOperationTime: number;
    /** Warning threshold for sync operations */
    warningSyncOperationTime: number;
  };
  
  // Memory budgets (in MB)
  memory: {
    /** Maximum memory usage */
    maxMemoryMB: number;
    /** Warning threshold for memory usage */
    warningMemoryMB: number;
    /** Maximum memory growth per minute */
    maxMemoryGrowthMB: number;
  };
  
  // Bundle size budgets (in KB)
  bundle: {
    /** Maximum initial bundle size */
    maxInitialBundleKB: number;
    /** Warning threshold for initial bundle */
    warningInitialBundleKB: number;
    /** Maximum chunk size */
    maxChunkKB: number;
  };
  
  // Network budgets (in milliseconds)
  network: {
    /** Maximum time for API requests */
    maxRequestTime: number;
    /** Warning threshold for API requests */
    warningRequestTime: number;
  };
}

/**
 * Default performance budgets
 * 
 * These are conservative budgets suitable for most applications.
 * Adjust based on your specific requirements and target devices.
 */
export const defaultPerformanceBudgets: PerformanceBudgets = {
  render: {
    // 16ms = 60fps, but we allow some overhead
    maxRenderTime: 20,
    warningRenderTime: 16,
    // Initial mount can take longer
    maxMountTime: 100,
    warningMountTime: 50,
  },
  operations: {
    // Async operations (API calls, file I/O)
    maxAsyncOperationTime: 1000,
    warningAsyncOperationTime: 500,
    // Sync operations should be fast
    maxSyncOperationTime: 50,
    warningSyncOperationTime: 16,
  },
  memory: {
    // Maximum memory usage (adjust based on target devices)
    maxMemoryMB: 200,
    warningMemoryMB: 150,
    // Memory growth per minute (detect memory leaks)
    maxMemoryGrowthMB: 10,
  },
  bundle: {
    // Initial bundle size (gzipped)
    maxInitialBundleKB: 300,
    warningInitialBundleKB: 250,
    // Individual chunk size
    maxChunkKB: 200,
  },
  network: {
    // API request timeouts
    maxRequestTime: 5000,
    warningRequestTime: 2000,
  },
};

/**
 * Strict performance budgets for production
 * 
 * More aggressive budgets for production environments.
 */
export const strictPerformanceBudgets: PerformanceBudgets = {
  render: {
    maxRenderTime: 16,
    warningRenderTime: 12,
    maxMountTime: 80,
    warningMountTime: 40,
  },
  operations: {
    maxAsyncOperationTime: 800,
    warningAsyncOperationTime: 400,
    maxSyncOperationTime: 30,
    warningSyncOperationTime: 12,
  },
  memory: {
    maxMemoryMB: 150,
    warningMemoryMB: 100,
    maxMemoryGrowthMB: 5,
  },
  bundle: {
    maxInitialBundleKB: 250,
    warningInitialBundleKB: 200,
    maxChunkKB: 150,
  },
  network: {
    maxRequestTime: 3000,
    warningRequestTime: 1500,
  },
};

/**
 * Get current performance budgets based on environment
 */
export function getPerformanceBudgets(): PerformanceBudgets {
  const isDev = import.meta.env.DEV;
  const useStrict = import.meta.env.VITE_USE_STRICT_PERFORMANCE === 'true';
  
  if (useStrict) {
    return strictPerformanceBudgets;
  }
  
  // In development, use default budgets
  // In production, use strict budgets
  return isDev ? defaultPerformanceBudgets : strictPerformanceBudgets;
}

/**
 * Check if a render time exceeds budgets
 */
export function checkRenderBudget(renderTime: number, isMount: boolean = false): {
  exceeds: boolean;
  warning: boolean;
  budget: number;
  warningThreshold: number;
} {
  const budgets = getPerformanceBudgets();
  const budget = isMount ? budgets.render.maxMountTime : budgets.render.maxRenderTime;
  const warningThreshold = isMount 
    ? budgets.render.warningMountTime 
    : budgets.render.warningRenderTime;
  
  return {
    exceeds: renderTime > budget,
    warning: renderTime > warningThreshold,
    budget,
    warningThreshold,
  };
}

/**
 * Check if an operation time exceeds budgets
 */
export function checkOperationBudget(
  operationTime: number, 
  isAsync: boolean = true
): {
  exceeds: boolean;
  warning: boolean;
  budget: number;
  warningThreshold: number;
} {
  const budgets = getPerformanceBudgets();
  const budget = isAsync 
    ? budgets.operations.maxAsyncOperationTime 
    : budgets.operations.maxSyncOperationTime;
  const warningThreshold = isAsync
    ? budgets.operations.warningAsyncOperationTime
    : budgets.operations.warningSyncOperationTime;
  
  return {
    exceeds: operationTime > budget,
    warning: operationTime > warningThreshold,
    budget,
    warningThreshold,
  };
}

/**
 * Check if memory usage exceeds budgets
 */
export function checkMemoryBudget(memoryMB: number): {
  exceeds: boolean;
  warning: boolean;
  budget: number;
  warningThreshold: number;
} {
  const budgets = getPerformanceBudgets();
  
  return {
    exceeds: memoryMB > budgets.memory.maxMemoryMB,
    warning: memoryMB > budgets.memory.warningMemoryMB,
    budget: budgets.memory.maxMemoryMB,
    warningThreshold: budgets.memory.warningMemoryMB,
  };
}

