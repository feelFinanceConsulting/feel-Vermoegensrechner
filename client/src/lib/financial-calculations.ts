import { CalculatorInputs, CalculationResult, SimulationParameters, Goal, TimelinePoint, WithdrawalResult, WithdrawalTimelinePoint } from '@/types/calculator';
// @ts-ignore
import * as Finance from 'financial';
// @ts-ignore
import * as jStat from 'jstat';

/** ------------------------
 *  KONFIG / DEFAULTS
 *  ------------------------ */
export const SIMULATION_PARAMS = {
  ausgewogen: {
    annualReturn: 0.05,  // BRUTTO
    volatility: 0.09,    // p.a.
  },
  dynamisch: {
    annualReturn: 0.07,  // BRUTTO
    volatility: 0.14,    // p.a.
  },
  inflationRate: 0.025,
  productCosts: 0.0099,  // TER 0,99 % p.a.
  simulations: 2000,    // UI-Standard; für Validierung gerne 50000+
};

export type Strategy = 'ausgewogen' | 'dynamisch';

/** Hilfsfunktion: Jahres-Parameter für Strategie (brutto/netto/σ) */
export function getAnnualParamsForStrategy(strategy: Strategy) {
  const gross = strategy === 'dynamisch' ? SIMULATION_PARAMS.dynamisch.annualReturn : SIMULATION_PARAMS.ausgewogen.annualReturn;
  const sigma = strategy === 'dynamisch' ? SIMULATION_PARAMS.dynamisch.volatility   : SIMULATION_PARAMS.ausgewogen.volatility;
  const net   = Math.max(0, gross - SIMULATION_PARAMS.productCosts); // Netto-Drift nach TER
  return { gross, net, sigma };
}

/** Robuste Quantilsfunktion (lineare Interpolation auf sortierten Arrays) */
export function quantileSorted(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  if (p <= 0) return arr[0];
  if (p >= 1) return arr[arr.length - 1];
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (hi === lo) return arr[lo];
  const w = idx - lo;
  return arr[lo] + w * (arr[hi] - arr[lo]);
}
export function quantile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return quantileSorted(sorted, p);
}

/** ---------------------------------
 *  PARAMETER-ABLEITUNG (UNCHANGED)
 *  --------------------------------- */
export function getSimulationParams(strategy: string): SimulationParameters {
  const strategyParams = strategy === 'dynamisch' ? SIMULATION_PARAMS.dynamisch : SIMULATION_PARAMS.ausgewogen;
  // Netto-Jahresrendite nach TER
  const annualReturnNet = Math.max(0, strategyParams.annualReturn - SIMULATION_PARAMS.productCosts);
  const monthlyReturn = Math.pow(1 + annualReturnNet, 1/12) - 1;      // Effektivzins pro Monat

  return {
    monthlyReturn,
    volatility: strategyParams.volatility / Math.sqrt(12), // monatliche σ
    inflationRate: SIMULATION_PARAMS.inflationRate,
    productCosts: SIMULATION_PARAMS.productCosts,
    simulations: SIMULATION_PARAMS.simulations,
  };
}

/** ---------------------------------
 *  MONTE-CARLO (Worker bleibt)
 *  --------------------------------- */
export function runMonteCarloSimulation(
  inputs: CalculatorInputs,
  params: SimulationParameters
): Promise<CalculationResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./monte-carlo.worker.ts', import.meta.url), { type: 'module' });
    worker.postMessage({ inputs: { ...inputs, goals: inputs.goals || [], capitalInflows: inputs.capitalInflows || [] }, params });
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(e.message || 'Worker error'));
      worker.terminate();
    };
  });
}

/** ---------------------------------
 *  ENTNAHME-RECHNER (Fix: Konsistenz)
 *  --------------------------------- */
