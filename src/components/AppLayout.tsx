

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutDashboard, Truck, Settings, User, Map, DollarSign, ScanLine, LogOut, BarChart, LifeBuoy, Route, Bell, Users, Send, HeartPulse, Camera } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import type { Vehicle, Expense, User as UserType, Trip, EmployeeProfile } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";
import LoginPage from "@/app/login/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TripPlannerOutput } from "@/ai/flows/trip-planner";

const adminMenuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/guide", label: "Assign Trip", icon: Send },
  { href: "/trip-summary", label: "Trip Summary", icon: Route },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/vehicles", label: "Vehicle Management", icon: Truck },
  { href: "/employees", label: "Employee Management", icon: Users },
  { href: "/odometer", label: "Odometer Verification", icon: Camera },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart },
];

const employeeMenuItems = [
  { href: "/", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "My Trips", icon: Route },
  { href: "/vehicle-health", label: "Vehicle Health", icon: HeartPulse },
  { href: "/scanner", label: "Log Expense", icon: ScanLine },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

// Define the shape of the shared state
interface SharedState {
  vehicles: Vehicle[];
  employees: EmployeeProfile[];
  expenses: Expense[];
  trips: Trip[];
  user: UserType | null;
  login: (username: string, password: string, adminCode?: string) => boolean;
  logout: () => void;
  refreshData: () => Promise<boolean>;
  addVehicle: (vehicle: Omit<Vehicle, "id">) => void;
  updateVehicleStatus: (vehicleId: string, status: Vehicle['status']) => void;
  updateVehicleFuelLevel: (vehicleId: string, fuelLevel: number) => void;
  deleteVehicle: (vehicleId: string) => void;
  assignVehicle: (vehicleId: string, assignedTo: string | null) => void;
  addExpense: (expense: Omit<Expense, "id" | "status">) => void;
  updateExpenseStatus: (expenseId: string, status: Expense['status']) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'status' | 'expenses'>) => void;
  updateTripStatus: (tripId: string, status: Trip['status']) => void;
}

// Create the context
const SharedStateContext = createContext<SharedState | undefined>(undefined);

// Create a custom hook to use the shared state
export const useSharedState = () => {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error('useSharedState must be used within a SharedStateProvider');
  }
  return context;
};


const initialVehicles: Vehicle[] = [
  {
    id: "1",
    name: "Volvo Prime Mover",
    plateNumber: "TRK-001",
    model: "VNL 860",
    status: "Idle",
    fuelLevel: 75,
    lastMaintenance: new Date('2024-06-15').toISOString(),
    assignedTo: 'Raja'
  },
  {
    id: "2",
    name: "Ford Transit Van",
    plateNumber: "VAN-002",
    model: "Transit-250",
    status: "Idle",
    fuelLevel: 90,
    lastMaintenance: new Date('2024-07-20').toISOString(),
    assignedTo: 'Ram'
  },
  {
    id: "3",
    name: "Scania Rigid Truck",
    plateNumber: "TRK-003",
    model: "P-series",
    status: "Maintenance",
    fuelLevel: 20,
    lastMaintenance: new Date().toISOString(),
    assignedTo: null
  },
];

const initialExpenses: Expense[] = [
    {id: 'exp1', type: 'Fuel', amount: 15075, date: new Date('2024-07-28').toISOString(), tripId: '1', status: 'approved'},
    {id: 'exp2', type: 'Toll', amount: 2500, date: new Date('2024-07-28').toISOString(), tripId: '1', status: 'approved'},
    {id: 'exp3', type: 'Maintenance', amount: 35000, date: new Date('2024-07-25').toISOString(), tripId: '2', status: 'rejected'},
    {id: 'exp4', type: 'Fuel', amount: 12050, date: new Date('2024-07-22').toISOString(), tripId: '2', status: 'pending'},
]

// Simulate a global database for state that needs to be shared across components
// This is a workaround for the lack of a real backend.
let globalExpenses: Expense[] = initialExpenses;
const expenseListeners: React.Dispatch<React.SetStateAction<Expense[]>>[] = [];

