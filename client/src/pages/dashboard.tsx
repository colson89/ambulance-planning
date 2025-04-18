import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Calendar, Clock, LogOut, UserCog, CalendarDays, ChevronLeft, ChevronRight, Check, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shift, ShiftPreference, User } from "@shared/schema";
import { useLocation } from "wouter";
import { format, addMonths, parse, setMonth, setYear, getMonth, getYear, isEqual, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Staat voor maand/jaar selectie
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });
  
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const isLoading = shiftsLoading || usersLoading;

  const today = new Date();
  const currentMonthDeadline = new Date(today.getFullYear(), today.getMonth(), 19, 23, 0);
  const isPastDeadline = today > currentMonthDeadline;

  // Als we voorbij de deadline zijn van deze maand, toon dan de planning voor de maand na volgende maand
  const planningMonth = addMonths(today, isPastDeadline ? 2 : 1);
  
  // Navigatie functies voor maand/jaar
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };
  
  // Filter shifts voor de geselecteerde maand en jaar
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return getMonth(shiftDate) === selectedMonth && getYear(shiftDate) === selectedYear;
    });
  }, [shifts, selectedMonth, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dayShifts = shifts?.filter(s => s.type === 'day').length || 0;
  const totalHours = shifts?.reduce((acc, s) => {
    const duration = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    return acc + (duration / (1000 * 60 * 60));
  }, 0) || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {user?.role === "admin" && (
            <>
              <Button 
                variant="outline"
                onClick={() => setLocation("/users")}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Gebruikersbeheer
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/schedule")}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Planning
              </Button>
            </>
          )}
          <Button 
            variant="outline"
            onClick={() => setLocation("/shifts")}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Shift Planner
          </Button>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2">Shift Planning Status</h2>
            <p className="text-muted-foreground">
              {format(planningMonth, "MMMM yyyy", { locale: nl })} is nu open voor voorkeuren.
              <br />
              {isPastDeadline 
                ? `U kunt tot ${format(addMonths(currentMonthDeadline, 1), "d MMMM HH:mm", { locale: nl })} uw voorkeuren opgeven.`
                : `U kunt tot ${format(currentMonthDeadline, "d MMMM HH:mm", { locale: nl })} uw voorkeuren opgeven.`
              }
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Button 
                onClick={() => setLocation("/shifts")}
                variant="outline"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Voorkeuren Opgeven
              </Button>
              
              {/* Admin knoppen kunnen hier worden toegevoegd */}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rol</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.role === 'admin' ? "Administrator" : "Ambulancier"}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Planning section georganiseerd per maand/jaar */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mijn Planning</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShifts.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">
              Geen shifts gevonden voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Table>
                <TableCaption>
                  Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </TableCaption>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tijd</TableHead>
                    <TableHead>Medewerker</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((shift) => {
                      const shiftUser = users.find(u => u.id === shift.userId);
                      const isCurrentUserShift = shift.userId === user?.id;
                      return (
                        <TableRow 
                          key={shift.id}
                          className={`${shift.status === "open" ? "bg-red-50" : ""} ${isCurrentUserShift ? "bg-green-50" : ""}`}
                        >
                          <TableCell>{format(new Date(shift.date), "dd MMMM (EEEE)", { locale: nl })}</TableCell>
                          <TableCell>{shift.type === "day" ? "Dag" : "Nacht"}</TableCell>
                          <TableCell>
                            {shift.startTime && shift.endTime ? (
                              `${format(new Date(shift.startTime), "HH:mm")} - ${format(new Date(shift.endTime), "HH:mm")}`
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {shift.status === "open" ? (
                              <span className="text-red-500 font-medium">Niet ingevuld</span>
                            ) : (
                              <span className={isCurrentUserShift ? "font-bold text-green-600" : ""}>
                                {shiftUser?.username || "Onbekend"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {shift.status === "planned" ? (
                                <Check className="h-4 w-4 text-green-500 mr-1" />
                              ) : shift.status === "open" ? (
                                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                              ) : null}
                              {shift.status === "open" ? "Open" : "Ingepland"}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}