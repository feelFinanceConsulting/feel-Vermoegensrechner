import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import GoalsSection from "./goals-section";
import CapitalInflowsSection from "./capital-inflows-section";
import { CalculatorInputs } from "@/types/calculator";
import { ChevronRight } from "lucide-react";
import AnlagestrategieInfoButton from "./anlagestrategie-info-button";

const calculatorSchema = z.object({
  currentAge: z.preprocess((v) => (typeof v === 'number' && isNaN(v)) ? 25 : v, z.number().min(18).max(99)),
  targetAge: z.preprocess((v) => (typeof v === 'number' && isNaN(v)) ? 65 : v, z.number().min(30).max(99)),
  monthlyAmount: z.preprocess((v) => (typeof v === 'number' && isNaN(v)) ? 0 : v, z.number().min(0)),
  oneTimeAmount: z.preprocess((v) => (typeof v === 'number' && isNaN(v)) ? 0 : v, z.number().min(0)),
  annualIncrease: z.preprocess((v) => (typeof v === 'number' && isNaN(v)) ? 0 : v, z.number().min(0).max(20)),
  strategy: z.enum(['ausgewogen', 'dynamisch']),
  inflationAdjusted: z.boolean(),
});

export type SavingsCalculatorLayout = 'default' | 'horizontal-single-row' | 'two-row';

interface SavingsCalculatorProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
  onCalculate: (parsedInputs: CalculatorInputs) => void;
  isCalculating: boolean;
  layout?: SavingsCalculatorLayout;
  instanceId?: string;
}

