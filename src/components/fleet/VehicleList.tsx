
'use client';

import type { Vehicle } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Trash2, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '../ui/card';
import { format } from 'date-fns';
import { useSharedState } from '../AppLayout';

type VehicleListProps = {
  vehicles: Vehicle[];
  onUpdateStatus: (id: string, status: Vehicle['status']) => void;
  onDeleteVehicle: (id: string) => void;
};

export function VehicleList({ vehicles, onUpdateStatus, onDeleteVehicle }: VehicleListProps) {
  const { user } = useSharedState();

  const getStatusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'On Trip':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            On Trip
          </span>
        );
      case 'Idle':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Idle
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Maintenance
          </span>
        );
    }
  };

  return (
    <Card className="border border-border/80 bg-card shadow-luxury rounded-xl overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/15">
            <TableRow className="hover:bg-transparent border-b border-border/55">
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pl-6">Vehicle</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Plate Number</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Status</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Fuel Level</TableHead>
              <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5">Last Maintenance</TableHead>
              {user?.role === 'admin' && (
                <TableHead className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase py-3.5 pr-6 text-right">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} className="hover:bg-secondary/10 border-b border-border/40 transition-colors duration-200">
                <TableCell className="py-4 pl-6">
                  <div className="font-semibold text-foreground tracking-tight">{vehicle.name}</div>
                  <div className="text-xs text-muted-foreground font-body mt-0.5">{vehicle.model}</div>
                </TableCell>
                <TableCell className="py-4 font-mono text-xs font-semibold text-foreground/80">{vehicle.plateNumber}</TableCell>
                <TableCell className="py-4">{getStatusBadge(vehicle.status)}</TableCell>
                <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 bg-secondary dark:bg-secondary/80 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    vehicle.fuelLevel < 15 
                                      ? 'bg-rose-500' 
                                      : vehicle.fuelLevel < 35 
                                      ? 'bg-amber-500' 
                                      : 'bg-slate-400 dark:bg-slate-500'
                                }`}
                                style={{ width: `${vehicle.fuelLevel}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono-stats font-semibold text-foreground/80">{vehicle.fuelLevel}%</span>
                    </div>
                </TableCell>
                <TableCell className="py-4 text-xs text-muted-foreground">{format(new Date(vehicle.lastMaintenance), 'MMM dd, yyyy')}</TableCell>
                {user?.role === 'admin' && (
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8 hover:bg-secondary/60 rounded-full">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="font-mono text-xs p-1">
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">Asset Control</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="py-2 cursor-pointer" onClick={() => onUpdateStatus(vehicle.id, 'Maintenance')}>
                          <Wrench className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          Send for Maintenance
                        </DropdownMenuItem>
                        <DropdownMenuItem className="py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => onDeleteVehicle(vehicle.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
