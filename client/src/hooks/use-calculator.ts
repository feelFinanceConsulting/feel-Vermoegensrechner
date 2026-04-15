import { useEffect, useState } from "react";
import { CalculatorInputs, CalculationResult, WithdrawalResult } from "@/types/calculator";
import { runMonteCarloSimulation, getSimulationParams, calculateWithdrawal } from "@/lib/financial-calculations";
import { trackCalculatorView, trackResultGenerated } from "@/lib/analytics";

const toValidInt = (value: unknown, fallback: number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
};

export function useCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    currentAge: 25,
    targetAge: 65,
    monthlyAmount: 0,
    oneTimeAmount: 10000,
    annualIncrease: 0,
    strategy: "ausgewogen",
    inflationAdjusted: false,
    goals: [],
    capitalInflows: [],
  });

  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawalResult | null>(null);
  const [expectedValue, setExpectedValue] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [savingsDirty, setSavingsDirty] = useState(false);
  const [withdrawalStrategy, setWithdrawalStrategy] = useState<"4percent" | "maximum" | "custom">("4percent");
  const [withdrawalStartAge, setWithdrawalStartAge] = useState(65);
  const [withdrawalEndAge, setWithdrawalEndAge] = useState(90);
  const [withdrawalCustomMonthlyAmount, setWithdrawalCustomMonthlyAmount] = useState<number>(0);

  useEffect(() => {
    trackCalculatorView();
  }, []);

  const handleInputsChange = (newInputs: CalculatorInputs) => {
    setInputs((prev) => {
      const nextCurrentAge = toValidInt(newInputs.currentAge, prev.currentAge);
      const nextTargetAge = toValidInt(newInputs.targetAge, prev.targetAge);
      const targetAgeChanged = nextTargetAge !== prev.targetAge;

      const merged: CalculatorInputs = {
        ...prev,
        ...newInputs,
        currentAge: nextCurrentAge,
        targetAge: nextTargetAge,
        goals: newInputs.goals || prev.goals || [],
        capitalInflows: newInputs.capitalInflows || prev.capitalInflows || [],
      };

      if (targetAgeChanged) {
        setWithdrawalStartAge(nextTargetAge);
      }

      return merged;
    });
    if (calculationResult) {
      setSavingsDirty(true);
    }
  };

  const handleWithdrawalStartAgeChange = (newStartAge: number) => {
    const safeAge = toValidInt(newStartAge, withdrawalStartAge);
    setWithdrawalStartAge(safeAge);
    if (safeAge !== inputs.targetAge) {
      setInputs((prev) => ({ ...prev, targetAge: safeAge }));
      if (calculationResult) {
        setSavingsDirty(true);
      }
    }
  };

  const handleCalculate = async (overrideInputs?: CalculatorInputs) => {
    if (isCalculating) return;
    const rawInputs = overrideInputs || inputs;
    const calcInputs: CalculatorInputs = {
      ...rawInputs,
      currentAge: toValidInt(rawInputs.currentAge, 25),
      targetAge: toValidInt(rawInputs.targetAge, 65),
      monthlyAmount: Number.isFinite(rawInputs.monthlyAmount) ? rawInputs.monthlyAmount : 0,
      oneTimeAmount: Number.isFinite(rawInputs.oneTimeAmount) ? rawInputs.oneTimeAmount : 0,
      annualIncrease: Number.isFinite(rawInputs.annualIncrease) ? rawInputs.annualIncrease : 0,
      goals: rawInputs.goals || [],
      capitalInflows: rawInputs.capitalInflows || [],
    };

    if (calcInputs.targetAge <= calcInputs.currentAge) {
      console.warn("Invalid ages:", { currentAge: calcInputs.currentAge, targetAge: calcInputs.targetAge });
      return;
    }

    if (overrideInputs) {
      setInputs(calcInputs);
    }
    setSavingsDirty(false);
    setIsCalculating(true);

    try {
      const params = getSimulationParams(calcInputs.strategy);
      const result = await runMonteCarloSimulation(calcInputs, params);

      if (calcInputs.inflationAdjusted) {
        const inflationFactor = Math.pow(1.025, calcInputs.targetAge - calcInputs.currentAge);
        result.median /= inflationFactor;
        result.worstCase /= inflationFactor;
        result.bestCase /= inflationFactor;
        result.timeline.forEach((point) => {
          const yearInflation = Math.pow(1.025, point.age - calcInputs.currentAge);
          point.median /= yearInflation;
          point.worstCase /= yearInflation;
          point.bestCase /= yearInflation;
        });
      }

      setCalculationResult(result);

      const years = calcInputs.targetAge - calcInputs.currentAge;
      const TER = 0.0099;
      let expectedRate;
      if (calcInputs.strategy === "ausgewogen") {
        expectedRate = 0.05 - TER;
      } else {
        expectedRate = 0.07 - TER;
      }
      const expectedMonthly = Math.pow(1 + expectedRate, 1 / 12) - 1;

      let calculatedExpectedValue = calcInputs.oneTimeAmount;
      for (let m = 1; m <= years * 12; m++) {
        const yIdx = Math.floor((m - 1) / 12);
        const monthlyAmount = calcInputs.monthlyAmount * Math.pow(1 + calcInputs.annualIncrease / 100, yIdx);
        calculatedExpectedValue += monthlyAmount;
        calculatedExpectedValue *= 1 + expectedMonthly;
        if (m % 12 === 0) {
          const currentYear = new Date().getFullYear() + yIdx;
          const goalWithdrawals = calcInputs.goals
            .filter((goal) => goal.year === currentYear)
            .reduce((sum, goal) => sum + goal.amount, 0);
          calculatedExpectedValue = Math.max(0, calculatedExpectedValue - goalWithdrawals);
          const inflowSum = (calcInputs.capitalInflows || [])
            .filter((inflow) => inflow.year === currentYear)
            .reduce((sum, inflow) => sum + inflow.amount, 0);
          calculatedExpectedValue += inflowSum;
        }
      }

      setExpectedValue(calculatedExpectedValue);

      const portfolioStrategy = calcInputs.strategy as "ausgewogen" | "dynamisch";
      const effectiveStartAge = calcInputs.targetAge;
      setWithdrawalStartAge(effectiveStartAge);
      const withdrawal = calculateWithdrawal(
        calculatedExpectedValue,
        withdrawalStrategy,
        effectiveStartAge,
        withdrawalEndAge,
        calcInputs.inflationAdjusted,
        portfolioStrategy,
        undefined,
        calcInputs.targetAge - calcInputs.currentAge,
        withdrawalCustomMonthlyAmount
      );
      setWithdrawalResult(withdrawal);

      trackResultGenerated(calcInputs, result);
    } catch (error: any) {
      console.error("Calculation error:", error?.message || error);
    } finally {
      setIsCalculating(false);
    }
  };

  return {
    inputs,
    calculationResult,
    withdrawalResult,
    expectedValue,
    isCalculating,
    savingsDirty,
    withdrawalStrategy,
    withdrawalStartAge,
    withdrawalEndAge,
    withdrawalCustomMonthlyAmount,
    handleInputsChange,
    handleWithdrawalStartAgeChange,
    handleCalculate,
    setWithdrawalStrategy,
    setWithdrawalStartAge,
    setWithdrawalEndAge,
    setWithdrawalResult,
    setWithdrawalCustomMonthlyAmount,
  };
}
