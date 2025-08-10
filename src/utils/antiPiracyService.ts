// Anti-piracy and abuse detection service
class AntiPiracyService {
  private static instance: AntiPiracyService;
  private suspiciousActivities: any[] = [];
  private riskScore: number = 0;
  private maxRiskScore: number = 100;

  static getInstance(): AntiPiracyService {
    if (!AntiPiracyService.instance) {
      AntiPiracyService.instance = new AntiPiracyService();
    }
    return AntiPiracyService.instance;
  }

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor for suspicious patterns
    this.monitorUsagePatterns();
    this.monitorLicenseUsage();
    this.monitorNetworkActivity();
  }

  // Monitor usage patterns for anomalies
  private monitorUsagePatterns(): void {
    let actionCount = 0;
    let lastActionTime = Date.now();

    // Track user actions
    document.addEventListener('click', () => {
      const now = Date.now();
      actionCount++;

      // Detect bot-like behavior (too many actions too quickly)
      if (now - lastActionTime < 100 && actionCount > 10) {
        this.reportSuspiciousActivity('bot_like_behavior', {
          actionCount,
          timeSpan: now - lastActionTime
        });
      }

      lastActionTime = now;

      // Reset counter every minute
      setTimeout(() => {
        actionCount = Math.max(0, actionCount - 1);
      }, 60000);
    });

    // Monitor for automation tools
    this.detectAutomationTools();
  }

  // Monitor license usage patterns
  private monitorLicenseUsage(): void {
    const licenseUsage = this.getLicenseUsageHistory();
    
    // Detect multiple activations from same IP
    const ipGroups = this.groupBy(licenseUsage, 'ipAddress');
    for (const [ip, activations] of Object.entries(ipGroups)) {
      if ((activations as any[]).length > 5) {
        this.reportSuspiciousActivity('multiple_activations_same_ip', {
          ipAddress: ip,
          activationCount: (activations as any[]).length
        });
      }
    }

    // Detect rapid license activations
    const recentActivations = licenseUsage.filter(
      usage => Date.now() - usage.timestamp < 24 * 60 * 60 * 1000
    );
    if (recentActivations.length > 10) {
      this.reportSuspiciousActivity('rapid_activations', {
        count: recentActivations.length,
        timespan: '24h'
      });
    }
  }

  // Monitor network activity
  private monitorNetworkActivity(): void {
    // Track failed requests (might indicate cracking attempts)
    const originalFetch = window.fetch;
    let failedRequests = 0;

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok && response.status === 401) {
          failedRequests++;
          if (failedRequests > 5) {
            this.reportSuspiciousActivity('multiple_auth_failures', {
              failedRequests,
              url: args[0]
            });
          }
        }
        return response;
      } catch (error) {
        failedRequests++;
        throw error;
      }
    };
  }

  // Detect automation tools
  private detectAutomationTools(): void {
    const indicators = [
      // Selenium detection
      !!(window as any).webdriver,
      !!(window as any).__webdriver_evaluate,
      !!(window as any).__selenium_evaluate,
      !!(window as any).__webdriver_script_function,
      !!(window as any).__webdriver_script_func,
      !!(window as any).__webdriver_script_fn,
      !!(window as any).__fxdriver_evaluate,
      !!(window as any).__driver_unwrapped,
      !!(window as any).__webdriver_unwrapped,
      !!(window as any).__driver_evaluate,
      !!(window as any).__selenium_unwrapped,
      !!(window as any).__fxdriver_unwrapped,

      // PhantomJS detection
      !!(window as any).callPhantom,
      !!(window as any)._phantom,
      !!(window as any).phantom,

      // Puppeteer detection
      !!(window as any).__puppeteer_evaluation_script__,

      // Playwright detection
      !!(window as any).__playwright_evaluation_script__,

      // General automation detection
      navigator.webdriver === true,
      'webdriver' in window,
      'domAutomation' in window || 'domAutomationController' in window
    ];

    const detectedCount = indicators.filter(Boolean).length;
    if (detectedCount > 0) {
      this.reportSuspiciousActivity('automation_tools_detected', {
        indicatorCount: detectedCount,
        indicators: indicators.map((indicator, index) => ({ index, detected: indicator }))
      });
    }
  }

  // Analyze license sharing patterns
  analyzeLicenseSharing(licenseKey: string, hardwareIds: string[]): {
    isShared: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let confidence = 0;

    // Check for too many different hardware IDs
    if (hardwareIds.length > 3) {
      reasons.push('Multiple hardware IDs detected');
      confidence += 30;
    }

    // Check for rapid hardware changes
    const usageHistory = this.getLicenseUsageHistory().filter(u => u.licenseKey === licenseKey);
    const hardwareChanges = this.countHardwareChanges(usageHistory);
    if (hardwareChanges > 5) {
      reasons.push('Frequent hardware changes');
      confidence += 25;
    }

    // Check for simultaneous usage from different locations
    const simultaneousUsage = this.detectSimultaneousUsage(usageHistory);
    if (simultaneousUsage) {
      reasons.push('Simultaneous usage from different locations');
      confidence += 40;
    }

    // Check for unusual usage patterns
    const unusualPatterns = this.detectUnusualUsagePatterns(usageHistory);
    if (unusualPatterns.length > 0) {
      reasons.push(...unusualPatterns);
      confidence += unusualPatterns.length * 10;
    }

    return {
      isShared: confidence > 50,
      confidence: Math.min(confidence, 100),
      reasons
    };
  }

  // Detect piracy indicators
  detectPiracyIndicators(): {
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    recommendations: string[];
  } {
    const indicators: string[] = [];
    const recommendations: string[] = [];

    // Check for cracking tools
    if (this.detectCrackingTools()) {
      indicators.push('Cracking tools detected');
      recommendations.push('Implement additional code obfuscation');
    }

    // Check for modified files
    if (this.detectFileModification()) {
      indicators.push('Application files may be modified');
      recommendations.push('Implement integrity checking');
    }

    // Check for license generators
    if (this.detectLicenseGenerators()) {
      indicators.push('License generation patterns detected');
      recommendations.push('Enhance license validation');
    }

    // Check for virtual machines
    if (this.detectVirtualMachines()) {
      indicators.push('Running in virtual environment');
      recommendations.push('Consider VM restrictions');
    }

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (indicators.length >= 3) {
      riskLevel = 'high';
    } else if (indicators.length >= 1) {
      riskLevel = 'medium';
    }

    return {
      riskLevel,
      indicators,
      recommendations
    };
  }

  // Report suspicious activity
  private reportSuspiciousActivity(type: string, details: any): void {
    const activity = {
      type,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      url: window.location.href
    };

    this.suspiciousActivities.push(activity);
    this.updateRiskScore(type);

    // Store locally
    const stored = this.getSuspiciousActivities();
    stored.push(activity);
    localStorage.setItem('suspicious_activities', JSON.stringify(stored.slice(-100)));

    // Report to server
    this.reportToServer(activity);
  }

  // Update risk score based on activity type
  private updateRiskScore(activityType: string): void {
    const riskWeights: Record<string, number> = {
      'bot_like_behavior': 10,
      'multiple_activations_same_ip': 20,
      'rapid_activations': 15,
      'multiple_auth_failures': 5,
      'automation_tools_detected': 25,
      'cracking_tools_detected': 40,
      'file_modification_detected': 30,
      'license_generator_detected': 35,
      'virtual_machine_detected': 10
    };

    const weight = riskWeights[activityType] || 5;
    this.riskScore = Math.min(this.riskScore + weight, this.maxRiskScore);

    // Decay risk score over time
    setTimeout(() => {
      this.riskScore = Math.max(0, this.riskScore - weight * 0.1);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Report to server
  private async reportToServer(activity: any): Promise<void> {
    try {
      await fetch('/api/report-suspicious-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activity)
      });
    } catch (error) {
      console.debug('Failed to report suspicious activity:', error);
    }
  }

  // Helper methods for detection
  private detectCrackingTools(): boolean {
    const indicators = [
      // Common cracking tool indicators
      document.title.toLowerCase().includes('crack'),
      document.title.toLowerCase().includes('keygen'),
      window.location.href.includes('crack'),
      window.location.href.includes('keygen'),
      
      // Check for common cracking tool processes (would need native access)
      // This is a simplified check for web environment
      navigator.userAgent.toLowerCase().includes('crack'),
      navigator.userAgent.toLowerCase().includes('keygen')
    ];

    return indicators.some(Boolean);
  }

  private detectFileModification(): boolean {
    // Check for signs of file modification
    // In a real implementation, this would check file hashes
    try {
      const scripts = Array.from(document.scripts);
      const suspiciousScripts = scripts.filter(script => 
        script.src.includes('crack') || 
        script.src.includes('patch') ||
        script.innerHTML.includes('crack') ||
        script.innerHTML.includes('patch')
      );
      
      return suspiciousScripts.length > 0;
    } catch {
      return false;
    }
  }

  private detectLicenseGenerators(): boolean {
    // Look for patterns that suggest license generation
    const licenseHistory = this.getLicenseUsageHistory();
    const recentLicenses = licenseHistory.filter(
      l => Date.now() - l.timestamp < 60 * 60 * 1000 // Last hour
    );

    // Too many different licenses in short time
    const uniqueLicenses = new Set(recentLicenses.map(l => l.licenseKey));
    return uniqueLicenses.size > 5;
  }

  private detectVirtualMachines(): boolean {
    const indicators = [
      screen.width === 1024 && screen.height === 768,
      navigator.hardwareConcurrency === 1,
      navigator.platform.includes('Win32') && navigator.userAgent.includes('WOW64'),
      'memory' in performance && (performance as any).memory.jsHeapSizeLimit < 1073741824
    ];

    return indicators.filter(Boolean).length >= 2;
  }

  // Helper methods
  private getLicenseUsageHistory(): any[] {
    try {
      return JSON.parse(localStorage.getItem('license_usage_history') || '[]');
    } catch {
      return [];
    }
  }

  private getSuspiciousActivities(): any[] {
    try {
      return JSON.parse(localStorage.getItem('suspicious_activities') || '[]');
    } catch {
      return [];
    }
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  private countHardwareChanges(usageHistory: any[]): number {
    const hardwareIds = usageHistory.map(u => u.hardwareId).filter(Boolean);
    return new Set(hardwareIds).size;
  }

  private detectSimultaneousUsage(usageHistory: any[]): boolean {
    // Check for usage from different IPs within short time window
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    for (let i = 0; i < usageHistory.length - 1; i++) {
      const current = usageHistory[i];
      const next = usageHistory[i + 1];
      
      if (Math.abs(current.timestamp - next.timestamp) < timeWindow &&
          current.ipAddress !== next.ipAddress) {
        return true;
      }
    }
    
    return false;
  }

  private detectUnusualUsagePatterns(usageHistory: any[]): string[] {
    const patterns: string[] = [];
    
    // Check for usage at unusual hours (might indicate automation)
    const nightUsage = usageHistory.filter(u => {
      const hour = new Date(u.timestamp).getHours();
      return hour >= 2 && hour <= 5; // 2 AM to 5 AM
    });
    
    if (nightUsage.length > usageHistory.length * 0.5) {
      patterns.push('Unusual usage hours detected');
    }
    
    // Check for perfectly regular intervals (might indicate automation)
    const intervals = [];
    for (let i = 1; i < usageHistory.length; i++) {
      intervals.push(usageHistory[i].timestamp - usageHistory[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const regularIntervals = intervals.filter(i => Math.abs(i - avgInterval) < 1000).length;
    
    if (regularIntervals > intervals.length * 0.8) {
      patterns.push('Regular usage intervals detected');
    }
    
    return patterns;
  }

  // Public methods
  getRiskScore(): number {
    return this.riskScore;
  }

  getSuspiciousActivitySummary(): {
    totalActivities: number;
    riskScore: number;
    recentActivities: any[];
    topRisks: string[];
  } {
    const activities = this.getSuspiciousActivities();
    const recentActivities = activities.filter(
      a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000
    );
    
    const riskCounts: Record<string, number> = {};
    activities.forEach(a => {
      riskCounts[a.type] = (riskCounts[a.type] || 0) + 1;
    });
    
    const topRisks = Object.entries(riskCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([risk]) => risk);

    return {
      totalActivities: activities.length,
      riskScore: this.riskScore,
      recentActivities: recentActivities.slice(-10),
      topRisks
    };
  }

  // Reset risk score (for testing or after resolving issues)
  resetRiskScore(): void {
    this.riskScore = 0;
    this.suspiciousActivities = [];
    localStorage.removeItem('suspicious_activities');
  }
}

export const antiPiracyService = AntiPiracyService.getInstance();