export function calculateWithdrawal(
  startingCapital: number,
  strategy: '4percent' | 'maximum' | 'custom',
  startAge: number,
  endAge: number,
  inflationAdjusted: boolean,
  // NEU (optional): Strategie & Sim-Params durchreichen für Konsistenz
  portfolio: Strategy = 'dynamisch',
  simParams?: SimulationParameters,
  accumYears?: number,
  customMonthlyAmount?: number
): WithdrawalResult {

  // Erwartungswert (deterministisch) – jetzt konsistent mit Portfolio (NETTO nach TER)
  function calculateExpectedValue(capital: number, start: number, end: number): number {
    const years = end - start;
    const { net } = getAnnualParamsForStrategy(portfolio);
    return capital * Math.pow(1 + net, years);
  }
  const expectedValue = Math.round(calculateExpectedValue(startingCapital, startAge, endAge));

  const years = endAge - startAge;
  const months = years * 12;

  let monthlyAmount: number;
  if (strategy === '4percent') {
    // 4%-Regel (Startkapital * 4% / 12), Inflationsanpassung findet in der Timeline statt
    monthlyAmount = startingCapital * 0.04 / 12;
  } else if (strategy === 'custom') {
    // Individuell: exakt der eingegebene Betrag, Fallback auf 0
    const raw = typeof customMonthlyAmount === 'number' ? customMonthlyAmount : 0;
    monthlyAmount = raw > 0 ? raw : 0;
  } else {
    // Maximum sustainable: PMT auf Basis der NETTO-Rendite des gewählten Portfolios
    monthlyAmount = calculateMaximumWithdrawal(startingCapital, months, false, portfolio);
  }

  // Nominaler konstanter Monatsbetrag ist monthlyAmount.
  // Anzeige-Wert inflationsbereinigt (heutige Kaufkraft) über ANSPAR-Dauer abzinsen:
  let displayMonthlyAmount = monthlyAmount;
  if (inflationAdjusted && accumYears && accumYears > 0) {
    const discount = Math.pow(1 + SIMULATION_PARAMS.inflationRate, accumYears);
    displayMonthlyAmount = monthlyAmount / discount;
  }

  const timeline = generateWithdrawalTimeline(
    startingCapital,
    monthlyAmount,
    startAge,
    endAge,
    inflationAdjusted,
    portfolio,                      // <<< STRATEGIE EXPLIZIT
    simParams                       // <<< (optional) simulations/inflation übernehmen
  );

  if (strategy === 'custom') {
    // Für Individuell: displayMonthlyAmount (inflationsbereinigt wenn aktiv) ohne Runden anzeigen
    // customMonthlyAmount enthält den originalen Nutzerbetrag (nominal, für das Input-Feld)
    return {
      monthlyAmount: displayMonthlyAmount,
      annualAmount: displayMonthlyAmount * 12,
      totalWithdrawn: displayMonthlyAmount * months,
      timeline,
      strategy,
      customMonthlyAmount: monthlyAmount, // nominaler Nutzerbetrag für Wiederherstellung des Input-Felds
      startAge,
      endAge,
      expectedValue,
    };
  }

  return {
    monthlyAmount: Math.round(displayMonthlyAmount),     // Anzeige
    annualAmount: Math.round(displayMonthlyAmount * 12), // Anzeige
    totalWithdrawn: Math.round(displayMonthlyAmount * months), // Anzeige
    timeline, // Timeline bleibt nominal, mit konstantem Entnahmebetrag
    strategy,
    startAge,
    endAge,
    expectedValue,
  };
}

/** PMT-basierte maximale Entnahme – median-konsistent */
function calculateMaximumWithdrawal(
  startingCapital: number,
  months: number,
  inflationAdjusted: boolean, // ungenutzt – Entnahme ist immer nominal konstant
  portfolio: Strategy
): number {
  const { net, sigma } = getAnnualParamsForStrategy(portfolio);

  // annual sigma (p.a.)
  const sigma_annual = sigma;

  // Median-konsistente monatliche Log-Drift:
  // 12*m + 0.5*sigma_annual^2 = ln(1+net)
  const m_month = (Math.log(1 + net) - 0.5 * sigma_annual * sigma_annual) / 12;
  const r_med_month = Math.exp(m_month) - 1; // Median-Monatsrendite

  // PMT mit dieser Monatsrendite
  return startingCapital * r_med_month / (1 - Math.pow(1 + r_med_month, -months));
}

/** ---------------------------------
 *  TIMELINE SIMULATION (Fixes)
 *  ---------------------------------
 *  - Strategie explizit (kein if(volatility<=0.09)-Hack mehr)
 *  - Lognormal mit korrekter Netto-Drift
 *  - Robuste Quantile
 *  - Kein „0€-Einbruch" durch falsches Mischen von Annahmen
 */
