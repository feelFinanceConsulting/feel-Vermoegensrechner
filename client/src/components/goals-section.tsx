import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal } from "@/types/calculator";
import { Plus, Trash2 } from "lucide-react";
import { trackGoalAdded } from "@/lib/analytics";

interface GoalsSectionProps {
  goals: Goal[];
  onChange: (goals: Goal[]) => void;
}

const goalTypes = [
  { value: 'immobilienkauf', label: 'Immobilienkauf' },
  { value: 'auto', label: 'Auto' },
  { value: 'hochzeit', label: 'Hochzeit' },
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'renovierung', label: 'Renovierung' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const;

export default function GoalsSection({ goals = [], onChange }: GoalsSectionProps) {
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    type: 'immobilienkauf',
    amount: 0,
    year: new Date().getFullYear() + 5,
  });

  const addGoal = () => {
    if (goals.length >= 5) return; // Maximum 5 goals
    
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      type: newGoal.type as Goal['type'],
      amount: newGoal.amount || 0,
      year: newGoal.year || new Date().getFullYear() + 5,
    };
    
    onChange([...goals, goal]);
    setNewGoal({
      type: 'immobilienkauf',
      amount: 0,
      year: new Date().getFullYear() + 5,
    });
    
    trackGoalAdded();
  };

  const removeGoal = (id: string) => {
    onChange(goals.filter(goal => goal.id !== id));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    onChange(goals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 font-gilroy">Finanzielle Ziele</h3>
        {goals.length < 5 && (
          <Button
            type="button"
            variant="ghost"
            className="text-ff-primary hover:text-orange-600 font-medium text-sm"
            onClick={addGoal}
          >
            <Plus className="w-4 h-4 mr-1" />
            Ziel hinzufügen
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {goals.map((goal) => (
          <Card key={goal.id} className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ziel</label>
                  <Select
                    value={goal.type}
                    onValueChange={(value) => updateGoal(goal.id, { type: value as Goal['type'] })}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map(type => (
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
                    placeholder="50.000"
                    value={goal.amount || ''}
                    onChange={(e) => updateGoal(goal.id, { amount: parseInt(e.target.value) || 0 })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full text-sm focus:ring-ff-primary focus:border-ff-primary"
                  />
                </div>
                
                <div className="flex items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Jahr</label>
                    <Input
                      type="number"
                      placeholder="2030"
                      value={goal.year || ''}
                      onChange={(e) => updateGoal(goal.id, { year: parseInt(e.target.value) || new Date().getFullYear() })}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full text-sm focus:ring-ff-primary focus:border-ff-primary"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-2 text-gray-400 hover:text-red-500"
                    onClick={() => removeGoal(goal.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {goals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">Keine finanziellen Ziele definiert</p>
            <Button
              type="button"
              variant="outline"
              onClick={addGoal}
              className="border-ff-primary text-ff-primary hover:bg-orange-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Erstes Ziel hinzufügen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
