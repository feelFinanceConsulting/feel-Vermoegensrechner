import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WithdrawalResult, CalculatorInputs } from "@/types/calculator";
import { formatCurrency, formatNumber } from "@/lib/financial-calculations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart, Tooltip } from 'recharts';
import { Wallet, RefreshCw } from "lucide-react";
import PercentilenInfoButton from "@/components/perzentilen-info-button";

interface WithdrawalPlanningProps {
  result: WithdrawalResult;
  startingCapital: number;
  inputs: CalculatorInputs;
  onStrategyChange: (strategy: '4percent' | 'maximum' | 'custom', startAge: number, endAge: number, customMonthlyAmount?: number) => void;
  onStartAgeChange?: (newStartAge: number) => void;
  onChartRef?: (el: HTMLElement | null) => void;
}

export default function WithdrawalPlanning({ 
  result, 
  startingCapital, 
  inputs,
  onStrategyChange,
  onStartAgeChange,
  onChartRef,
}: WithdrawalPlanningProps) {
  const [strategy, setStrategy] = useState<'4percent' | 'maximum' | 'custom'>(result.strategy || '4percent');
  const [startAge, setStartAge] = useState(result.startAge || inputs.targetAge);
  const [endAge, setEndAge] = useState(result.endAge || 90);
  const [dirty, setDirty] = useState(false);
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<number>(result.customMonthlyAmount || 0);

  const prevTargetAgeRef = useRef(inputs.targetAge);
  useEffect(() => {
    if (inputs.targetAge !== prevTargetAgeRef.current) {
      setStartAge(inputs.targetAge);
      prevTargetAgeRef.current = inputs.targetAge;
      setDirty(true);
    }
  }, [inputs.targetAge]);

  useEffect(() => {
    if (!Number.isFinite(startAge)) {
      setStartAge(inputs.targetAge);
    }
  }, [inputs.targetAge, startAge]);

  const handleStrategyChange = (newStrategy: string) => {
    const strategyValue = newStrategy as '4percent' | 'maximum' | 'custom';
    setStrategy(strategyValue);
    setDirty(true);
  };

  const handleStartAgeChange = (value: number) => {
    setStartAge(value);
    setDirty(true);
    if (!isNaN(value) && onStartAgeChange) {
      onStartAgeChange(value);
    }
  };

  const handleRecalculate = () => {
    const safeStartAge = isNaN(startAge) ? inputs.targetAge : startAge;
    const safeEndAge = isNaN(endAge) ? 90 : endAge;
    const safeCustomAmount = strategy === 'custom' ? (customMonthlyAmount > 0 ? customMonthlyAmount : 0) : undefined;
    onStrategyChange(strategy, safeStartAge, safeEndAge, safeCustomAmount);
    setDirty(false);
  };

  const chartData = result.timeline.map(point => ({
    age: point.age,
    median: Math.round(point.median),
    worstCase: Math.round(Math.max(0, point.worstCase)),
    bestCase: Math.round(point.bestCase),
    withdrawn: Math.round(point.withdrawn),
  }));

  const displayStartAge = isNaN(startAge) ? '' : startAge;
  const displayEndAge = isNaN(endAge) ? '' : endAge;
  const effectiveEndAge = isNaN(endAge) ? 90 : endAge;
  const effectiveStartAge = isNaN(startAge) ? inputs.targetAge : startAge;

  return (
    <Card className="bg-white shadow-lg border border-gray-100">
      <CardContent className="p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center font-gilroy">
          <Wallet className="w-6 h-6 mr-3 text-ff-primary" />
          Entnahmeplanung
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Entnahmestrategie</label>
          <RadioGroup
            value={strategy}
            onValueChange={handleStrategyChange}
            className="grid sm:grid-cols-3 gap-3"
          >
            <div className="relative">
              <RadioGroupItem value="4percent" id="4percent" className="absolute opacity-0 peer" />
              <label
                htmlFor="4percent"
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block ${
                  strategy === '4percent' 
                    ? 'border-ff-primary bg-orange-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleStrategyChange('4percent')}
              >
                <h3 className="font-medium text-gray-900">4%-Regel</h3>
                <p className="text-sm text-gray-600">Klassische Entnahme</p>
              </label>
            </div>
            
            <div className="relative">
              <RadioGroupItem value="maximum" id="maximum" className="absolute opacity-0 peer" />
              <label
                htmlFor="maximum"
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block ${
                  strategy === 'maximum' 
                    ? 'border-ff-primary bg-orange-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleStrategyChange('maximum')}
              >
                <h3 className="font-medium text-gray-900">Maximum</h3>
                <p className="text-sm text-gray-600">Bis zum Endalter</p>
              </label>
            </div>

            <div className="relative">
              <RadioGroupItem value="custom" id="custom" className="absolute opacity-0 peer" />
              <label
                htmlFor="custom"
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block ${
                  strategy === 'custom' 
                    ? 'border-ff-primary bg-orange-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleStrategyChange('custom')}
              >
                <h3 className="font-medium text-gray-900">Individuell</h3>
                <p className="text-sm text-gray-600">Individuelle Entnahme</p>
              </label>
            </div>
          </RadioGroup>

          {strategy === 'custom' && (
            <div className="mt-4">
              <label htmlFor="custom-monthly-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Monatlicher Entnahmebetrag (€)
              </label>
              <Input
                id="custom-monthly-amount"
                type="number"
                value={customMonthlyAmount > 0 ? customMonthlyAmount : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const parsed = raw === '' ? 0 : parseFloat(raw);
                  const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                  setCustomMonthlyAmount(safe);
                  setDirty(true);
                }}
                onWheel={(e) => e.currentTarget.blur()}
                min="0"
                placeholder="z.B. 2000"
                className="focus:ring-ff-primary focus:border-ff-primary"
              />
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="withdrawal-start-age" className="block text-sm font-medium text-gray-700 mb-2">
              Entnahme-Startalter
            </label>
            <Input
              id="withdrawal-start-age"
              type="number"
              value={displayStartAge}
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === '' ? NaN : parseInt(raw);
                handleStartAgeChange(parsed);
              }}
              onWheel={(e) => e.currentTarget.blur()}
              min="30"
              max="99"
              className="focus:ring-ff-primary focus:border-ff-primary"
            />
          </div>
          <div>
            <label htmlFor="withdrawal-end-age" className="block text-sm font-medium text-gray-700 mb-2">
              Entnahme-Endalter
            </label>
            <Input
              id="withdrawal-end-age"
              type="number"
              value={displayEndAge}
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === '' ? NaN : parseInt(raw);
                setEndAge(parsed);
                setDirty(true);
              }}
              onWheel={(e) => e.currentTarget.blur()}
              min="60"
              max="120"
              className="focus:ring-ff-primary focus:border-ff-primary"
            />
          </div>
        </div>

        {dirty && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-amber-800 font-medium">Du hast Werte geändert – bitte neu berechnen</p>
            <Button 
              onClick={handleRecalculate}
              className="bg-ff-primary hover:bg-orange-600 text-white ml-4"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Neu berechnen
            </Button>
          </div>
        )}

        <Card className="ff-light mb-6">
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">Monatliche Entnahme</h3>
            <div className="text-center">
              <p className="text-3xl font-bold text-ff-primary mb-2">
                {formatCurrency(result.monthlyAmount)}
              </p>
              <p className="text-sm text-gray-600">
                pro Monat über {effectiveEndAge - effectiveStartAge} Jahre
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Jährliche Entnahme:</span>
                <span className="font-medium">{formatCurrency(result.annualAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gesamt entnommen:</span>
                <span className="font-medium">{formatCurrency(result.totalWithdrawn)}</span>
              </div>
            </div>
            
            {inputs.inflationAdjusted && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis:</strong> Die angezeigten Entnahmebeträge sind auf heutige Kaufkraft umgerechnet
                  (Abzinsung mit ca. 2,5% p.a. über die Ansparzeit). Die Entnahme selbst bleibt nominal konstant.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Kapitalverlauf während Entnahme</h3>
              <PercentilenInfoButton />
            </div>
            <div className="relative min-w-0" ref={(el) => { if (onChartRef) onChartRef(el); }}>
              {dirty && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-lg">
                  <p className="text-gray-700 font-medium mb-3">Werte geändert – bitte neu berechnen</p>
                  <Button onClick={handleRecalculate} className="bg-ff-primary hover:bg-orange-600 text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Neu berechnen
                  </Button>
                </div>
              )}
              <div className={`h-96 sm:h-80 w-full min-w-0 ${dirty ? 'opacity-40' : ''}`}>
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
                        name === 'median' ? 'Median' :
                        name === 'bestCase' ? 'Best Case (95. Perzentil)' :
                        name === 'worstCase' ? 'Worst Case (95% Wahrscheinlichkeit)' :
                        name === 'withdrawn' ? 'Kumulativ entnommen' : name
                      ]}
                      labelFormatter={(label) => `Alter: ${label} Jahre`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <defs>
                      <linearGradient id="confidenceAreaWithdrawal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="bestCase"
                      stroke="transparent"
                      fill="url(#confidenceAreaWithdrawal)"
                      strokeWidth={0}
                      fillOpacity={0.2}
                    />
                    <Area
                      dataKey="worstCase"
                      stroke="transparent"
                      fill="transparent"
                      strokeWidth={0}
                    />
                    <Line
                      type="monotone"
                      dataKey="median"
                      stroke="#ee8246"
                      strokeWidth={3}
                      dot={false}
                      name="Median"
                    />
                    <Line
                      type="monotone"
                      dataKey="bestCase"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Best Case (95. Perzentil)"
                    />
                    <Line
                      type="monotone"
                      dataKey="worstCase"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Worst Case (5. Perzentil)"
                    />
                    <Line
                      type="monotone"
                      dataKey="withdrawn"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Kumulativ entnommen"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-ff-primary rounded mr-2"></div>
                <span>Erwartete Entwicklung</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span>Best Case (95. Perzentil)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span>Worst Case (5. Perzentil)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
