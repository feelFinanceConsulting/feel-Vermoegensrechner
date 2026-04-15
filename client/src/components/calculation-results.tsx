import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PercentilenInfoButton from "@/components/perzentilen-info-button";
import { CalculatorInputs, CalculationResult } from "@/types/calculator";
import {
  formatCurrency,
  formatNumber,
} from "@/lib/financial-calculations";
import { trackLeadClick } from "@/lib/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
} from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";

// ---- Hilfsfunktionen für p.a.-Ermittlung in der Worst-Case-Kachel ----

// CAGR aus Startwert -> Endwert über Jahre
function calcCAGR(
  startValue: number,
  endValue: number,
  years: number,
): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  const cagr = Math.pow(endValue / startValue, 1 / years) - 1;
  return isFinite(cagr) ? cagr : null;
}

// Robuste IRR (monatlich) via Newton-Raphson mit Bisection-Fallback, annualisiert (p.a.)
function calcAnnualizedIRRFromMonthlyFlows(cashflows: number[]): number | null {
  // NPV(r) = sum_{t=0..N} CF_t / (1+r)^t
  const npv = (r: number) => {
    let v = 0;
    for (let t = 0; t < cashflows.length; t++) {
      v += cashflows[t] / Math.pow(1 + r, t);
    }
    return v;
  };
  const dnpv = (r: number) => {
    let v = 0;
    for (let t = 1; t < cashflows.length; t++) {
      v += (-t * cashflows[t]) / Math.pow(1 + r, t + 1);
    }
    return v;
  };

  // Erst Newton-Raphson
  let r = 0.003; // ~0.3% mtl Startwert (~3.7% p.a.)
  for (let i = 0; i < 50; i++) {
    const f = npv(r);
    const df = dnpv(r);
    if (Math.abs(df) < 1e-12) break;
    const step = f / df;
    r -= step;
    if (!isFinite(r)) break;
    if (Math.abs(step) < 1e-10) break;
  }
  if (isFinite(r) && r > -0.99 && r < 1.0 && Math.abs(npv(r)) < 1e-6) {
    const annual = Math.pow(1 + r, 12) - 1;
    return isFinite(annual) ? annual : null;
  }

  // Fallback: Bisection in plausiblen Grenzen (mtl -99% .. +100%)
  let lo = -0.99,
    hi = 1.0;
  let fLo = npv(lo),
    fHi = npv(hi);
  if (isNaN(fLo) || isNaN(fHi)) return null;

  // Wenn kein Vorzeichenwechsel, versuch Grenzen zu erweitern (rudimentär)
  if (fLo * fHi > 0) {
    // Kein garantierter Root; IRR evtl. nicht definiert
    return null;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-8 || hi - lo < 1e-8) {
      const annual = Math.pow(1 + mid, 12) - 1;
      return isFinite(annual) ? annual : null;
    }
    if (fLo * fMid <= 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  const mid = (lo + hi) / 2;
  const annual = Math.pow(1 + mid, 12) - 1;
  return isFinite(annual) ? annual : null;
}

interface CalculationResultsProps {
  inputs: CalculatorInputs;
  result: CalculationResult;
  onConsultationClick: () => void;
  isDirty?: boolean;
  isCalculating?: boolean;
  onRecalculate?: () => void;
  withdrawalResult?: import("@/types/calculator").WithdrawalResult;
  withdrawalChartEl?: HTMLElement | null;
  onWealthChartRef?: (el: HTMLDivElement | null) => void;
}

export default function CalculationResults({
  inputs,
  result,
  onConsultationClick,
  isDirty,
  isCalculating,
  onRecalculate,
  withdrawalResult,
  withdrawalChartEl,
  onWealthChartRef,
}: CalculationResultsProps) {
  const wealthChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onWealthChartRef?.(wealthChartRef.current);
    return () => { onWealthChartRef?.(null); };
  }, []);

  const handleConsultationClick = () => {
    trackLeadClick("results_section");
    onConsultationClick();
  };

  // Calculate the 4 specific scenarios as per requirements
  const calculateScenarios = () => {
    const years = inputs.targetAge - inputs.currentAge;
    const months = years * 12;
    const TER = 0.0099; // 0.99% p.a. product costs

    // Strategy-specific scenario parameters (all net after TER)
    let optimisticRate, expectedRate, monteCarloBaseRate;

    if (inputs.strategy === "ausgewogen") {
      // Ausgewogen: Optimistic 6% gross, Expected 5% gross
      optimisticRate = 0.06 - TER; // 5.01% p.a. net
      expectedRate = 0.05 - TER; // 4.01% p.a. net
      monteCarloBaseRate = 0.05 - TER; // 4.01% p.a. net for MC drift
    } else {
      // Dynamisch: Optimistic 9% gross, Expected 7% gross
      optimisticRate = 0.09 - TER; // 8.01% p.a. net
      expectedRate = 0.07 - TER; // 6.01% p.a. net
      monteCarloBaseRate = 0.07 - TER; // 6.01% p.a. net for MC drift
    }

    // Monthly effective rates for arithmetic scenarios
    const optimisticMonthly = Math.pow(1 + optimisticRate, 1 / 12) - 1;
    const expectedMonthly = Math.pow(1 + expectedRate, 1 / 12) - 1;

    const scenarios = [];

    for (let yearIndex = 0; yearIndex <= years; yearIndex++) {
      const month = yearIndex * 12;
      const age = inputs.currentAge + yearIndex;

      // Eingezahlt (unverzinst) - inflationsbereinigt wenn aktiviert
      let totalPaid = inputs.oneTimeAmount;
      for (let m = 1; m <= month; m++) {
        const yIdx = Math.floor((m - 1) / 12);
        const monthlyAmount =
          inputs.monthlyAmount *
          Math.pow(1 + inputs.annualIncrease / 100, yIdx);
        totalPaid += monthlyAmount;
      }

      // Bei inflationsbereinigt: totalPaid auf heutige Kaufkraft abzinsen
      let displayTotalPaid = totalPaid;
      if (inputs.inflationAdjusted && yearIndex > 0) {
        displayTotalPaid = totalPaid / Math.pow(1 + 0.025, yearIndex);
      }

      // Ziele (wie gehabt)
      let goalWithdrawals = 0;
      let inflowAdditions = 0;
      for (let y = 0; y < yearIndex; y++) {
        const currentYear = new Date().getFullYear() + y;
        goalWithdrawals += (inputs.goals || [])
          .filter((goal) => goal.year === currentYear)
          .reduce((sum, goal) => sum + goal.amount, 0);
        inflowAdditions += (inputs.capitalInflows || [])
          .filter((inflow) => inflow.year === currentYear)
          .reduce((sum, inflow) => sum + inflow.amount, 0);
      }

      const calculateArithmeticScenario = (monthlyRate: number) => {
        let capital = inputs.oneTimeAmount;
        for (let m = 1; m <= month; m++) {
          const yIdx = Math.floor((m - 1) / 12);
          const monthlyAmount =
            inputs.monthlyAmount *
            Math.pow(1 + inputs.annualIncrease / 100, yIdx);
          capital += monthlyAmount; // vorschüssig
          capital *= 1 + monthlyRate; // Monatsrendite
          if (m % 12 === 0) {
            const currentYear = new Date().getFullYear() + yIdx;
            const gw = (inputs.goals || [])
              .filter((goal) => goal.year === currentYear)
              .reduce((sum, goal) => sum + goal.amount, 0);
            capital = Math.max(0, capital - gw);
            const inflows = (inputs.capitalInflows || [])
              .filter((inflow) => inflow.year === currentYear)
              .reduce((sum, inflow) => sum + inflow.amount, 0);
            capital += inflows;
          }
        }
        return capital;
      };

      // *** HIER: Worst-Case korrekt aus monatlicher Timeline ***
      let worstCaseValue = 0;

      if (yearIndex === 0) {
        worstCaseValue = Math.max(0, inputs.oneTimeAmount);
      } else {
        const idx = Math.min(result.timeline.length - 1, yearIndex * 12 - 1);
        worstCaseValue = Math.max(0, result.timeline[idx]?.worstCase ?? 0);
      }

      // Calculate scenarios - optimistic and expected real (deflated), worst case nominal
      let optimisticValue = calculateArithmeticScenario(optimisticMonthly);
      let expectedValue = calculateArithmeticScenario(expectedMonthly);

      // Apply inflation adjustment to optimistic and expected (real values in today's purchasing power)
      if (inputs.inflationAdjusted && yearIndex > 0) {
        const inflationFactor = Math.pow(1.025, yearIndex);
        optimisticValue /= inflationFactor;
        expectedValue /= inflationFactor;
      }

      scenarios.push({
        age,
        optimistic: Math.round(optimisticValue),
        expected: Math.round(expectedValue),
        worstCase: Math.round(worstCaseValue), // bleibt nominal
        totalPaid: Math.round(displayTotalPaid - goalWithdrawals + inflowAdditions),
      });
    }

    return scenarios;
  };

  const chartData = calculateScenarios();

  // Use expected scenario value for profit calculation and withdrawal planning
  const expectedEndValue =
    chartData[chartData.length - 1]?.expected || result.median;
  const expectedProfit = expectedEndValue - result.summary.totalPaid;

  // --- Nominale Cashflows für Worst-Case (Einzahlungen negativ, Endwert positiv) ---
  function buildNominalCashflowsForWorstCase(
    inputs: CalculatorInputs,
    endValue: number,
  ): number[] {
    const years = inputs.targetAge - inputs.currentAge;
    const months = years * 12;
    const cfs: number[] = [];

    // t=0: Einmalbetrag nominal -> negativ
    cfs.push(-(inputs.oneTimeAmount || 0));

    // t=1..months: monatliche Einzahlungen nominal -> negativ
    for (let m = 1; m <= months; m++) {
      const yIdx = Math.floor((m - 1) / 12);
      const monthly =
        (inputs.monthlyAmount || 0) *
        Math.pow(1 + (inputs.annualIncrease || 0) / 100, yIdx);
      cfs.push(-monthly);
    }

    // Letzte Periode: Endwert nominal -> positiv addieren
    cfs[cfs.length - 1] += Math.max(0, endValue);
    return cfs;
  }

  // --- Robuste IRR (monatlich) via Bisektion mit adaptivem Bracketing, annualisiert ---
  function irrMonthlyBisection(
    cashflows: number[],
    maxIter = 120,
    tol = 1e-9,
  ): number | null {
    // NPV(r) = sum_t CF_t / (1+r)^t
    const npv = (r: number) => {
      let v = 0;
      for (let t = 0; t < cashflows.length; t++) {
        v += cashflows[t] / Math.pow(1 + r, t);
      }
      return v;
    };

    // Startintervall (mtl. Rendite): [-95%, +50%]
    let lo = -0.95,
      hi = 0.5;
    let fLo = npv(lo),
      fHi = npv(hi);

    // Adaptives Bracketing bis max. 10 Versuche
    let expandSteps = 0;
    while (fLo * fHi > 0 && expandSteps < 10) {
      if (Math.abs(fHi) < Math.abs(fLo) && hi < 1.0) {
        hi = Math.min(1.0, hi + 0.25);
        fHi = npv(hi);
      } else {
        lo = Math.max(-0.99, lo - 0.02);
        fLo = npv(lo);
      }
      expandSteps++;
    }

    // Kein Vorzeichenwechsel => keine eindeutige IRR
    if (fLo * fHi > 0) return null;

    for (let i = 0; i < maxIter; i++) {
      const mid = 0.5 * (lo + hi);
      const fMid = npv(mid);

      if (!isFinite(fMid)) {
        hi = mid;
        continue;
      }
      if (Math.abs(fMid) < tol) return mid;

      if (fLo * fMid <= 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }

    // Best Effort, falls nicht konvergiert
    return 0.5 * (lo + hi);
  }

  // --- Einfache CAGR als Fallback (nominal) ---
  function cagrFallbackNominal(
    endValue: number,
    totalPaidNominal: number,
    years: number,
  ): number | null {
    if (years <= 0 || endValue <= 0 || totalPaidNominal <= 0) return null;
    const cagr = Math.pow(endValue / totalPaidNominal, 1 / years) - 1;
    return isFinite(cagr) ? cagr : null;
  }

  const formatPct = (x: number | null) =>
    x === null ? "–" : `${(x * 100).toFixed(2)}% p.a.`;

  // === Worst-Case p.a. Rendite (IMMER NOMINAL) ===
  const yearsTotal = inputs.targetAge - inputs.currentAge;
  const worstEndValueNominal =
    chartData[chartData.length - 1]?.worstCase ?? result.worstCase;

  let irrPaToDisplay: number | null = null;

  if (yearsTotal > 0 && worstEndValueNominal > 0) {
    // Baue nominale Cashflows
    const cfsNom = buildNominalCashflowsForWorstCase(
      inputs,
      worstEndValueNominal,
    );

    // Versuche robuste monatliche IRR via Bisektion
    const irrMonthly = irrMonthlyBisection(cfsNom);

    if (
      irrMonthly !== null &&
      isFinite(irrMonthly) &&
      irrMonthly > -0.99 &&
      irrMonthly < 1.0
    ) {
      irrPaToDisplay = Math.pow(1 + irrMonthly, 12) - 1; // Annualisieren
    } else {
      // Fallback: nominale CAGR auf Summe nominaler Einzahlungen
      const totalNominalPaid = cfsNom.reduce(
        (sum, cf) => (cf < 0 ? sum - cf : sum),
        0,
      );
      irrPaToDisplay = cagrFallbackNominal(
        worstEndValueNominal,
        totalNominalPaid,
        yearsTotal,
      );
    }
  }

  // === Jahre, Worst-Case Endwert & p.a.-Text ===
  const years = inputs.targetAge - inputs.currentAge;
  const worstEndValue =
    chartData[chartData.length - 1]?.worstCase ?? result.worstCase;

  let worstCasePaText = "";
  if (years > 0 && worstEndValue > 0) {
    // Für IRR-Berechnung: Reale Einzahlungen verwenden wenn inflationsbereinigt
    const totalPaidForIRR = inputs.inflationAdjusted
      ? chartData[chartData.length - 1]?.totalPaid // bereits real abgezinst in chartData
      : result.summary.totalPaid; // nominal
    if ((inputs.monthlyAmount ?? 0) <= 0) {
      // Einmalanlage: CAGR
      const cagr = calcCAGR(inputs.oneTimeAmount, worstEndValue, years);
      if (cagr !== null) {
        worstCasePaText = `entspricht ca. ${(cagr * 100).toFixed(2)}% p.a.`;
      }
    } else {
      // Laufende Raten: IRR (monatliche CFs, Endwert positiv)
      const months = years * 12;
      const cf: number[] = [];
      // Cashflows mit realen Einzahlungen bei inflationsbereinigt
      // t=0: Einmalbetrag als Einzahlung (negativ)
      cf.push(-(inputs.oneTimeAmount || 0));
      for (let m = 1; m <= months; m++) {
        const yIdx = Math.floor((m - 1) / 12);
        let monthlyAmt =
          (inputs.monthlyAmount || 0) *
          Math.pow(1 + (inputs.annualIncrease || 0) / 100, yIdx);

        // Bei inflationsbereinigt: Einzahlung auf heutige Kaufkraft abzinsen
        if (inputs.inflationAdjusted && m > 0) {
          const yearsFromStart = m / 12;
          monthlyAmt = monthlyAmt / Math.pow(1 + 0.025, yearsFromStart);
        }

        // Einzahlungen sind negativ
        cf.push(-monthlyAmt);
      }
      // Terminalwert am Ende positiv
      cf[cf.length - 1] += worstEndValue;

      const irrAnn = calcAnnualizedIRRFromMonthlyFlows(cf);
      if (irrAnn !== null) {
        worstCasePaText = `entspricht ca. ${(irrAnn * 100).toFixed(2)}% p.a.`;
      } else {
        // Fallback: CAGR auf Summe der Einzahlungen -> Endwert
        const totalIn = totalPaidForIRR;
        const cagrFallback = calcCAGR(totalIn, worstEndValue, years);
        if (cagrFallback !== null) {
          worstCasePaText = `entspricht ca. ${(cagrFallback * 100).toFixed(2)}% p.a.`;
        }
      }
    }
  }

  return (
    <Card className="bg-white shadow-lg border border-gray-100">
      <CardContent className="p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center font-gilroy">
          <TrendingUp className="w-6 h-6 mr-3 text-ff-primary" />
          Dein Vermögen mit {inputs.targetAge} Jahren
        </h2>

        {/* Key Results */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="text-sm font-medium text-red-700 mb-1">
              Worst Case (5. Perzentil)
            </h3>
            <p className="text-2xl font-bold text-red-800">
              {formatCurrency(result.worstCase)}
            </p>
            {!inputs.inflationAdjusted && !(inputs.goals?.length > 0) && !(inputs.capitalInflows?.length > 0) && (
              <p className="text-xs text-red-700 mt-1">
                entspricht ca. {formatPct(irrPaToDisplay)}
              </p>
            )}
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="text-sm font-medium text-ff-primary mb-1">
              Erwartetes Szenario
            </h3>
            <p className="text-2xl font-bold text-ff-primary">
              {formatCurrency(
                chartData[chartData.length - 1]?.expected || result.median,
              )}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-1">
              Optimistisches Szenario
            </h3>
            <p className="text-2xl font-bold text-green-800">
              {formatCurrency(
                chartData[chartData.length - 1]?.optimistic || result.bestCase,
              )}
            </p>
          </div>
        </div>

        {inputs.inflationAdjusted && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              Hinweis: Die errechneten Werte sind um ca. 2.5% p.a.
              inflationsbereinigt.
            </p>
          </div>
        )}

        {/* Investment Summary */}
        <Card className="bg-gray-50 mb-6">
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Deine Einzahlungen
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Einmalbetrag:</span>
                <span className="font-medium">
                  {formatCurrency(result.summary.oneTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sparrate gesamt:</span>
                <span className="font-medium">
                  {formatCurrency(result.summary.totalMonthly)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gesamt eingezahlt:</span>
                <span className="font-medium">
                  {formatCurrency(result.summary.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gewinn (erwartet):</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(expectedProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Container */}
        <Card className="bg-gray-50 mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">
                Vermögensentwicklung
              </h3>
              <PercentilenInfoButton variant="vermoegen" />
            </div>
            <div className="relative min-w-0" ref={wealthChartRef}>
              {isDirty && !isCalculating && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-lg">
                  <p className="text-gray-700 font-medium mb-3">Du hast Werte geändert – bitte neu berechnen</p>
                  <Button onClick={() => onRecalculate?.()} disabled={isCalculating} className="bg-ff-primary hover:bg-orange-600 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Neu berechnen
                  </Button>
                </div>
              )}
              {isCalculating && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-ff-primary border-t-transparent mb-3"></div>
                  <p className="text-gray-700 font-medium">Berechnung läuft...</p>
                </div>
              )}
            <div className={`h-96 sm:h-80 w-full min-w-0 ${isDirty || isCalculating ? 'opacity-40' : ''}`}>
              {(!chartData || chartData.length === 0) && !isCalculating ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>Keine Daten – bitte Eingaben prüfen und neu berechnen.</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}J`}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${formatNumber(value / 1000)}k€`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "optimistic"
                        ? "Optimistisches Szenario"
                        : name === "expected"
                          ? "Erwartetes Szenario"
                          : name === "worstCase"
                            ? "Worst Case (5% Wahrscheinlichkeit)"
                            : name === "totalPaid"
                              ? inputs.inflationAdjusted
                                ? "Einzahlung (Inflationsbereinigt)"
                                : "Eingezahlt"
                              : name,
                    ]}
                    labelFormatter={(label) => `Alter: ${label} Jahre`}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.75)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="optimistic"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Optimistisches Szenario"
                  />
                  <Line
                    type="monotone"
                    dataKey="expected"
                    stroke="#ee8246"
                    strokeWidth={3}
                    dot={false}
                    name="Erwartetes Szenario"
                  />
                  <Line
                    type="monotone"
                    dataKey="worstCase"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    name="Worst Case (5% Wahrscheinlichkeit)"
                  />
                  <Line
                    type="monotone"
                    dataKey="totalPaid"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={
                      inputs.inflationAdjusted
                        ? "Einzahlung (Inflationsbereinigt)"
                        : "Eingezahlt"
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className={`flex flex-wrap justify-center gap-4 mt-4 text-sm ${isDirty ? 'opacity-40' : ''}`}>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-ff-primary rounded mr-2"></div>
                <span>Erwartete Entwicklung</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span>Optimistisches Szenario</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span>Worst Case (5% Wahrscheinlichkeit)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
                <span>Eingezahlt</span>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

      </CardContent>
    </Card>
  );
}
