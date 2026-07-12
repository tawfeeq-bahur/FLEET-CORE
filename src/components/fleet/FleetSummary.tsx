
'use client';

import type { Vehicle, Expense } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CircleDollarSign, Fuel, Wrench, Lightbulb, AlertTriangle } from 'lucide-react';

type FleetSummaryProps = {
  vehicles: Vehicle[];
  expenses: Expense[];
};

export function FleetSummary({ vehicles, expenses }: FleetSummaryProps) {
  // Simple calculations without any async operations
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  
  const summary = {
    totalVehicles: vehicles.length,
    onTrip: vehicles.filter(v => v.status === 'On Trip').length,
    totalExpenses: totalExpenses,
    maintenance: vehicles.filter(v => v.status === 'Maintenance').length,
  };

  // Generate insights immediately without any loading states
  const generateInsights = () => {
    if (summary.totalVehicles === 0) {
      return {
        efficiencyInsight: "No vehicles in fleet yet. Add vehicles to get efficiency insights.",
        costSavingSuggestion: "Start by adding vehicles and tracking expenses to identify cost-saving opportunities.",
        anomalyDetection: "Operations look normal."
      };
    }

    return {
      efficiencyInsight: `Your fleet of ${summary.totalVehicles} vehicles is currently ${summary.onTrip > 0 ? 'actively operating' : 'idle'}. ${summary.onTrip > 0 ? `${summary.onTrip} trips are in progress.` : 'No active trips at the moment.'}`,
      costSavingSuggestion: `Total expenses this month: ₹${summary.totalExpenses.toLocaleString()}. Consider optimizing routes and maintenance schedules to reduce costs.`,
      anomalyDetection: summary.maintenance > 0 ? `${summary.maintenance} vehicle(s) in maintenance. Monitor maintenance schedules to prevent unexpected breakdowns.` : "Operations look normal."
    };
  };

  const insights = generateInsights();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard icon={Truck} title="Total Vehicles" value={summary.totalVehicles} monoLabel="SYS_ASSETS" colorClass="text-slate-600 dark:text-slate-400" />
      <SummaryCard icon={CircleDollarSign} title="Total Expenses" value={summary.totalExpenses > 0 ? `₹${summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00"} monoLabel="FIN_EXPENDITURE" colorClass="text-amber-600 dark:text-amber-400" />
      <SummaryCard icon={Wrench} title="In Maintenance" value={summary.maintenance} monoLabel="SYS_ALERT" colorClass="text-rose-600 dark:text-rose-400" />
      <SummaryCard icon={Fuel} title="Ongoing Trips" value={summary.onTrip} monoLabel="LOGISTICS_OPS" colorClass="text-emerald-600 dark:text-emerald-400" />

      <Card className="md:col-span-2 lg:col-span-4 border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-secondary/20 py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-headline text-lg tracking-tight italic font-semibold">
                Operations Briefing
              </CardTitle>
              <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                AI-Powered Ledger Diagnostics & Insights
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-0 divide-y divide-border/50">
          <InsightItem 
            title="Operational Efficiency" 
            text={insights.efficiencyInsight}
            monoLabel="SYS_EFFICIENCY"
          />
          <InsightItem 
            title="Capital Optimization" 
            text={insights.costSavingSuggestion} 
            monoLabel="CAPITAL_OPTIMIZE"
          />
          <InsightItem 
            title="System Anomalies" 
            text={insights.anomalyDetection}
            monoLabel="SYS_ANOMALY"
            icon={insights.anomalyDetection.toLowerCase().includes("normal") ? undefined : AlertTriangle}
            iconColor="text-rose-500"
          />
        </CardContent>
      </Card>
    </div>
  );
}

const SummaryCard = ({ 
  icon: Icon, 
  title, 
  value, 
  monoLabel,
  colorClass 
}: { 
  icon: React.ElementType; 
  title: string; 
  value: number | string; 
  monoLabel: string;
  colorClass?: string;
}) => (
  <Card className="border border-border/80 bg-card shadow-luxury hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl overflow-hidden group">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-5">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">{monoLabel}</span>
        <CardTitle className="text-xs font-semibold text-foreground/80 tracking-tight font-body uppercase">{title}</CardTitle>
      </div>
      <div className={`p-2 rounded-lg bg-secondary/50 group-hover:bg-secondary transition-colors duration-300 ${colorClass || 'text-muted-foreground'}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent className="pb-5 px-5 pt-0">
      <div className="text-2xl font-bold font-mono-stats tracking-tight text-foreground">{value}</div>
    </CardContent>
  </Card>
);

const InsightItem = ({ 
  title, 
  text, 
  monoLabel,
  icon: Icon, 
  iconColor 
}: { 
  title: string; 
  text: string; 
  monoLabel: string;
  icon?: React.ElementType; 
  iconColor?: string;
}) => (
  <div className="p-5 flex items-start gap-4 hover:bg-secondary/10 transition-colors duration-200">
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">{monoLabel}</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{text}</p>
    </div>
    {Icon && (
      <div className={`p-2 rounded-lg bg-destructive/10 ${iconColor || 'text-destructive'}`}>
        <Icon className="h-4 w-4" />
      </div>
    )}
  </div>
);

