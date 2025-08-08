// Business intelligence and revenue protection service
class BusinessIntelligenceService {
  private static instance: BusinessIntelligenceService;
  private metrics: Map<string, any[]> = new Map();

  static getInstance(): BusinessIntelligenceService {
    if (!BusinessIntelligenceService.instance) {
      BusinessIntelligenceService.instance = new BusinessIntelligenceService();
    }
    return BusinessIntelligenceService.instance;
  }

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking(): void {
    // Track user journey
    this.trackUserJourney();
    
    // Track feature usage
    this.trackFeatureUsage();
    
    // Track conversion events
    this.trackConversionEvents();
    
    // Track revenue events
    this.trackRevenueEvents();
  }

  // Track user journey through the application
  private trackUserJourney(): void {
    const journey = this.getUserJourney();
    
    // Track page/screen changes
    const trackNavigation = (screen: string) => {
      journey.push({
        screen,
        timestamp: Date.now(),
        sessionId: this.getSessionId()
      });
      this.saveUserJourney(journey);
    };

    // Track major navigation events
    window.addEventListener('hashchange', () => {
      trackNavigation(window.location.hash || 'main');
    });

    // Track initial load
    trackNavigation('app_start');
  }

  // Track feature usage patterns
  private trackFeatureUsage(): void {
    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.closest('button') || target;
        const feature = button.getAttribute('data-feature') || 
                       button.textContent?.trim() || 
                       'unknown_button';
        
        this.recordMetric('feature_usage', {
          feature,
          timestamp: Date.now(),
          context: this.getCurrentContext()
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formType = form.getAttribute('data-form-type') || 'unknown_form';
      
      this.recordMetric('form_submission', {
        formType,
        timestamp: Date.now(),
        context: this.getCurrentContext()
      });
    });
  }

  // Track conversion events
  private trackConversionEvents(): void {
    // Track trial starts
    this.trackEvent('trial_start', () => {
      this.recordMetric('conversion', {
        event: 'trial_start',
        timestamp: Date.now(),
        userType: this.getUserType()
      });
    });

    // Track license activations
    this.trackEvent('license_activation', (licenseType: string) => {
      this.recordMetric('conversion', {
        event: 'license_activation',
        licenseType,
        timestamp: Date.now(),
        userType: this.getUserType(),
        journeyLength: this.getJourneyLength()
      });
    });

    // Track feature upgrades
    this.trackEvent('feature_upgrade', (fromTier: string, toTier: string) => {
      this.recordMetric('conversion', {
        event: 'feature_upgrade',
        fromTier,
        toTier,
        timestamp: Date.now(),
        userType: this.getUserType()
      });
    });
  }

  // Track revenue-related events
  private trackRevenueEvents(): void {
    // Track purchase attempts
    this.trackEvent('purchase_attempt', (licenseType: string, price: number) => {
      this.recordMetric('revenue', {
        event: 'purchase_attempt',
        licenseType,
        price,
        timestamp: Date.now(),
        userType: this.getUserType()
      });
    });

    // Track successful purchases
    this.trackEvent('purchase_success', (licenseType: string, price: number) => {
      this.recordMetric('revenue', {
        event: 'purchase_success',
        licenseType,
        price,
        timestamp: Date.now(),
        userType: this.getUserType(),
        timeToConversion: this.getTimeToConversion()
      });
    });

    // Track refund requests
    this.trackEvent('refund_request', (licenseType: string, reason: string) => {
      this.recordMetric('revenue', {
        event: 'refund_request',
        licenseType,
        reason,
        timestamp: Date.now(),
        userType: this.getUserType()
      });
    });
  }

  // Analyze user behavior patterns
  analyzeUserBehavior(): {
    userType: string;
    engagementLevel: 'low' | 'medium' | 'high';
    conversionProbability: number;
    recommendedActions: string[];
  } {
    const featureUsage = this.getMetrics('feature_usage');
    const journey = this.getUserJourney();
    const conversions = this.getMetrics('conversion');

    // Determine user type
    const userType = this.classifyUser(featureUsage, journey);

    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(featureUsage, journey);

    // Predict conversion probability
    const conversionProbability = this.predictConversionProbability(
      featureUsage, journey, conversions
    );

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(
      userType, engagementLevel, conversionProbability
    );

    return {
      userType,
      engagementLevel,
      conversionProbability,
      recommendedActions
    };
  }