export default function SavingsCalculator({
  inputs,
  onChange,
  onCalculate,
  isCalculating,
  layout = 'default',
  instanceId = 'main',
}: SavingsCalculatorProps) {
  const form = useForm<z.infer<typeof calculatorSchema>>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      currentAge: inputs.currentAge,
      targetAge: inputs.targetAge,
      monthlyAmount: inputs.monthlyAmount,
      oneTimeAmount: inputs.oneTimeAmount,
      annualIncrease: inputs.annualIncrease,
      strategy: inputs.strategy,
      inflationAdjusted: inputs.inflationAdjusted,
    },
  });

  const prevTargetAgeRef = useRef(inputs.targetAge);
  useEffect(() => {
    if (inputs.targetAge !== prevTargetAgeRef.current && !isNaN(inputs.targetAge)) {
      form.setValue('targetAge', inputs.targetAge);
      prevTargetAgeRef.current = inputs.targetAge;
    }
  }, [inputs.targetAge, form]);

  const onSubmit = (data: z.infer<typeof calculatorSchema>) => {
    const parsedInputs: CalculatorInputs = {
      ...data,
      goals: inputs.goals,
      capitalInflows: inputs.capitalInflows || [],
    };
    onChange(parsedInputs);
    onCalculate(parsedInputs);
  };

  const handleInputChange = (field: keyof CalculatorInputs, value: any) => {
    const updatedInputs = { ...inputs, [field]: value };
    onChange(updatedInputs);
  };

  const ausgewogenId = `${instanceId}-ausgewogen`;
  const dynamischId = `${instanceId}-dynamisch`;

  if (layout === 'horizontal-single-row') {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <FormField
              control={form.control}
              name="currentAge"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[110px]">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide">Aktuelles Alter</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('currentAge', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary rounded-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAge"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[110px]">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide">Zielalter</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('targetAge', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary rounded-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyAmount"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[140px]">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide">Monatliche Sparrate (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="z.B. 500"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('monthlyAmount', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary rounded-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="oneTimeAmount"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[130px]">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide">Einmalbetrag (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('oneTimeAmount', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary rounded-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="annualIncrease"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[140px]">
                  <FormLabel className="text-xs font-bold uppercase tracking-wide">Erhöhung p.a. (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseFloat(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('annualIncrease', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary rounded-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-[160px]">
                  <div className="flex items-center">
                    <FormLabel className="text-xs font-bold uppercase tracking-wide">Anlagestrategie</FormLabel>
                    <AnlagestrategieInfoButton />
                  </div>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleInputChange('strategy', value as 'ausgewogen' | 'dynamisch');
                      }}
                      className="flex gap-2"
                    >
                      {(['ausgewogen', 'dynamisch'] as const).map((s) => (
                        <div key={s} className="relative flex-1">
                          <RadioGroupItem value={s} id={`${instanceId}-${s}`} className="absolute opacity-0 peer" />
                          <label
                            htmlFor={`${instanceId}-${s}`}
                            className="block border-2 px-2 py-2 text-xs font-bold uppercase cursor-pointer transition-all text-center"
                            style={{
                              borderColor: field.value === s ? 'var(--ff-primary)' : '#d1d5db',
                              backgroundColor: field.value === s ? 'var(--ff-primary)' : 'white',
                              color: field.value === s ? 'white' : '#374151',
                            }}
                          >
                            {s === 'ausgewogen' ? 'Ausgewogen' : 'Dynamisch'}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inflationAdjusted"
              render={({ field }) => (
                <FormItem className="flex items-end">
                  <div className="flex items-center gap-2 border-2 border-gray-300 px-3 py-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handleInputChange('inflationAdjusted', checked);
                        }}
                        className="data-[state=checked]:bg-ff-primary"
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-bold uppercase m-0 cursor-pointer">Inflation</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex items-end">
              <Button
                type="submit"
                className="bg-ff-primary hover:bg-orange-600 text-white font-bold uppercase tracking-wide rounded-none h-10 px-6"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    ...
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    Berechnen <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[280px]">
              <GoalsSection
                goals={inputs.goals || []}
                onChange={(goals) => handleInputChange('goals', goals)}
              />
            </div>
            <div className="flex-1 min-w-[280px]">
              <CapitalInflowsSection
                capitalInflows={inputs.capitalInflows || []}
                onChange={(capitalInflows) => handleInputChange('capitalInflows', capitalInflows)}
              />
            </div>
          </div>
        </form>
      </Form>
    );
  }

  if (layout === 'two-row') {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="currentAge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aktuelles Alter</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('currentAge', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zielalter</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('targetAge', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="oneTimeAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Einmalbetrag (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('oneTimeAmount', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="monthlyAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monatliche Sparrate (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="z.B. 500"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseInt(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('monthlyAmount', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="annualIncrease"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Erhöhung Sparrate p.a. (%)
                    <span className="text-gray-500 text-xs ml-1">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = raw === '' ? NaN : parseFloat(raw);
                        field.onChange(parsed);
                        if (!isNaN(parsed)) handleInputChange('annualIncrease', parsed);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="strategy"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center">
                    <FormLabel>Anlagestrategie</FormLabel>
                    <AnlagestrategieInfoButton />
                  </div>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleInputChange('strategy', value as 'ausgewogen' | 'dynamisch');
                      }}
                      className="flex gap-2"
                    >
                      {(['ausgewogen', 'dynamisch'] as const).map((s) => (
                        <div key={s} className="relative flex-1">
                          <RadioGroupItem value={s} id={`${instanceId}-${s}`} className="absolute opacity-0 peer" />
                          <label
                            htmlFor={`${instanceId}-${s}`}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block text-sm ${
                              field.value === s ? 'border-ff-primary bg-orange-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="font-medium text-gray-900">{s === 'ausgewogen' ? 'Ausgewogen' : 'Dynamisch'}</div>
                            <div className="text-xs text-gray-500">{s === 'ausgewogen' ? 'ca. 5%' : 'ca. 7%'} p.a.</div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <FormField
                control={form.control}
                name="inflationAdjusted"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium text-gray-900">
                        Inflationsbereinigt
                      </FormLabel>
                      <p className="text-sm text-gray-600">
                        Ergebnisse real darstellen (2,5% Inflation)
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handleInputChange('inflationAdjusted', checked);
                        }}
                        className="data-[state=checked]:bg-ff-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <GoalsSection
            goals={inputs.goals || []}
            onChange={(goals) => handleInputChange('goals', goals)}
          />

          <CapitalInflowsSection
            capitalInflows={inputs.capitalInflows || []}
            onChange={(capitalInflows) => handleInputChange('capitalInflows', capitalInflows)}
          />

          <Button
            type="submit"
            className="w-full bg-ff-primary hover:bg-orange-600 text-white font-semibold py-4 px-6 shadow-lg"
            disabled={isCalculating}
          >
            {isCalculating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Berechnung läuft...
              </div>
            ) : (
              <div className="flex items-center">
                Berechnung starten
                <ChevronRight className="w-5 h-5 ml-2" />
              </div>
            )}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aktuelles Alter</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? NaN : parseInt(raw);
                      field.onChange(parsed);
                      if (!isNaN(parsed)) handleInputChange('currentAge', parsed);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="focus:ring-ff-primary focus:border-ff-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="targetAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zielalter</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = raw === '' ? NaN : parseInt(raw);
                      field.onChange(parsed);
                      if (!isNaN(parsed)) handleInputChange('targetAge', parsed);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="focus:ring-ff-primary focus:border-ff-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="monthlyAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monatliche Sparrate (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="z.B. 500"
                  {...field}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw === '' ? NaN : parseInt(raw);
                    field.onChange(parsed);
                    if (!isNaN(parsed)) handleInputChange('monthlyAmount', parsed);
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="focus:ring-ff-primary focus:border-ff-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="oneTimeAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Einmalbetrag (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw === '' ? NaN : parseInt(raw);
                    field.onChange(parsed);
                    if (!isNaN(parsed)) handleInputChange('oneTimeAmount', parsed);
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="focus:ring-ff-primary focus:border-ff-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="annualIncrease"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Jährliche Erhöhung der Sparrate (%)
                <span className="text-gray-500 text-xs ml-1">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  {...field}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw === '' ? NaN : parseFloat(raw);
                    field.onChange(parsed);
                    if (!isNaN(parsed)) handleInputChange('annualIncrease', parsed);
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="focus:ring-ff-primary focus:border-ff-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="strategy"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center">
                <FormLabel>Anlagestrategie</FormLabel>
                <AnlagestrategieInfoButton />
              </div>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleInputChange('strategy', value as 'ausgewogen' | 'dynamisch');
                  }}
                  className="grid sm:grid-cols-2 gap-3"
                >
                  <div className="relative">
                    <RadioGroupItem value="ausgewogen" id={ausgewogenId} className="absolute opacity-0 peer" />
                    <label
                      htmlFor={ausgewogenId}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block ${
                        field.value === 'ausgewogen' 
                          ? 'border-ff-primary bg-orange-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Ausgewogen</h3>
                          <p className="text-sm text-gray-600">ca. 5% p.a.</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <div className="relative">
                    <RadioGroupItem value="dynamisch" id={dynamischId} className="absolute opacity-0 peer" />
                    <label
                      htmlFor={dynamischId}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300 block ${
                        field.value === 'dynamisch' 
                          ? 'border-ff-primary bg-orange-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Dynamisch</h3>
                          <p className="text-sm text-gray-600">ca. 7% p.a.</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <FormField
              control={form.control}
              name="inflationAdjusted"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base font-medium text-gray-900">
                      Inflationsbereinigt
                    </FormLabel>
                    <p className="text-sm text-gray-600">
                      Ergebnisse real darstellen (2,5% Inflation)
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleInputChange('inflationAdjusted', checked);
                      }}
                      className="data-[state=checked]:bg-ff-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <GoalsSection
          goals={inputs.goals || []}
          onChange={(goals) => handleInputChange('goals', goals)}
        />

        <CapitalInflowsSection
          capitalInflows={inputs.capitalInflows || []}
          onChange={(capitalInflows) => handleInputChange('capitalInflows', capitalInflows)}
        />

        <Button
          type="submit"
          className="w-full bg-ff-primary hover:bg-orange-600 text-white font-semibold py-4 px-6 shadow-lg"
          disabled={isCalculating}
        >
          {isCalculating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Berechnung läuft...
            </div>
          ) : (
            <div className="flex items-center">
              Berechnung starten
              <ChevronRight className="w-5 h-5 ml-2" />
            </div>
          )}
        </Button>
      </form>
    </Form>
  );
}
