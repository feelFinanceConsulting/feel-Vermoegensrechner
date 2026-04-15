import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapitalInflow } from "@/types/calculator";
import { Plus, Trash2 } from "lucide-react";

interface CapitalInflowsSectionProps {
  capitalInflows: CapitalInflow[];
  onChange: (capitalInflows: CapitalInflow[]) => void;
}

const inflowTypes = [
  { value: 'immobilienverkauf', label: 'Immobilienverkauf' },
  { value: 'versicherung', label: 'Versicherungen & Vorsorge – Auszahlung' },
  { value: 'erbschaft', label: 'Erbschaft / Schenkung' },
  { value: 'unternehmensverkauf', label: 'Unternehmensverkauf / Beteiligungen' },
  { value: 'staatliche_leistungen', label: 'Staatliche Leistungen / Pension' },
  { value: 'sonstige_einmalzahlung', label: 'Sonstige Einmalzahlung' },
] as const;

export default function CapitalInflowsSection({ capitalInflows = [], onChange }: CapitalInflowsSectionProps) {
  const addInflow = () => {
    if (capitalInflows.length >= 5) return;

    const inflow: CapitalInflow = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'immobilienverkauf',
      amount: 0,
      year: new Date().getFullYear() + 5,
    };

    onChange([...capitalInflows, inflow]);
  };

  const removeInflow = (id: string) => {
    onChange(capitalInflows.filter(inflow => inflow.id !== id));
  };

  const updateInflow = (id: string, updates: Partial<CapitalInflow>) => {
    onChange(capitalInflows.map(inflow =>
      inflow.id === id ? { ...inflow, ...updates } : inflow
    ));
  };

  return (
    <div className="border-t pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-gray-900 font-gilroy">Zukünftige Vermögenszuflüsse</h3>
        {capitalInflows.length < 5 && (
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto text-ff-primary hover:text-orange-600 font-medium text-sm justify-center sm:justify-start min-h-[44px]"
            onClick={addInflow}
          >
            <Plus className="w-4 h-4 mr-1 flex-shrink-0" />
            Vermögenszufluss hinzufügen
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {capitalInflows.map((inflow) => (
          <Card key={inflow.id} className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ereignis</label>
                  <Select
                    value={inflow.type}
                    onValueChange={(value) => updateInflow(inflow.id, { type: value as CapitalInflow['type'] })}
                  >
                    <SelectTrigger className="w-full text-sm text-left">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {inflowTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Betrag (€)</label>
                  <Input
                    type="number"
                    placeholder="100.000"
                    value={inflow.amount || ''}
                    onChange={(e) => updateInflow(inflow.id, { amount: parseInt(e.target.value) || 0 })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full text-sm focus:ring-ff-primary focus:border-ff-primary"
                  />
                </div>

                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jahr</label>
                    <Input
                      type="number"
                      placeholder="2035"
                      value={inflow.year || ''}
                      onChange={(e) => updateInflow(inflow.id, { year: parseInt(e.target.value) || new Date().getFullYear() })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full text-sm focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-2 text-gray-400 hover:text-red-500"
                    onClick={() => removeInflow(inflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {capitalInflows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">Kein Vermögenszufluss definiert</p>
            <Button
              type="button"
              variant="outline"
              onClick={addInflow}
              className="border-ff-primary text-ff-primary hover:bg-orange-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ersten Kapitalzufluss hinzufügen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