  // Analyze revenue patterns
  analyzeRevenuePatterns(): {
    totalRevenue: number;
    revenueByTier: Record<string, number>;
    conversionRates: Record<string, number>;
    averageTimeToConversion: number;
    topConversionPaths: string[];
    revenueProjection: number;
  } {
    const revenueMetrics = this.getMetrics('revenue');
    const conversionMetrics = this.getMetrics('conversion');

    // Calculate total revenue
    const totalRevenue = revenueMetrics
      .filter(m => m.event === 'purchase_success')
      .reduce((sum, m) => sum + m.price, 0);

    // Revenue by tier
    const revenueByTier: Record<string, number> = {};
    revenueMetrics
      .filter(m => m.event === 'purchase_success')
      .forEach(m => {
        revenueByTier[m.licenseType] = (revenueByTier[m.licenseType] || 0) + m.price;
      });

    // Conversion rates
    const conversionRates: Record<string, number> = {};
    const tierCounts = this.groupBy(conversionMetrics, 'licenseType');
    Object.entries(tierCounts).forEach(([tier, events]) => {
      const attempts = (events as any[]).filter(e => e.event === 'trial_start').length;
      const successes = (events as any[]).filter(e => e.event === 'license_activation').length;
      conversionRates[tier] = attempts > 0 ? (successes / attempts) * 100 : 0;
    });

    // Average time to conversion
    const conversionTimes = conversionMetrics
      .filter(m => m.timeToConversion)
      .map(m => m.timeToConversion);
    const averageTimeToConversion = conversionTimes.length > 0 ?
      conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0;

    // Top conversion paths
    const topConversionPaths = this.analyzeConversionPaths();

    // Revenue projection (simple linear projection based on recent trends)
    const revenueProjection = this.projectRevenue(revenueMetrics);

    return {
      totalRevenue,
      revenueByTier,
      conversionRates,
      averageTimeToConversion,
      topConversionPaths,
      revenueProjection
    };
  }

  // Detect revenue loss patterns
  detectRevenueLoss(): {
    estimatedLoss: number;
    lossFactors: string[];
    recommendations: string[];
  } {
    const revenueMetrics = this.getMetrics('revenue');
    const suspiciousActivities = this.getSuspiciousActivities();

    let estimatedLoss = 0;
    const lossFactors: string[] = [];
    const recommendations: string[] = [];

    // Analyze refund patterns
    const refunds = revenueMetrics.filter(m => m.event === 'refund_request');
    if (refunds.length > 0) {
      const refundRate = refunds.length / revenueMetrics.filter(m => m.event === 'purchase_success').length;
      if (refundRate > 0.1) { // More than 10% refund rate
        lossFactors.push('High refund rate');
        recommendations.push('Improve product quality and customer support');
      }
    }

    // Analyze piracy indicators
    const piracyIndicators = suspiciousActivities.filter(a => 
      a.type.includes('crack') || a.type.includes('keygen') || a.type.includes('sharing')
    );
    if (piracyIndicators.length > 0) {
      estimatedLoss += piracyIndicators.length * 29.99; // Assume average Pro license price
      lossFactors.push('Potential piracy detected');
      recommendations.push('Strengthen anti-piracy measures');
    }

    // Analyze trial abandonment
    const trialStarts = this.getMetrics('conversion').filter(m => m.event === 'trial_start').length;
    const activations = this.getMetrics('conversion').filter(m => m.event === 'license_activation').length;
    const abandonmentRate = trialStarts > 0 ? 1 - (activations / trialStarts) : 0;
    
    if (abandonmentRate > 0.7) { // More than 70% abandonment
      estimatedLoss += (trialStarts - activations) * 29.99 * 0.15; // Assume 15% would have converted
      lossFactors.push('High trial abandonment rate');
      recommendations.push('Improve onboarding and trial experience');
    }

    return {
      estimatedLoss,
      lossFactors,
      recommendations
    };
  }

  // Generate business insights
  generateBusinessInsights(): {
    keyMetrics: Record<string, any>;
    trends: string[];
    opportunities: string[];
    risks: string[];
    actionItems: string[];
  } {
    const userBehavior = this.analyzeUserBehavior();
    const revenuePatterns = this.analyzeRevenuePatterns();
    const revenueLoss = this.detectRevenueLoss();

    const keyMetrics = {
      totalUsers: this.getTotalUsers(),
      activeUsers: this.getActiveUsers(),
      conversionRate: this.getOverallConversionRate(),
      averageRevenue: revenuePatterns.totalRevenue / Math.max(1, this.getTotalUsers()),
      customerLifetimeValue: this.calculateCustomerLifetimeValue(),
      churnRate: this.calculateChurnRate()
    };

    const trends = this.identifyTrends();
    const opportunities = this.identifyOpportunities(userBehavior, revenuePatterns);
    const risks = this.identifyRisks(revenueLoss);
    const actionItems = this.generateActionItems(opportunities, risks);

    return {
      keyMetrics,
      trends,
      opportunities,
      risks,
      actionItems
    };
  }

