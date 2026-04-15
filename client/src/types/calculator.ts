export interface CalculatorInputs {
  currentAge: number;
  targetAge: number;
  monthlyAmount: number;
  oneTimeAmount: number;
  annualIncrease: number;
  strategy: 'ausgewogen' | 'dynamisch';
  inflationAdjusted: boolean;
  goals: Goal[];
  capitalInflows: CapitalInflow[];
}

export interface Goal {
  id: string;
  type: 'ausbildung' | 'auto' | 'hochzeit' | 'immobilienkauf' | 'renovierung' | 'sonstiges';
  amount: number;
  year: number;
}

export interface CapitalInflow {
  id: string;
  type: 'immobilienverkauf' | 'versicherung' | 'erbschaft' | 'unternehmensverkauf' | 'staatliche_leistungen' | 'sonstige_einmalzahlung';
  amount: number;
  year: number;
}

export interface CalculationResult {
  median: number;
  worstCase: number;
  bestCase: number;
  timeline: TimelinePoint[];
  summary: {
    oneTime: number;
    totalMonthly: number;
    totalPaid: number;
    profit: number;
  };
  expectedValue?: number; // Add expected value
}

export interface TimelinePoint {
  age: number;
  year: number;
  median: number;
  worstCase: number;
  bestCase: number;
  totalPaid: number;
  expectedValue?: number;
}

export interface WithdrawalResult {
  monthlyAmount: number;
  annualAmount: number;
  totalWithdrawn: number;
  timeline: WithdrawalTimelinePoint[];
  strategy: '4percent' | 'maximum' | 'custom';
  monthlyWithdrawal?: number;
  maxWithdrawal?: number;
  customMonthlyAmount?: number;
  startAge: number;
  endAge: number;
  expectedValue?: number; // Add expected value
}

export interface WithdrawalTimelinePoint {
  age: number;
  year: number;
  median: number;
  worstCase: number;
  bestCase: number;
  withdrawn: number;
}

export interface SimulationParameters {
  monthlyReturn: number;
  volatility: number;
  inflationRate: number;
  productCosts: number;
  simulations: number;
}
