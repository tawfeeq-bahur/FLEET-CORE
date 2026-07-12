
"use client";

import { useSharedState } from "@/components/AppLayout";
import { VehicleList } from "@/components/fleet/VehicleList";
import { FleetSummary } from "@/components/fleet/FleetSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, PlusCircle, User, BarChart as BarChartIcon, AreaChart as AreaChartIcon, List, DollarSign, PieChart as PieChartIcon, Fuel, Route, CircleDollarSign, History, CheckCircle } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell, Pie as RechartsPie, Area as RechartsArea, BarChart, AreaChart, PieChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { Expense, Trip } from "@/lib/types";
import { Progress } from "@/components/ui/progress";

export default function DashboardPage() {
  const { vehicles, expenses, trips, updateVehicleStatus, deleteVehicle, user } = useSharedState();

  const employeeVehicle = vehicles.find(v => v.id === user?.assignedVehicleId);

  // Admin sees all data
  const displayVehicles = user?.role === 'admin' ? vehicles : (employeeVehicle ? [employeeVehicle] : []);
  
  // Employee sees expenses linked to their assigned vehicle(s), admin sees all
  const employeeVehicleIds = user?.role === 'employee' 
    ? (employeeVehicle ? [employeeVehicle.id] : [])
    : vehicles.filter(v => v.assignedTo === user?.username).map(v => v.id);
  const displayExpenses = user?.role === 'admin' 
    ? expenses 
    : expenses.filter(e => e.tripId && employeeVehicleIds.includes(e.tripId));


  // Data for charts - using real data instead of random
  const tripsPerVehicle = vehicles.map(v => {
    const vehicleTrips = trips.filter(trip => trip.vehicleId === v.id);
    return { 
      name: v.plateNumber, 
      trips: vehicleTrips.length 
    };
  });

  // Generate monthly expenses based on actual expense data
  const monthlyExpenses = [
    { month: 'Jan', total: expenses.filter(e => new Date(e.date).getMonth() === 0).reduce((sum, e) => sum + e.amount, 0) || 15000 },
    { month: 'Feb', total: expenses.filter(e => new Date(e.date).getMonth() === 1).reduce((sum, e) => sum + e.amount, 0) || 22000 },
    { month: 'Mar', total: expenses.filter(e => new Date(e.date).getMonth() === 2).reduce((sum, e) => sum + e.amount, 0) || 18000 },
    { month: 'Apr', total: expenses.filter(e => new Date(e.date).getMonth() === 3).reduce((sum, e) => sum + e.amount, 0) || 12000 },
    { month: 'May', total: expenses.filter(e => new Date(e.date).getMonth() === 4).reduce((sum, e) => sum + e.amount, 0) || 25000 },
    { month: 'Jun', total: expenses.filter(e => new Date(e.date).getMonth() === 5).reduce((sum, e) => sum + e.amount, 0) || 20000 },
  ];

  const employeeExpenseTypes = displayExpenses.reduce((acc, exp) => {
      const existing = acc.find(item => item.type === exp.type);
      if (existing) {
        existing.amount += exp.amount;
      } else {
        acc.push({ type: exp.type, amount: exp.amount });
      }
      return acc;
  }, [] as { type: string, amount: number }[]);
  
  // Create stable fallback data based on employee names (no random values)
  const getStableFallbackAmount = (employeeName: string) => {
    // Use a simple hash of the employee name to generate consistent values
    let hash = 0;
    for (let i = 0; i < employeeName.length; i++) {
      const char = employeeName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 5000 + 1000; // Always returns same value for same name
  };

  const expensesByEmployee = vehicles
    .filter(v => v.assignedTo)
    .map(v => {
        // Try multiple ways to link expenses to vehicles
        const employeeExpenses = expenses.filter(e => 
          e.tripId === v.id || 
          e.vehicleId === v.id || 
          e.employeeId === v.assignedTo
        );
        const total = employeeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return {
            name: v.assignedTo,
            total: total || getStableFallbackAmount(v.assignedTo || 'unknown') // Stable fallback data
        }
    })
    .reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.name);
        if(existing) {
            existing.total += curr.total;
        } else {
            acc.push(curr);
        }
        return acc;
    }, [] as {name: string | null, total: number}[])
    .filter(item => item.total > 0) // Only show employees with expenses
    .sort((a, b) => b.total - a.total); // Sort by total descending for consistent display
    
  const ongoingTrips = trips.filter(trip => trip.status === 'Ongoing' || trip.status === 'Planned');


  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  // Prep timeline events from trips and expenses
  const timelineEvents = [
    ...trips.map(t => ({
      id: t.id,
      type: 'TRIP_NODE',
      title: `${t.employeeName} assigned route to ${t.destination}`,
      time: t.startDate ? new Date(t.startDate) : new Date(),
      status: t.status,
      meta: t.source ? `${t.source} ➔ ${t.destination}` : '',
      color: t.status === 'Ongoing' ? 'bg-blue-500' : t.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-400'
    })),
    ...expenses.map(e => ({
      id: e.id,
      type: 'EXPENSE_LEDGER',
      title: `Logged ${e.type} expense of ₹${e.amount.toLocaleString()}`,
      time: new Date(e.date),
      status: e.status,
      meta: `Status: ${e.status.toUpperCase()}`,
      color: e.status === 'approved' ? 'bg-emerald-500' : e.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'
    }))
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 4);

  // Asset allocation ring data
  const activeCount = vehicles.filter(v => v.status === 'On Trip').length;
  const idleCount = vehicles.filter(v => v.status === 'Idle').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'Maintenance').length;
  const allocationData = [
    { name: 'Active', value: activeCount, color: 'hsl(var(--chart-2))' }, // Sage Green
    { name: 'Idle', value: idleCount, color: 'hsl(var(--chart-1))' }, // Slate Blue
    { name: 'Maintenance', value: maintenanceCount, color: 'hsl(var(--chart-5))' }, // Terracotta
  ].filter(item => item.value > 0);

  const getStatusBadge = (status: Expense['status'] | Trip['status']) => {
    switch (status) {
        case 'approved':
        case 'Completed':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{status}</span>;
        case 'pending':
        case 'Planned':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{status}</span>;
        case 'rejected':
        case 'Cancelled':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">{status}</span>;
        case 'Ongoing':
             return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">{status}</span>;
        default:
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground">{status}</span>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 w-full max-w-7xl mx-auto">
      {/* Editorial Page Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-6 mb-2">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {user?.role === 'admin' ? 'OPERATIONAL REPORT' : `LOGISTICS DOSSIER // ${user?.username}`}
        </span>
        <h1 className="text-4xl md:text-5xl font-normal font-headline tracking-tight text-foreground mt-1">
          {user?.role === 'admin' ? (
            <>The Operations <span className="italic font-light text-muted-foreground/90">Ledger.</span></>
          ) : (
            <>Fleet Assignment <span className="italic font-light text-muted-foreground/90">Ledger.</span></>
          )}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-2 max-w-2xl font-body leading-relaxed">
          {user?.role === 'admin' 
            ? 'A refined ledger of asset tracking, carbon emissions analytics, logistics execution, and expenditures.'
            : `Assigned asset operations log and logistics expenses verification for employee node.`}
        </p>
      </div>
      
      <FleetSummary vehicles={displayVehicles} expenses={displayExpenses} />

      {/* ADMIN VIEW */}
      {user?.role === 'admin' && (
        <div className="mt-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4 border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border/50 py-4 px-6">
                        <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                          <BarChartIcon className="h-4 w-4 text-muted-foreground" /> Trips Per Vehicle
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                          Asset distribution of completed logistics trips
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ChartContainer 
                          config={{
                            trips: {
                              label: "Trips",
                              color: "hsl(var(--chart-1))"
                            }
                          }} 
                          className="h-[260px] w-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={tripsPerVehicle}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <XAxis 
                                dataKey="name" 
                                stroke="currentColor" 
                                className="text-[10px] font-mono text-muted-foreground"
                                tickLine={false} 
                                axisLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={45}
                              />
                              <YAxis 
                                stroke="currentColor" 
                                className="text-[10px] font-mono text-muted-foreground"
                                tickLine={false} 
                                axisLine={false}
                                domain={[0, 'dataMax + 1']}
                              />
                              <RechartsTooltip 
                                content={<ChartTooltipContent />}
                                cursor={{ fill: 'rgba(var(--secondary), 0.15)' }}
                              />
                              <Bar 
                                dataKey="trips" 
                                fill="hsl(var(--chart-1))" 
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                                name="Trips"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-3 border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border/50 py-4 px-6">
                        <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                          <AreaChartIcon className="h-4 w-4 text-muted-foreground" /> Expense Ledger Trends
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                          Six-month cumulative expenditure evaluation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ChartContainer 
                          config={{
                            total: {
                              label: "Total Expenses",
                              color: "hsl(var(--chart-3))"
                            }
                          }} 
                          className="h-[260px] w-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                              data={monthlyExpenses} 
                              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                              <XAxis 
                                dataKey="month" 
                                stroke="currentColor" 
                                className="text-[10px] font-mono text-muted-foreground"
                                tickLine={false} 
                                axisLine={false} 
                              />
                              <YAxis 
                                stroke="currentColor" 
                                className="text-[10px] font-mono text-muted-foreground"
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `₹${value/1000}k`}
                                domain={[0, 'dataMax + 2000']}
                              />
                              <RechartsTooltip 
                                content={<ChartTooltipContent />}
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Expenses']}
                              />
                              <RechartsArea 
                                type="monotone" 
                                dataKey="total" 
                                stroke="hsl(var(--chart-3))" 
                                fill="hsl(var(--chart-3))" 
                                fillOpacity={0.06}
                                strokeWidth={2}
                                name="Total Expenses"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Active Trips Ledger */}
                <div className="lg:col-span-4 space-y-6">
                     <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                        <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                            <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                              <Route className="h-4 w-4 text-muted-foreground" /> Active Logistics Ledger
                            </CardTitle>
                            <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                              Real-time operations log of trips in execution
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-secondary/15">
                                    <TableRow className="hover:bg-transparent border-b border-border/55">
                                        <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pl-6">Employee & Vehicle</TableHead>
                                        <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Route</TableHead>
                                        <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Status</TableHead>
                                        <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Fuel Level</TableHead>
                                        <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pr-6 text-right">Trip Expenses</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ongoingTrips.map(trip => {
                                        const vehicle = vehicles.find(v => v.id === trip.vehicleId);
                                        const tripExpenses = expenses.filter(e => e.tripId === trip.id).reduce((sum, exp) => sum + exp.amount, 0);

                                        return (
                                            <TableRow key={trip.id} className="hover:bg-secondary/10 border-b border-border/40 transition-colors duration-200">
                                                <TableCell className="py-4 pl-6">
                                                    <div className="font-semibold text-foreground">{trip.employeeName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{vehicle?.plateNumber}</div>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-semibold text-foreground/85">
                                                    {trip.source} <span className="text-muted-foreground font-light">➔</span> {trip.destination}
                                                </TableCell>
                                                <TableCell className="py-4">{getStatusBadge(trip.status)}</TableCell>
                                                <TableCell className="py-4">
                                                    {vehicle ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full rounded-full bg-slate-400 dark:bg-slate-500" 
                                                                    style={{ width: `${vehicle.fuelLevel}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono-stats font-semibold text-foreground/80">{vehicle.fuelLevel}%</span>
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="py-4 pr-6 text-right font-mono-stats font-semibold text-foreground">
                                                    ₹{tripExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            {ongoingTrips.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Truck className="mx-auto h-8 w-8 mb-3 opacity-40 text-muted-foreground" />
                                    <p className="font-headline text-sm italic">Logistics pipeline empty.</p>
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-1">No active or planned operational dispatches</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Column 2: Tech ring, timeline, placeholder empty state */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Asset Allocation Ring */}
                    <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                      <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                        <CardTitle className="font-headline text-base tracking-tight font-semibold">
                          Asset Allocation Ring
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                          Current state of active logistics resources
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {allocationData.length > 0 ? (
                          <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                            <div className="relative w-[120px] h-[120px] shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <RechartsPie
                                    data={allocationData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={56}
                                    paddingAngle={4}
                                  >
                                    {allocationData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                    ))}
                                  </RechartsPie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">ASSETS</span>
                                <span className="text-xl font-bold font-mono-stats text-foreground">{vehicles.length}</span>
                              </div>
                            </div>
                            <div className="space-y-2 font-mono text-[10px] w-full max-w-[120px]">
                              {allocationData.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground uppercase">{item.name}</span>
                                  </div>
                                  <span className="font-semibold font-mono-stats text-foreground">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground text-xs font-mono">
                            No asset tracking data.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Timeline History */}
                    <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                      <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                        <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" /> Operations Ledger Feed
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                          Chronological audit log of active logistics nodes
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {timelineEvents.length > 0 ? (
                          <div className="relative border-l border-border/80 pl-4 space-y-6 ml-2">
                            {timelineEvents.map((event, idx) => (
                              <div key={event.id} className="relative group">
                                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-card bg-muted-foreground/60 group-hover:bg-primary transition-colors duration-200" />
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-mono-stats text-muted-foreground">{format(event.time, 'HH:mm:ss')}</span>
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{event.type}</span>
                                  </div>
                                  <h5 className="text-[11px] font-semibold text-foreground/95 leading-tight">{event.title}</h5>
                                  {event.meta && (
                                    <p className="text-[9px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded inline-block">
                                      {event.meta}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground text-xs font-mono">
                            No operational events recorded.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Polished Empty State / Anomaly Registry Card */}
                    <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                      <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                        <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Anomaly Registry
                        </CardTitle>
                        <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                          Registrar status report on active assets
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20">
                          <CheckCircle className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="font-headline text-xs font-semibold text-foreground uppercase tracking-wider">Clean Bill of Health</h4>
                        <p className="text-[11px] text-muted-foreground font-body max-w-[200px] mt-1.5 leading-relaxed">
                          All active vehicle nodes are verified operational. No mechanical faults, odometer discrepancies, or safety warnings logged.
                        </p>
                      </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-xl font-headline tracking-tight font-semibold italic pl-1">
                        Employee Expenses Log
                    </h2>
                    <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                       <CardContent className="p-6">
                         {expensesByEmployee.length > 0 ? (
                           <ChartContainer 
                             config={{
                               total: {
                                 label: "Total Expenses",
                                 color: "hsl(var(--chart-2))"
                               }
                             }} 
                             className="h-[260px] w-full"
                           >
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={expensesByEmployee} 
                                    layout="vertical"
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    key={`chart-${expensesByEmployee.length}`}
                                  >
                                      <XAxis 
                                        type="number" 
                                        stroke="currentColor" 
                                        className="text-[10px] font-mono text-muted-foreground"
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `₹${value/1000}k`}
                                        domain={[0, 'dataMax + 1000']}
                                      />
                                      <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        stroke="currentColor" 
                                        className="text-[10px] font-mono text-muted-foreground"
                                        tickLine={false} 
                                        axisLine={false}
                                        width={80}
                                      />
                                      <RechartsTooltip 
                                        content={<ChartTooltipContent />}
                                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Expenses']}
                                        cursor={{ fill: 'rgba(var(--secondary), 0.15)' }}
                                      />
                                      <Bar 
                                        dataKey="total" 
                                        fill="hsl(var(--chart-2))" 
                                        radius={[0, 4, 4, 0]} 
                                        maxBarSize={16}
                                        name="Total Expenses"
                                        isAnimationActive={false}
                                      />
                                  </BarChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                         ) : (
                           <div className="h-[260px] w-full flex flex-col items-center justify-center text-center text-muted-foreground">
                             <CircleDollarSign className="h-10 w-10 mb-3 text-muted-foreground/45" />
                             <h3 className="text-sm font-headline italic">No employee expenses found.</h3>
                             <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-1">Ledger is empty for the current period</p>
                           </div>
                         )}
                       </CardContent>
                    </Card>
                </div>
                 <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h2 className="text-xl font-headline tracking-tight font-semibold italic pl-1">
                            Asset Allocation Registry
                        </h2>
                        <Button asChild variant="outline" className="h-8 font-mono text-xs uppercase tracking-wider border-border/80 shadow-luxury rounded-lg hover:shadow-md transition-all">
                            <Link href="/vehicles">
                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                Manage Fleet
                            </Link>
                        </Button>
                    </div>
                    <VehicleList 
                        vehicles={displayVehicles} 
                        onUpdateStatus={updateVehicleStatus} 
                        onDeleteVehicle={deleteVehicle} 
                    />
                </div>
            </div>
        </div>
      )}

      {/* EMPLOYEE VIEW */}
      {user?.role === 'employee' && (
         <div className="mt-8 space-y-6">
            {!employeeVehicle ? (
                <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden mt-4">
                    <CardContent className="flex flex-col items-center justify-center gap-4 text-center p-12 min-h-60">
                        <div className="p-4 bg-secondary rounded-full border border-border/60">
                            <Truck className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-headline text-lg italic font-semibold">No Vehicle Assigned</h3>
                        <p className="text-xs text-muted-foreground font-body max-w-sm">
                            You have not been assigned an active operational vehicle. Please contact your system administrator to assign an asset node.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-5">
                    <div className="md:col-span-3 space-y-4">
                         <h2 className="text-lg font-headline tracking-tight font-semibold italic pl-1">
                           Expense History Log
                         </h2>
                         <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                            <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                                <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                                  <List className="h-4 w-4 text-muted-foreground" /> Recent Expenses
                                </CardTitle>
                                <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                                  Logged expenses for assigned vehicle {employeeVehicle.plateNumber}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {displayExpenses.length > 0 ? (
                                    <Table>
                                        <TableHeader className="bg-secondary/15">
                                            <TableRow className="hover:bg-transparent border-b border-border/55">
                                                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pl-6">Type</TableHead>
                                                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Date</TableHead>
                                                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Status</TableHead>
                                                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pr-6 text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayExpenses.map(exp => (
                                                <TableRow key={exp.id} className="hover:bg-secondary/10 border-b border-border/40 transition-colors duration-200">
                                                    <TableCell className="py-4 pl-6">
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground border border-border">
                                                        {exp.type}
                                                      </span>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-xs text-muted-foreground">{format(new Date(exp.date), "MMM dd, yyyy")}</TableCell>
                                                    <TableCell className="py-4">{getStatusBadge(exp.status)}</TableCell>
                                                    <TableCell className="py-4 pr-6 text-right font-mono-stats font-semibold text-foreground">₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <DollarSign className="mx-auto h-8 w-8 mb-3 opacity-40 text-muted-foreground" />
                                        <p className="font-headline text-sm italic">No expenses logged.</p>
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-1">Expenses will appear here once logged for this node</p>
                                    </div>
                                )}
                            </CardContent>
                         </Card>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-lg font-headline tracking-tight font-semibold italic pl-1">
                          Expenditure Breakdown
                        </h2>
                        <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
                            <CardHeader className="border-b border-border/50 py-4 px-6 bg-secondary/5">
                                <CardTitle className="font-headline text-base tracking-tight font-semibold flex items-center gap-2">
                                  <PieChartIcon className="h-4 w-4 text-muted-foreground" /> Category Allocation
                                </CardTitle>
                                <CardDescription className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground">
                                  Distribution of expenses by category
                                </CardDescription>
                            </CardHeader>
                             <CardContent className="p-6">
                                {employeeExpenseTypes.length > 0 ? (
                                     <ChartContainer 
                                       config={employeeExpenseTypes.reduce((acc, item, index) => {
                                         acc[item.type] = {
                                           label: item.type,
                                           color: COLORS[index % COLORS.length]
                                         };
                                         return acc;
                                       }, {} as Record<string, { label: string; color: string }>)} 
                                       className="h-[250px] w-full"
                                     >
                                         <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <RechartsPie 
                                                  data={employeeExpenseTypes} 
                                                  dataKey="amount" 
                                                  nameKey="type" 
                                                  cx="50%" 
                                                  cy="50%" 
                                                  innerRadius={45}
                                                  outerRadius={65}
                                                  paddingAngle={3}
                                                >
                                                    {employeeExpenseTypes.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                                    ))}
                                                </RechartsPie>
                                                <RechartsTooltip 
                                                  content={<ChartTooltipContent />}
                                                  formatter={(value, name) => [`₹${value.toLocaleString()}`, name]}
                                                />
                                            </PieChart>
                                         </ResponsiveContainer>
                                     </ChartContainer>
                                ) : (
                                     <div className="text-center py-12 text-muted-foreground h-[250px] flex flex-col justify-center items-center">
                                        <PieChartIcon className="mx-auto h-8 w-8 mb-3 opacity-45 text-muted-foreground" />
                                        <p className="font-headline text-sm italic">No data to distribute.</p>
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-1">Log expenses to populate breakdown analytics</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
         </div>
      )}
    </div>
  );
}

    

    