  // Helper methods
  private recordMetric(category: string, data: any): void {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    this.metrics.get(category)!.push(data);

    // Persist to localStorage
    const stored = this.getStoredMetrics();
    if (!stored[category]) {
      stored[category] = [];
    }
    stored[category].push(data);
    
    // Keep only last 1000 entries per category
    stored[category] = stored[category].slice(-1000);
    localStorage.setItem('business_metrics', JSON.stringify(stored));
  }

  private getMetrics(category: string): any[] {
    const stored = this.getStoredMetrics();
    return stored[category] || [];
  }

  private getStoredMetrics(): Record<string, any[]> {
    try {
      return JSON.parse(localStorage.getItem('business_metrics') || '{}');
    } catch {
      return {};
    }
  }

  private trackEvent(eventName: string, callback: (...args: any[]) => void): void {
    // This would be called by the application when events occur
    (window as any)[`track_${eventName}`] = callback;
  }

  private getUserJourney(): any[] {
    try {
      return JSON.parse(localStorage.getItem('user_journey') || '[]');
    } catch {
      return [];
    }
  }

  private saveUserJourney(journey: any[]): void {
    localStorage.setItem('user_journey', JSON.stringify(journey.slice(-100))); // Keep last 100 steps
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private getCurrentContext(): any {
    return {
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
  }

  private getUserType(): string {
    // Classify user based on behavior patterns
    const featureUsage = this.getMetrics('feature_usage');
    const journey = this.getUserJourney();

    if (featureUsage.length > 50) return 'power_user';
    if (journey.length > 20) return 'engaged_user';
    if (journey.length > 5) return 'casual_user';
    return 'new_user';
  }

  private getJourneyLength(): number {
    return this.getUserJourney().length;
  }

  private getTimeToConversion(): number {
    const journey = this.getUserJourney();
    if (journey.length < 2) return 0;
    return journey[journey.length - 1].timestamp - journey[0].timestamp;
  }

  private classifyUser(featureUsage: any[], journey: any[]): string {
    const usageCount = featureUsage.length;
    const journeyLength = journey.length;

    if (usageCount > 100 && journeyLength > 50) return 'power_user';
    if (usageCount > 20 && journeyLength > 10) return 'engaged_user';
    if (usageCount > 5 && journeyLength > 3) return 'casual_user';
    return 'new_user';
  }

  private calculateEngagementLevel(featureUsage: any[], journey: any[]): 'low' | 'medium' | 'high' {
    const recentUsage = featureUsage.filter(u => Date.now() - u.timestamp < 24 * 60 * 60 * 1000);
    const recentJourney = journey.filter(j => Date.now() - j.timestamp < 24 * 60 * 60 * 1000);

    if (recentUsage.length > 10 && recentJourney.length > 5) return 'high';
    if (recentUsage.length > 3 && recentJourney.length > 2) return 'medium';
    return 'low';
  }

  private predictConversionProbability(featureUsage: any[], journey: any[], conversions: any[]): number {
    // Simple scoring algorithm
    let score = 0;

    // Feature usage score
    score += Math.min(featureUsage.length * 2, 40);

    // Journey depth score
    score += Math.min(journey.length * 3, 30);

    // Time spent score
    const sessionDuration = journey.length > 1 ? 
      journey[journey.length - 1].timestamp - journey[0].timestamp : 0;
    score += Math.min(sessionDuration / (1000 * 60), 20); // Minutes to score

    // Previous conversion behavior
    if (conversions.some(c => c.event === 'trial_start')) score += 10;

    return Math.min(score, 100);
  }

  private generateRecommendations(userType: string, engagementLevel: string, conversionProbability: number): string[] {
    const recommendations: string[] = [];

    if (conversionProbability > 70) {
      recommendations.push('Show upgrade prompt - high conversion probability');
    } else if (conversionProbability > 40) {
      recommendations.push('Provide feature demonstration');
    } else {
      recommendations.push('Focus on onboarding and education');
    }

    if (engagementLevel === 'low') {
      recommendations.push('Send re-engagement email');
      recommendations.push('Offer tutorial or help');
    }

    if (userType === 'new_user') {
      recommendations.push('Show welcome tour');
      recommendations.push('Highlight key features');
    }

    return recommendations;
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  private analyzeConversionPaths(): string[] {
    const journeys = this.getUserJourney();
    const paths: Record<string, number> = {};

    // Analyze common paths to conversion
    journeys.forEach((step, index) => {
      if (index > 0) {
        const path = `${journeys[index - 1].screen} -> ${step.screen}`;
        paths[path] = (paths[path] || 0) + 1;
      }
    });

    return Object.entries(paths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => path);
  }

  private projectRevenue(revenueMetrics: any[]): number {
    const recentRevenue = revenueMetrics
      .filter(m => m.event === 'purchase_success' && Date.now() - m.timestamp < 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, m) => sum + m.price, 0);

    // Simple linear projection for next 30 days
    return recentRevenue * 2; // Assuming growth
  }

  private getSuspiciousActivities(): any[] {
    try {
      return JSON.parse(localStorage.getItem('suspicious_activities') || '[]');
    } catch {
      return [];
    }
  }

  private getTotalUsers(): number {
    return new Set(this.getMetrics('feature_usage').map(m => m.context?.userAgent)).size;
  }

  private getActiveUsers(): number {
    const recent = Date.now() - 7 * 24 * 60 * 60 * 1000; // Last 7 days
    return new Set(
      this.getMetrics('feature_usage')
        .filter(m => m.timestamp > recent)
        .map(m => m.context?.userAgent)
    ).size;
  }

  private getOverallConversionRate(): number {
    const trials = this.getMetrics('conversion').filter(m => m.event === 'trial_start').length;
    const activations = this.getMetrics('conversion').filter(m => m.event === 'license_activation').length;
    return trials > 0 ? (activations / trials) * 100 : 0;
  }

  private calculateCustomerLifetimeValue(): number {
    const revenue = this.getMetrics('revenue').filter(m => m.event === 'purchase_success');
    const uniqueCustomers = new Set(revenue.map(r => r.userType)).size;
    const totalRevenue = revenue.reduce((sum, r) => sum + r.price, 0);
    return uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
  }

  private calculateChurnRate(): number {
    // Simplified churn calculation
    const totalUsers = this.getTotalUsers();
    const activeUsers = this.getActiveUsers();
    return totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;
  }

  private identifyTrends(): string[] {
    const trends: string[] = [];
    
    // Analyze usage trends
    const recentUsage = this.getMetrics('feature_usage').filter(
      m => Date.now() - m.timestamp < 7 * 24 * 60 * 60 * 1000
    );
    const previousUsage = this.getMetrics('feature_usage').filter(
      m => Date.now() - m.timestamp >= 7 * 24 * 60 * 60 * 1000 && 
           Date.now() - m.timestamp < 14 * 24 * 60 * 60 * 1000
    );

    if (recentUsage.length > previousUsage.length * 1.2) {
      trends.push('Usage increasing');
    } else if (recentUsage.length < previousUsage.length * 0.8) {
      trends.push('Usage decreasing');
    }

    return trends;
  }

  private identifyOpportunities(userBehavior: any, revenuePatterns: any): string[] {
    const opportunities: string[] = [];

    if (revenuePatterns.conversionRates.pro < 15) {
      opportunities.push('Improve Pro tier conversion rate');
    }

    if (userBehavior.engagementLevel === 'high' && userBehavior.conversionProbability < 50) {
      opportunities.push('Target engaged users for conversion');
    }

    return opportunities;
  }

  private identifyRisks(revenueLoss: any): string[] {
    const risks: string[] = [];

    if (revenueLoss.estimatedLoss > 1000) {
      risks.push('Significant revenue loss detected');
    }

    if (this.calculateChurnRate() > 20) {
      risks.push('High churn rate');
    }

    return risks;
  }

  private generateActionItems(opportunities: string[], risks: string[]): string[] {
    const actions: string[] = [];

    opportunities.forEach(opp => {
      if (opp.includes('conversion')) {
        actions.push('Implement conversion optimization campaign');
      }
      if (opp.includes('engaged users')) {
        actions.push('Create targeted upgrade offers');
      }
    });

    risks.forEach(risk => {
      if (risk.includes('revenue loss')) {
        actions.push('Investigate and address revenue loss sources');
      }
      if (risk.includes('churn')) {
        actions.push('Implement retention campaign');
      }
    });

    return actions;
  }
}

export const businessIntelligenceService = BusinessIntelligenceService.getInstance();