const useGlobalExpenses = () => {
    const [expenses, setExpenses] = useState(globalExpenses);

    React.useEffect(() => {
        expenseListeners.push(setExpenses);
        return () => {
            const index = expenseListeners.indexOf(setExpenses);
            if (index > -1) {
                expenseListeners.splice(index, 1);
            }
        };
    }, []);

    const setGlobalExpenses = React.useCallback((newExpenses: Expense[] | ((prev: Expense[]) => Expense[])) => {
        if (typeof newExpenses === 'function') {
            globalExpenses = newExpenses(globalExpenses);
        } else {
            globalExpenses = newExpenses;
        }
        expenseListeners.forEach(listener => listener(globalExpenses));
    }, []);

    return [expenses, setGlobalExpenses] as const;
};


let globalTrips: Trip[] = [];
const tripListeners: React.Dispatch<React.SetStateAction<Trip[]>>[] = [];

const useGlobalTrips = () => {
    const [trips, setTrips] = useState(globalTrips);

    React.useEffect(() => {
        tripListeners.push(setTrips);
        return () => {
            const index = tripListeners.indexOf(setTrips);
            if (index > -1) {
                tripListeners.splice(index, 1);
            }
        };
    }, []);

    const setGlobalTrips = React.useCallback((newTrips: Trip[] | ((prev: Trip[]) => Trip[])) => {
        if (typeof newTrips === 'function') {
            globalTrips = newTrips(globalTrips);
        } else {
            globalTrips = newTrips;
        }
        tripListeners.forEach(listener => listener(globalTrips));
    }, []);

    return [trips, setGlobalTrips] as const;
};



