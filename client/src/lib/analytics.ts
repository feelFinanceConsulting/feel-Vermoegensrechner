declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(eventName: string, parameters: Record<string, any> = {}) {
  // Google Analytics 4 tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      event_category: 'Calculator',
      ...parameters,
    });
  }
  
  // Console log for development
  console.log('Analytics Event:', eventName, parameters);
}

export function trackCalculatorView() {
  trackEvent('calculator_viewed', {
    page_title: 'feelfinance Spar-Rechner',
    page_location: window.location.href,
  });
}

export function trackResultGenerated(inputs: any, results: any) {
  trackEvent('result_generated', {
    strategy: inputs.strategy,
    age_range: `${inputs.currentAge}-${inputs.targetAge}`,
    monthly_amount: inputs.monthlyAmount,
    one_time_amount: inputs.oneTimeAmount,
    median_result: results.median,
  });
}

export function trackLeadClick(source: string) {
  trackEvent('lead_clicked', {
    lead_source: source,
    value: 1,
  });
}

export function trackPDFExport() {
  trackEvent('pdf_exported', {
    export_type: 'calculator_results',
  });
}

export function trackGoalAdded() {
  trackEvent('goal_added', {
    feature: 'financial_goals',
  });
}
