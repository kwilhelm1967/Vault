import { useState, useEffect, useCallback } from "react";
import { licenseService, AppLicenseStatus } from "../utils/licenseService";
import { trialService } from "../utils/trialService";
import { storageService } from "../utils/storage";
import { devError } from "../utils/devLog";

/**
 * Custom hook for managing application license and trial status
 * 
 * Handles license validation, trial expiration checking, and app status updates.
 * Sets up periodic checks for trial expiration and manages state accordingly.
 * 
 * @returns Object containing appStatus, updateAppStatus, and checkStatusImmediately
 * 
 * @example
 * ```typescript
 * const { appStatus, updateAppStatus } = useAppStatus();
 * if (appStatus?.canUseApp) {
 *   // Show main app
 * } else {
 *   // Show license screen
 * }
 * ```
 */
export const useAppStatus = () => {
  const [appStatus, setAppStatus] = useState<AppLicenseStatus | null>(null);
  const [checkingEnabled, setCheckingEnabled] = useState(true);

  const updateAppStatus = useCallback(async () => {
    const newStatus = await licenseService.getAppStatus();
    setAppStatus(newStatus);
    return newStatus;
  }, []);

  // Initialize app status on mount - defer to avoid blocking initial render
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    // Defer status check to next tick to allow initial render
    const timeoutId = setTimeout(async () => {
      if (!signal.aborted) {
        await updateAppStatus();
      }
    }, 0);
    
    // Fix for existing users: if vault exists but onboarding_completed isn't set,
    // set it now to prevent tutorial from showing on every login
    if (storageService.vaultExists() && !localStorage.getItem("onboarding_completed")) {
      localStorage.setItem("onboarding_completed", "true");
    }
    
    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [updateAppStatus]);

  // Handle trial expiration with immediate redirect
  const handleTrialExpiration = useCallback(() => {
    // Clear any vault data to prevent access
    if (storageService.isVaultUnlocked()) {
      storageService.lockVault();
    }

    // Update status immediately
    updateAppStatus();

    // Disable further checking after confirming expiration
    setTimeout(() => {
      setCheckingEnabled(false);
    }, 5000);
  }, [updateAppStatus]);

  // Immediate status check function
  const checkStatusImmediately = useCallback(async () => {
    const currentStatus = await licenseService.getAppStatus();

    // If trial has expired and we're not on license screen, force redirect
    if (currentStatus.trialInfo.isExpired && currentStatus.canUseApp) {
      // Force the license service to re-evaluate status
      setAppStatus({
        ...currentStatus,
        canUseApp: false,
        requiresPurchase: true
      });
    } else {
      setAppStatus(currentStatus);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    // Set up trial expiration callback
    trialService.addExpirationCallback(handleTrialExpiration);

    // Check trial status every 30 seconds (but only if checking is enabled)
    const checkInterval = 30000;
    const interval = checkingEnabled ? setInterval(async () => {
      if (signal.aborted) return;
      
      try {
        const expirationDetected = await trialService.checkAndHandleExpiration();
        if (signal.aborted) return;
        
        await checkStatusImmediately();
        if (signal.aborted) return;

        // Handle trial expiration properly
        const currentStatus = await licenseService.getAppStatus();
        if (signal.aborted) return;
        
        if (currentStatus.trialInfo.isExpired && currentStatus.canUseApp) {
          // Use proper state management instead of force reload
          await handleTrialExpiration();
        }

        // If expiration detected 3+ times, stop checking
        if (expirationDetected && trialService.isExpirationConfirmed()) {
          setCheckingEnabled(false);
        }
      } catch (error) {
        // Log error but don't crash the app
        if (!signal.aborted) {
          devError('Trial status check failed:', error);
        }
      }
    }, checkInterval) : null;

    // Defer initial check to avoid blocking render
    const initialCheckTimeout = setTimeout(() => {
      if (!signal.aborted) {
        checkStatusImmediately();
      }
    }, 100);

    return () => {
      abortController.abort();
      clearTimeout(initialCheckTimeout);
      trialService.removeExpirationCallback(handleTrialExpiration);
      if (interval) clearInterval(interval);
    };
  }, [updateAppStatus, handleTrialExpiration, checkStatusImmediately, checkingEnabled]);

  return { appStatus, updateAppStatus, checkStatusImmediately };
};