function generateWithdrawalTimeline(
  startingCapital: number,
  monthlyWithdrawal: number,
  startAge: number,
  endAge: number,
  inflationAdjusted: boolean,
  portfolio: Strategy = 'dynamisch',
  simParams?: SimulationParameters
): WithdrawalTimelinePoint[] {
  const timeline: WithdrawalTimelinePoint[] = [];

  // Simulationseinstellungen
  const simulations = simParams?.simulations ?? SIMULATION_PARAMS.simulations ?? 2000;
  const inflationRate = simParams?.inflationRate ?? SIMULATION_PARAMS.inflationRate;

  const { net, sigma } = getAnnualParamsForStrategy(portfolio);
  const sigma_annual = sigma;
  const stepsPerYear = 12;

  // Korrektes Mapping: effektive Jahresrendite -> monatliche Log-Drift
  // 12*m + 0.5*sigma_annual^2 = ln(1+net)
  const mu_log_m = (Math.log(1 + net) - 0.5 * sigma_annual * sigma_annual) / stepsPerYear;
  const sigma_m  = sigma_annual / Math.sqrt(stepsPerYear);

  // Pfad-Simulation je Jahr (mit monatlichen Schritten)
  const yearlyResults: number[][] = [];
  for (let sim = 0; sim < simulations; sim++) {
    const yearResults: number[] = [];
    let capital = startingCapital;
    let inflationFactorYear = 1;

    for (let age = startAge; age <= endAge; age++) {
      if (age > startAge) inflationFactorYear *= (1 + inflationRate);

      // Monats-Entnahme in diesem Jahr (immer konstant nominal)
      const monthlyDraw = monthlyWithdrawal; // immer konstant nominal

      for (let m = 0; m < 12; m++) {
        // Lognormaler Monatsfaktor (TER via net bereits in mu_log_m enthalten)
        const z = jStat.normal.sample(mu_log_m, sigma_m);
        const factor = Math.exp(z);
        capital = capital * factor - monthlyDraw;
        if (capital < 0) { capital = 0; } // Kein negatives Kapital
      }

      yearResults.push(capital);
    }
    yearlyResults.push(yearResults);
  }

  // Quantile je Jahr berechnen
  let cumWithdrawn = 0;
  let inflationFactorYear = 1;
  const totalYears = endAge - startAge;

  for (let y = 0; y < totalYears; y++) {
    const age = startAge + y + 1;
    const year = new Date().getFullYear() + y + 1;

    // kumulierte Entnahme (nur Anzeige) – IMMER konstant nominal
    const annualDraw = monthlyWithdrawal * 12;
    cumWithdrawn += annualDraw;

    const valuesThisYear = yearlyResults.map(sim => sim[y]);
    const med  = quantile(valuesThisYear, 0.50);
    const q05  = quantile(valuesThisYear, 0.05);
    const q95  = quantile(valuesThisYear, 0.95);

    timeline.push({
      age,
      year,
      median: Math.round(med),
      worstCase: Math.round(q05),
      bestCase: Math.round(q95),
      withdrawn: Math.round(cumWithdrawn),
    });
  }

  return timeline;
}

/** ---------------------------------
 *  FORMAT-Helfer (UNCHANGED)
 *  --------------------------------- */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('de-AT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** ---------------------------------
 *  GOALS (UNCHANGED)
 *  --------------------------------- */
export function applyGoalsToTimeline(
  timeline: TimelinePoint[],
  goals: Goal[],
  currentYear: number
): TimelinePoint[] {
  if (!goals || !goals.length) return timeline;

  const modifiedTimeline = [...timeline];

  goals.forEach(goal => {
    const targetYear = goal.year;
    const timelineIndex = modifiedTimeline.findIndex(point => point.year >= targetYear);

    if (timelineIndex !== -1 && timelineIndex > 0) {
      for (let i = timelineIndex; i < modifiedTimeline.length; i++) {
        modifiedTimeline[i].median    = Math.max(0, modifiedTimeline[i].median    - goal.amount);
        modifiedTimeline[i].worstCase = Math.max(0, modifiedTimeline[i].worstCase - goal.amount);
        modifiedTimeline[i].bestCase  = Math.max(0, modifiedTimeline[i].bestCase  - goal.amount);
      }
    }
  });

  return modifiedTimeline;
}