export interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  startDate: Date | null;
  endDate: Date | null;
  hasTrialBeenUsed: boolean;
}

export class TrialService {
  private static instance: TrialService;
  private static readonly TRIAL_START_KEY = "trial_start_date";
  private static readonly TRIAL_USED_KEY = "trial_used";
  private static readonly TRIAL_DURATION_DAYS = 7;

  static getInstance(): TrialService {
    if (!TrialService.instance) {
      TrialService.instance = new TrialService();
    }
    return TrialService.instance;
  }

  /**
   * Start the trial period
   */
  startTrial(): TrialInfo {
    const now = new Date();

    localStorage.setItem(TrialService.TRIAL_START_KEY, now.toISOString());
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");

    return this.getTrialInfo();
  }

  /**
   * Get current trial information
   */
  getTrialInfo(): TrialInfo {
    const startDateStr = localStorage.getItem(TrialService.TRIAL_START_KEY);
    const hasTrialBeenUsed =
      localStorage.getItem(TrialService.TRIAL_USED_KEY) === "true";

    if (!startDateStr || !hasTrialBeenUsed) {
      // No trial started yet
      return {
        isTrialActive: false,
        daysRemaining: TrialService.TRIAL_DURATION_DAYS,
        isExpired: false,
        startDate: null,
        endDate: null,
        hasTrialBeenUsed: false,
      };
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(
      startDate.getTime() +
        TrialService.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
    );
    const now = new Date();

    const isExpired = now > endDate;
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );

    return {
      isTrialActive: !isExpired,
      daysRemaining,
      isExpired,
      startDate,
      endDate,
      hasTrialBeenUsed: true,
    };
  }

  /**
   * Check if trial has expired
   */
  isTrialExpired(): boolean {
    const trialInfo = this.getTrialInfo();
    return trialInfo.hasTrialBeenUsed && trialInfo.isExpired;
  }

  /**
   * Check if trial is currently active
   */
  isTrialActive(): boolean {
    const trialInfo = this.getTrialInfo();
    return trialInfo.hasTrialBeenUsed && trialInfo.isTrialActive;
  }

  /**
   * Check if user can start a trial (hasn't used it yet)
   */
  canStartTrial(): boolean {
    const trialInfo = this.getTrialInfo();
    return !trialInfo.hasTrialBeenUsed;
  }

  /**
   * Get remaining trial time in a human-readable format
   */
  getTrialTimeRemaining(): string {
    const trialInfo = this.getTrialInfo();

    if (!trialInfo.hasTrialBeenUsed) {
      return `${TrialService.TRIAL_DURATION_DAYS} days available`;
    }

    if (trialInfo.isExpired) {
      return "Trial expired";
    }

    const days = trialInfo.daysRemaining;
    if (days === 1) {
      return "1 day remaining";
    } else if (days === 0) {
      // Check hours remaining for last day
      const now = new Date();
      const endDate = trialInfo.endDate!;
      const hoursRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (60 * 60 * 1000))
      );

      if (hoursRemaining <= 1) {
        return "Less than 1 hour remaining";
      } else {
        return `${hoursRemaining} hours remaining`;
      }
    } else {
      return `${days} days remaining`;
    }
  }

  /**
   * Reset trial (for testing purposes only)
   */
  resetTrial(): void {
    localStorage.removeItem(TrialService.TRIAL_START_KEY);
    localStorage.removeItem(TrialService.TRIAL_USED_KEY);
  }

  /**
   * End trial manually (when user purchases license)
   */
  endTrial(): void {
    // Keep the trial data but mark it as used
    // This prevents starting another trial
    const now = new Date();
    const pastDate = new Date(
      now.getTime() -
        TrialService.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000 -
        1000
    );
    localStorage.setItem(TrialService.TRIAL_START_KEY, pastDate.toISOString());
    localStorage.setItem(TrialService.TRIAL_USED_KEY, "true");
  }

  /**
   * Get trial progress as percentage (0-100)
   */
  getTrialProgress(): number {
    const trialInfo = this.getTrialInfo();

    if (!trialInfo.hasTrialBeenUsed) {
      return 0;
    }

    if (trialInfo.isExpired) {
      return 100;
    }

    const totalDays = TrialService.TRIAL_DURATION_DAYS;
    const daysUsed = totalDays - trialInfo.daysRemaining;
    return Math.round((daysUsed / totalDays) * 100);
  }
}

export const trialService = TrialService.getInstance();
