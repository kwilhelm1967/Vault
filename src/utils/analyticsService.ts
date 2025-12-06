// Simple analytics service for tracking user actions

interface AnalyticsEventProperties {
  timestamp?: number;
  sessionId?: string;
  userId?: string;
  action?: string;
  feature?: string;
  licenseEvent?: string;
  licenseType?: string;
  step?: string;
  [key: string]: string | number | boolean | undefined;
}

interface AnalyticsEvent {
  event: string;
  properties: AnalyticsEventProperties;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string = '';
  private userId: string = '';
  private events: AnalyticsEvent[] = [];

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // Only get user ID if we're in a browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      this.userId = this.getUserId();
    }
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
  }

  private getUserId(): string {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId && typeof window !== 'undefined' && window.localStorage) {
      userId = 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId || 'anonymous';
  }

  // Track events
  track(event: string, properties: AnalyticsEventProperties = {}): void {
    // Skip tracking if analytics is disabled
    if (!environment.analyticsEnabled) {
      return;
    }
    
    const eventData: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId
      }
    };

    this.events.push(eventData);
    
    // In a real app, we would send this to a server
    if (environment.isTest) {
      void eventData; // Test mode - event captured
    }
  }

  // Track user actions
  trackUserAction(action: string, details: AnalyticsEventProperties = {}): void {
    this.track('user_action', {
      action,
      ...details
    });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, details: AnalyticsEventProperties = {}): void {
    this.track('feature_usage', {
      feature,
      ...details
    });
  }

  // Track license events
  trackLicenseEvent(event: string, licenseType?: string, details: AnalyticsEventProperties = {}): void {
    this.track('license_event', {
      licenseEvent: event,
      licenseType,
      ...details
    });
  }

  // Track conversion events
  trackConversion(step: string, details: AnalyticsEventProperties = {}): void {
    this.track('conversion', {
      step,
      ...details
    });
  }
}

import { environment } from '../config/environment';
export const analyticsService = AnalyticsService.getInstance();