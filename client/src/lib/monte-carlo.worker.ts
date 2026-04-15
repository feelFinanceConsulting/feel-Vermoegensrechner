import { CalculatorInputs, CalculationResult, SimulationParameters, TimelinePoint } from '@/types/calculator';
// @ts-ignore
import * as jStat from 'jstat';

self.onmessage = function(e) {
  const { inputs, params }: { inputs: CalculatorInputs, params: SimulationParameters } = e.data;
  
  const result = performMonteCarloSimulation(inputs, params);
  self.postMessage(result);
};

function performMonteCarloSimulation(inputs: CalculatorInputs, params: SimulationParameters): CalculationResult {
  const { currentAge, targetAge, monthlyAmount, oneTimeAmount, annualIncrease } = inputs;
  const goals = inputs.goals || [];
  const capitalInflows = inputs.capitalInflows || [];
  const { monthlyReturn, volatility, simulations } = params;
  
  const months = (targetAge - currentAge) * 12;
  const simResults: number[][] = [];
  const totalPaidData: number[] = [];
  
  // Run Monte Carlo simulations with monthly returns and drift correction
  for (let sim = 0; sim < simulations; sim++) {
    const monthlyResults: number[] = [];
    let capital = oneTimeAmount;
    let totalPaid = oneTimeAmount;
    
    // Nutze ausschließlich die Parameter aus getSimulationParams:
    // - params.monthlyReturn: NETTO Monats-Effektivzins (TER bereits abgezogen)
    // - params.volatility   : monatliche σ (bereits /√12 skaliert)

    // Jahresgrößen aus Monatsparametern ableiten
    const sigma_annual = params.volatility * Math.sqrt(12);
    const mu_net_annual = Math.pow(1 + params.monthlyReturn, 12) - 1;

    const stepsPerYear = 12;
    // Korrekt: 12*m + 0.5*sigma_annual^2 = ln(1+net_annual)
    const mu_log_m = (Math.log(1 + mu_net_annual) - 0.5 * sigma_annual * sigma_annual) / stepsPerYear;
    const sigma_m  = sigma_annual / Math.sqrt(stepsPerYear);
    
    for (let month = 0; month < months; month++) {
      const age = currentAge + Math.floor(month / 12);
      const yearIndex = Math.floor(month / 12);
      
      // Add monthly contribution with annual increase
      const monthlyRate = monthlyAmount * Math.pow(1 + annualIncrease / 100, yearIndex);
      capital += monthlyRate;
      totalPaid += monthlyRate;
      
      // Generate log-normal monthly return with drift correction
      const z = jStat.normal.sample(mu_log_m, sigma_m);
      const growthFactor = Math.exp(z);
      
      // Apply growth factor directly (TER already included in mu_net - no double subtraction)
      capital *= growthFactor;
      
      // Apply goals withdrawals at end of each year
      if (month > 0 && month % 12 === 11) {
        const currentYear = new Date().getFullYear() + Math.floor(month / 12);
        const goalWithdrawal = goals
          .filter(goal => goal.year === currentYear)
          .reduce((sum, goal) => sum + goal.amount, 0);
        
        if (goalWithdrawal > 0) {
          capital = Math.max(0, capital - goalWithdrawal);
        }

        const inflowSum = capitalInflows
          .filter(inflow => inflow.year === currentYear)
          .reduce((sum, inflow) => sum + inflow.amount, 0);
        if (inflowSum > 0) {
          capital += inflowSum;
          totalPaid += inflowSum;
        }
      }
      
      monthlyResults.push(Math.max(0, capital));
    }
    
    simResults.push(monthlyResults);
    totalPaidData.push(totalPaid);
  }
  
  // Calculate percentiles for each month using improved quantile function
  const timeline: TimelinePoint[] = [];
  
  // Improved quantile function with linear interpolation
  function q(arr: number[], p: number) {
    const a = [...arr].sort((x,y)=>x-y);
    const idx = (a.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return hi === lo ? a[lo] : a[lo] + (idx - lo) * (a[hi] - a[lo]);
  }
  
  // Calculate total paid progression
  let progressiveTotalPaid = oneTimeAmount;
  
  for (let month = 0; month < months; month++) {
    // Filter out invalid values
    const monthValues = simResults
      .map(sim => sim[month])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (monthValues.length === 0) {
      console.warn(`No valid values for month ${month}`);
      continue;
    }
    
    const age = currentAge + Math.floor(month / 12);
    const year = new Date().getFullYear() + Math.floor(month / 12);
    
    // Calculate accurate total paid for this month
    if (month > 0) {
      const yearIndex = Math.floor(month / 12);
      const monthlyRate = monthlyAmount * Math.pow(1 + annualIncrease / 100, yearIndex);
      progressiveTotalPaid += monthlyRate;
    }

    // Add capital inflows to totalPaid at end of each year
    if (month > 0 && month % 12 === 11) {
      const currentYear = new Date().getFullYear() + Math.floor(month / 12);
      const inflowSum = capitalInflows
        .filter(inflow => inflow.year === currentYear)
        .reduce((sum, inflow) => sum + inflow.amount, 0);
      progressiveTotalPaid += inflowSum;
    }
    
    timeline.push({
      age,
      year,
      median: Math.round(q(monthValues, 0.50)),
      worstCase: Math.round(q(monthValues, 0.05)),
      bestCase: Math.round(q(monthValues, 0.95)),
      totalPaid: Math.round(progressiveTotalPaid),
    });
  }
  
  // Final results with improved quantile calculation
  const finalValues = simResults.map(sim => sim[sim.length - 1]);
  
  // Calculate expected value using deterministic calculation
  const expectedValue = calculateExpectedValue(inputs);
  
  function calculateExpectedValue(inputs: CalculatorInputs): number {
    const years = inputs.targetAge - inputs.currentAge;
    // Use the net return from params (already TER-adjusted)
    const netReturn = Math.pow(1 + params.monthlyReturn, 12) - 1;
    
    let capital = inputs.oneTimeAmount;
    
    for (let year = 0; year < years; year++) {
      // Add annual contributions at beginning of year
      const annualContribution = inputs.monthlyAmount * 12 * Math.pow(1 + inputs.annualIncrease / 100, year);
      capital += annualContribution;
      
      // Apply net return for the year
      capital *= (1 + netReturn);
      
      // Apply goals withdrawals at end of year
      const currentYear = new Date().getFullYear() + year;
      const safeGoals = inputs.goals || [];
      const goalWithdrawal = safeGoals
        .filter(goal => goal.year === currentYear)
        .reduce((sum, goal) => sum + goal.amount, 0);
      capital = Math.max(0, capital - goalWithdrawal);

      const safeInflows = inputs.capitalInflows || [];
      const inflowSum = safeInflows
        .filter(inflow => inflow.year === currentYear)
        .reduce((sum, inflow) => sum + inflow.amount, 0);
      capital += inflowSum;
    }
    
    return capital;
  }
  
  const avgTotalPaid = totalPaidData.reduce((a, b) => a + b, 0) / totalPaidData.length;
  
  return {
    median: Math.round(q(finalValues, 0.50)),
    worstCase: Math.round(q(finalValues, 0.05)),
    bestCase: Math.round(q(finalValues, 0.95)),
    expectedValue: Math.round(expectedValue),
    timeline,
    summary: {
      oneTime: oneTimeAmount,
      totalMonthly: Math.round(avgTotalPaid - oneTimeAmount),
      totalPaid: Math.round(avgTotalPaid),
      profit: Math.round(q(finalValues, 0.50) - avgTotalPaid),
    },
  };
}

function generateNormalRandom(mean: number, stdDev: number): number {
  // Box-Muller transformation for normal distribution
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

export {};