// Create the provider component
export const SharedStateProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [expenses, setExpenses] = useGlobalExpenses();
  const [trips, setTrips] = useGlobalTrips();
  const [user, setUser] = useState<UserType | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from database on app start
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      try {
        console.log('🔄 Starting to load data from database...');
        
        // Try the refresh endpoint first
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const refreshResponse = await fetch('/api/refresh-data?type=all', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('✅ Refresh data response:', refreshData);
            
            if (refreshData.data && refreshData.data.vehicles) {
              setVehicles(refreshData.data.vehicles);
              console.log('✅ Loaded vehicles from database:', refreshData.data.vehicles);
            }
            
            if (refreshData.data && refreshData.data.employees) {
              setEmployees(refreshData.data.employees);
              console.log('✅ Loaded employees from database:', refreshData.data.employees);
            }
            
            if (refreshData.data && refreshData.data.trips) {
              setTrips(refreshData.data.trips);
              console.log('✅ Loaded trips from database:', refreshData.data.trips);
            }
            
            if (refreshData.data && refreshData.data.expenses) {
              setExpenses(refreshData.data.expenses);
              console.log('✅ Loaded expenses from database:', refreshData.data.expenses);
            }
            
            console.log('✅ Successfully loaded all data from refresh endpoint');
            return; // Success, no need to try individual endpoints
          } else {
            console.warn('⚠️ Refresh endpoint failed with status:', refreshResponse.status);
          }
        } catch (refreshError) {
          console.warn('⚠️ Refresh endpoint failed:', refreshError);
        }

        // Fallback to individual endpoints
        console.log('🔄 Trying individual endpoints...');
        
        try {
          const vehiclesResponse = await fetch('/api/admin/vehicles', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (vehiclesResponse.ok) {
            const dbVehicles = await vehiclesResponse.json();
            setVehicles(dbVehicles);
            console.log('✅ Loaded vehicles from individual endpoint:', dbVehicles);
          } else {
            console.warn('⚠️ Vehicles endpoint failed with status:', vehiclesResponse.status);
          }
        } catch (vehiclesError) {
          console.warn('⚠️ Vehicles endpoint failed:', vehiclesError);
        }

        try {
          const tripsResponse = await fetch('/api/admin/trips', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (tripsResponse.ok) {
            const dbTrips = await tripsResponse.json();
            setTrips(dbTrips);
            console.log('✅ Loaded trips from individual endpoint:', dbTrips);
          } else {
            console.warn('⚠️ Trips endpoint failed with status:', tripsResponse.status);
          }
        } catch (tripsError) {
          console.warn('⚠️ Trips endpoint failed:', tripsError);
        }

        try {
          const expensesResponse = await fetch('/api/employee/expenses', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (expensesResponse.ok) {
            const dbExpenses = await expensesResponse.json();
            setExpenses(dbExpenses);
            console.log('✅ Loaded expenses from individual endpoint:', dbExpenses);
          } else {
            console.warn('⚠️ Expenses endpoint failed with status:', expensesResponse.status);
          }
        } catch (expensesError) {
          console.warn('⚠️ Expenses endpoint failed:', expensesError);
        }

        try {
          const employeesResponse = await fetch('/api/employees', {
            method: 'GET',
            signal: controller.signal,
          });
          if (employeesResponse.ok) {
            const dbEmployeesRes = await employeesResponse.json();
            if (dbEmployeesRes.success && dbEmployeesRes.data) {
              setEmployees(dbEmployeesRes.data);
              console.log('✅ Loaded employees from individual endpoint:', dbEmployeesRes.data);
            }
          }
        } catch (employeesError) {
          console.warn('⚠️ Employees endpoint failed:', employeesError);
        }

        console.log('✅ Data loading process completed');

      } catch (error) {
        console.error('💥 Error loading data from database:', error);
        // Don't throw the error, just log it and continue
      } finally {
        setIsDataLoaded(true);
        console.log('✅ Data loading finished, isDataLoaded set to true');
      }
    };

    loadDataFromDatabase();
  }, []);

  const login = (username: string, password: string, adminCode?: string): boolean => {
    // Admin login - requires 6-digit admin code
    if (username === 'admin' && password === '123') {
      // Check if admin code is provided and valid (6 digits)
      if (!adminCode || adminCode.length !== 6 || !/^\d{6}$/.test(adminCode)) {
        return false;
      }
      // For demo purposes, accept any 6-digit code starting with '1'
      // In production, you would validate against a secure admin code
      if (adminCode.startsWith('1')) {
        setUser({ username: 'Admin', role: 'admin' });
        return true;
      }
      return false;
    }
    
    // Check password for employee
    if (password !== '123') {
      return false;
    }

    // Try to find employee in database employees list by Employee ID or Name
    const foundDbEmployee = employees.find(
      emp => emp.employeeId.toLowerCase() === username.toLowerCase() || 
             emp.name.toLowerCase() === username.toLowerCase()
    );

    if (foundDbEmployee) {
      // Find assigned vehicle from active vehicle list (to get vehicle.id)
      const vehicle = vehicles.find(
        v => v.assignedTo === foundDbEmployee.employeeId || 
             v.assignedTo === foundDbEmployee.name
      );
      setUser({
        username: foundDbEmployee.employeeId, // Set to employeeId so other pages match correctly
        role: 'employee',
        assignedVehicleId: vehicle?.id || foundDbEmployee.assignedVehicleId || null
      });
      return true;
    }

    // Fallback: Employee login (using assigned name as username)
    const employee = vehicles.find(v => v.assignedTo?.toLowerCase() === username.toLowerCase());
    if(employee) {
       setUser({ 
            username: employee.assignedTo!, 
            role: 'employee',
            assignedVehicleId: employee.id
        });
        return true;
    }


    // Fallback: Employee login (using plate number as username)
    const assignedVehicle = vehicles.find(v => v.plateNumber.toLowerCase() === username.toLowerCase() && v.assignedTo);
    if (assignedVehicle) {
        setUser({ 
            username: assignedVehicle.assignedTo!, 
            role: 'employee',
            assignedVehicleId: assignedVehicle.id
        });
        return true;
    }

    return false;
  };
  
  const logout = () => {
    setUser(null);
  };

  const refreshData = async () => {
    try {
      const refreshResponse = await fetch('/api/refresh-data?type=all');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        
        if (refreshData.data.vehicles) {
          setVehicles(refreshData.data.vehicles);
        }
        
        if (refreshData.data.trips) {
          setTrips(refreshData.data.trips);
        }
        
        if (refreshData.data.expenses) {
          setExpenses(refreshData.data.expenses);
        }
        
        if (refreshData.data.employees) {
          setEmployees(refreshData.data.employees);
        }
        
        console.log('Data refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    return false;
  };

  const addVehicle = (vehicle: Omit<Vehicle, "id">) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: new Date().toISOString(),
    };
    setVehicles(prev => [...prev, newVehicle]);
  };

  const updateVehicleStatus = (vehicleId: string, status: Vehicle['status']) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status } : v));
  }
  
  const updateVehicleFuelLevel = (vehicleId: string, fuelLevel: number) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, fuelLevel } : v));
  };

  const deleteVehicle = (vehicleId: string) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
  };
  
  const assignVehicle = (vehicleId: string, assignedTo: string | null) => {
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, assignedTo } : v));
  };

  const addExpense = async (expense: Omit<Expense, "id" | "status">) => {
    const newExpense: Expense = {
      ...expense,
      id: `expense_${Date.now()}`,
      status: 'pending'
    };
    
    try {
      // Save to database
      const response = await fetch('/api/employee/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newExpense,
          employeeId: 'current-user' // This should come from auth context
        }),
      });

      if (response.ok) {
        // Update local state only after successful database save
        setExpenses(prev => [...prev, newExpense]);
        console.log('Expense added successfully to database');
      } else {
        console.error('Failed to save expense to database');
        // Still update local state for immediate UI feedback
        setExpenses(prev => [...prev, newExpense]);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      // Still update local state for immediate UI feedback
      setExpenses(prev => [...prev, newExpense]);
    }
  }

  const updateExpenseStatus = (expenseId: string, status: Expense['status']) => {
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status } : e));
  }

  const addTrip = async (trip: Omit<Trip, 'id' | 'status' | 'expenses'>) => {
      const newTrip: Trip = {
          ...trip,
          id: `trip_${Date.now()}`,
          status: 'Planned',
          expenses: []
      };
      
      console.log('Creating trip with data:', newTrip);
      console.log('Available vehicles:', vehicles);
      console.log('Trip vehicleId:', trip.vehicleId);
      
      try {
        // Save trip to database
        const tripResponse = await fetch('/api/admin/trips', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newTrip),
        });

        // Also save route to routes collection for the routes page
        const selectedVehicle = vehicles.find(v => v.id === trip.vehicleId);
        console.log('Selected vehicle for route:', selectedVehicle);
        
        if (!selectedVehicle) {
          console.error('Vehicle not found for trip:', trip.vehicleId);
          throw new Error(`Vehicle with ID ${trip.vehicleId} not found`);
        }
        
        // Parse distance from trip plan
        let distance = 0;
        let emissions = 0;
        
        if (trip.plan?.distance && trip.plan.distance !== '—') {
          const distanceStr = trip.plan.distance.toString();
          const numericDistance = parseFloat(distanceStr.replace(/[^\d.]/g, ''));
          distance = isNaN(numericDistance) ? 0 : numericDistance;
          emissions = Math.round(distance * 0.18); // Rough estimate: 0.18g CO2 per km
        } else {
          // If no distance available, use a default estimate based on source/destination
          distance = 50; // Default 50km
          emissions = 9; // Default emissions for 50km
          console.warn('No distance available in trip plan, using default values');
        }
        
        console.log('Distance parsing:', {
          originalDistance: trip.plan?.distance,
          parsedDistance: distance,
          calculatedEmissions: emissions
        });
        
        const routeData = {
          source: trip.source,
          destination: trip.destination,
          vehicleType: selectedVehicle.type || 'truck',
          vehicleYear: selectedVehicle.year,
          distance: distance,
          emissions: emissions,
          routeSource: 'AI Trip Planner',
          fuelType: selectedVehicle.fuelType,
          routeType: trip.plan?.routeType || 'Highway',
          traffic: trip.plan?.traffic || 'Normal',
          ecoTip: trip.plan?.ecoTip || 'Drive efficiently to reduce emissions'
        };
        
        console.log('Creating route with data:', routeData);
        
        // Validate required fields before API call
        if (!routeData.source || !routeData.destination || !routeData.vehicleType || routeData.distance == null || routeData.emissions == null) {
          console.error('Missing required fields for route:', {
            source: routeData.source,
            destination: routeData.destination,
            vehicleType: routeData.vehicleType,
            distance: routeData.distance,
            emissions: routeData.emissions
          });
          throw new Error('Missing required fields for route creation');
        }

        const routeResponse = await fetch('/api/routes/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routeData),
        });

        if (tripResponse.ok && routeResponse.ok) {
          // Update local state only after successful database save
          setTrips(prev => [...prev, newTrip]);
          updateVehicleStatus(trip.vehicleId, 'On Trip');
          console.log('Trip and route added successfully to database');
        } else {
          const tripError = tripResponse.ok ? 'OK' : `Trip API failed: ${tripResponse.status} ${tripResponse.statusText}`;
          const routeError = routeResponse.ok ? 'OK' : `Route API failed: ${routeResponse.status} ${routeResponse.statusText}`;
          console.error('Failed to save trip or route to database:', { tripError, routeError });
          
          // Log response bodies for debugging
          if (!tripResponse.ok) {
            const tripErrorBody = await tripResponse.text();
            console.error('Trip API error body:', tripErrorBody);
          }
          if (!routeResponse.ok) {
            const routeErrorBody = await routeResponse.text();
            console.error('Route API error body:', routeErrorBody);
          }
          
          // Still update local state for immediate UI feedback
          setTrips(prev => [...prev, newTrip]);
          updateVehicleStatus(trip.vehicleId, 'On Trip');
        }
      } catch (error) {
        console.error('Error saving trip:', error);
        // Still update local state for immediate UI feedback
        setTrips(prev => [...prev, newTrip]);
        updateVehicleStatus(trip.vehicleId, 'On Trip');
      }
  }

  const updateTripStatus = async (tripId: string, status: Trip['status']) => {
      const updatedTrip = {
          id: tripId,
          status,
          endDate: ['Completed', 'Cancelled'].includes(status) ? new Date().toISOString() : undefined
      };
      
      try {
        // Update in database
        const response = await fetch('/api/admin/trips', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTrip),
        });

        if (response.ok) {
          // Update local state only after successful database save
          setTrips(prev => prev.map(t => {
              if (t.id === tripId) {
                  const vehicleId = t.vehicleId;
                  if (status === 'Completed' || status === 'Cancelled') {
                      updateVehicleStatus(vehicleId, 'Idle');
                  }
                   if (status === 'Ongoing') {
                      updateVehicleStatus(vehicleId, 'On Trip');
                  }
                  return { ...t, status, endDate: updatedTrip.endDate };
              }
              return t;
          }));
          console.log('Trip status updated in database');
        } else {
          console.error('Failed to update trip status in database');
          // Still update local state for immediate UI feedback
          setTrips(prev => prev.map(t => {
              if (t.id === tripId) {
                  const vehicleId = t.vehicleId;
                  if (status === 'Completed' || status === 'Cancelled') {
                      updateVehicleStatus(vehicleId, 'Idle');
                  }
                   if (status === 'Ongoing') {
                      updateVehicleStatus(vehicleId, 'On Trip');
                  }
                  return { ...t, status, endDate: updatedTrip.endDate };
              }
              return t;
          }));
        }
      } catch (error) {
        console.error('Error updating trip status:', error);
        // Still update local state for immediate UI feedback
        setTrips(prev => prev.map(t => {
            if (t.id === tripId) {
                const vehicleId = t.vehicleId;
                if (status === 'Completed' || status === 'Cancelled') {
                    updateVehicleStatus(vehicleId, 'Idle');
                }
                 if (status === 'Ongoing') {
                    updateVehicleStatus(vehicleId, 'On Trip');
                }
                return { ...t, status, endDate: updatedTrip.endDate };
            }
            return t;
        }));
      }
  }

  const value = {
    vehicles,
    employees,
    expenses,
    trips,
    user,
    login,
    logout,
    refreshData,
    addVehicle,
    updateVehicleStatus,
    updateVehicleFuelLevel,
    deleteVehicle,
    assignVehicle,
    addExpense,
    updateExpenseStatus,
    addTrip,
    updateTripStatus
  };

  return (
    <SharedStateContext.Provider value={value}>
      {children}
    </SharedStateContext.Provider>
  );
};


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { vehicles, trips, user, logout } = useSharedState();

  if (!user) {
    return <LoginPage />;
  }

  const menuItems = user.role === 'admin' ? adminMenuItems : employeeMenuItems;
  const userEmail = user.role === 'admin' ? 'admin@fleet-core.com' : `${user.username.toLowerCase().replace(' ', '.')}@fleet-core.com`;
  const userName = user.username;
  const userFallback = userName.substring(0, 2).toUpperCase();

  return (
    <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
            <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
              <SidebarHeader className="p-4 border-b border-sidebar-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-headline text-lg font-bold italic shadow-luxury">
                            F
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold font-headline text-base tracking-tight italic">Fleet-Core</span>
                            <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">Logistics Ledger</span>
                        </div>
                    </div>
                </div>
              </SidebarHeader>
              <SidebarContent className="p-3">
                <SidebarMenu className="space-y-1">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={{
                          children: item.label,
                          className: "bg-primary text-primary-foreground font-mono text-xs",
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                          pathname === item.href
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-luxury"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter className="space-y-4 border-t border-sidebar-border/50 p-4 bg-sidebar-background/40">
                 <Button 
                   variant="ghost" 
                   className="w-full justify-start text-xs font-mono tracking-wider uppercase text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50" 
                   onClick={logout}
                 >
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Logout
                 </Button>
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-8 w-8 border border-sidebar-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${userFallback}&backgroundColor=transparent`} alt="User" />
                    <AvatarFallback className="font-mono text-xs">{userFallback}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate text-foreground">{userName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{userEmail}</span>
                  </div>
                </div>
              </SidebarFooter>
            </Sidebar>
            <div className="flex flex-col w-full min-w-0">
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-md px-4 md:px-6">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="md:hidden" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">System Node:</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                        SECURE_ON_LINE
                      </span>
                    </div>
                  </div>
                  
                  {/* Dynamic stats in status bar */}
                  <div className="hidden lg:flex items-center gap-6">
                    <div className="flex items-center gap-2 border-r border-border/60 pr-6">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Fleet Assets:</span>
                      <span className="text-xs font-mono-stats font-semibold">{vehicles.length} vhcl</span>
                    </div>
                    <div className="flex items-center gap-2 border-r border-border/60 pr-6">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Active Ops:</span>
                      <span className="text-xs font-mono-stats font-semibold">{trips.filter(t => t.status === 'Ongoing').length} trips</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Maintenance:</span>
                      <span className={`text-xs font-mono-stats font-semibold ${vehicles.filter(v => v.status === 'Maintenance').length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {vehicles.filter(v => v.status === 'Maintenance').length} alert
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     {user.role === 'admin' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 relative hover:bg-accent/40 rounded-full">
                                    <Bell className="h-4 w-4" />
                                    {vehicles.filter(v => v.status === 'Maintenance').length > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive animate-ping" />
                                    )}
                                    <span className="sr-only">Notifications</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 font-mono text-xs p-1">
                                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Operational Bulletins</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="py-2 cursor-pointer">
                                  <span>● SYS_ALERT: TRK-003 status maintenance</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="py-2 cursor-pointer">
                                  <span>● LEDGER: Expenses auto-verified</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                     <ThemeToggle />
                  </div>
                </header>
                <SidebarInset className="bg-background flex flex-col flex-1 p-0 overflow-y-auto">{children}</SidebarInset>
            </div>
          </div>
    </SidebarProvider>
  );
}

    