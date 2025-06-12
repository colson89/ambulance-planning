import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Calendar, Clock, LogOut, UserCog, CalendarDays, ChevronLeft, ChevronRight, Check, AlertCircle, UserPlus, Settings, BarChart3, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Shift, ShiftPreference, User as UserType } from "@shared/schema";
import { useLocation } from "wouter";
import { format, addMonths, parse, setMonth, setYear, getMonth, getYear, isEqual, parseISO, isWeekend } from "date-fns";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Staat voor maand/jaar selectie
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts"],
  });
  
  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: preferences = [], isLoading: preferencesLoading } = useQuery<any[]>({
    queryKey: ["/api/preferences/all"],
  });

  const isLoading = shiftsLoading || usersLoading || preferencesLoading;
  
  // Functie om beschikbare medewerkers te tonen op basis van voorkeuren
  const getUsersAvailableForDate = (date: Date | null, shiftType: "day" | "night") => {
    // Veiligheidsmaatregel: returnt een lege array als de datum null is
    if (!date) return [];
    
    try {
      const result: Array<{
        userId: number;
        username: string;
        firstName: string;
        lastName: string;
        preferenceType: string;
        canSplit: boolean;
        isAssigned: boolean;
        isAvailable: boolean;
        hours: number;
        startTime?: string | null;
        endTime?: string | null;
      }> = [];
      
      // Gezochte datum in YMD formaat voor eenvoudigere vergelijking
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript maanden zijn 0-11
      const day = date.getDate();
      const gezochteYMD = `${year}-${month}-${day}`;
      
      // Haal shifts op voor deze datum
      const matchingShifts = shifts.filter(shift => {
        if (!shift.date) return false;
        
        const shiftDate = new Date(shift.date);
        const shiftYMD = `${shiftDate.getFullYear()}-${shiftDate.getMonth() + 1}-${shiftDate.getDate()}`;
        
        // Controleer het shift type (dag of nacht)
        const isTypeMatch = (shiftType === "day" && shift.type === "day") || 
                           (shiftType === "night" && shift.type === "night");
        
        return shiftYMD === gezochteYMD && isTypeMatch;
      });
      
      // Voor elke gevonden shift, zoek de toegewezen medewerker
      const assignedUserIds = new Set();
      const assignedShiftDetails = new Map(); // Map userId -> shift details
      
      matchingShifts.forEach(shift => {
        if (shift.userId > 0) {
          assignedUserIds.add(shift.userId);
          assignedShiftDetails.set(shift.userId, {
            startTime: shift.startTime,
            endTime: shift.endTime,
            isSplitShift: shift.isSplitShift
          });
        }
      });
      
      // Haal alle ambulanciers EN admins op die shifts kunnen draaien
      const ambulanciers = users.filter(u => u.role === "ambulancier" || u.role === "admin");
      
      // Zoek in voorkeuren voor deze datum
      const allPreferences = preferences.flatMap(userPrefs => userPrefs.preferences || []);
      const preferencesForDate = allPreferences.filter(pref => {
        if (!pref || !pref.date) return false;
        const prefDate = new Date(pref.date);
        const prefYMD = `${prefDate.getFullYear()}-${prefDate.getMonth() + 1}-${prefDate.getDate()}`;
        return prefYMD === gezochteYMD;
      });
      

      
      // Maak een Map van gebruikers met hun voorkeuren en tijdsblokken
      const userPreferencesMap = new Map();
      preferencesForDate.forEach(pref => {
        // Als de voorkeur niet 'unavailable' is en het shift type komt overeen
        if (pref.type !== "unavailable" && pref.type === shiftType) {
          userPreferencesMap.set(pref.userId, {
            startTime: pref.startTime,
            endTime: pref.endTime,
            preferenceType: pref.type,
            canSplit: pref.canSplit || false
          });
        }
      });
      
      // Toon alle ambulanciers en markeer op basis van beschikbaarheid en toewijzing
      ambulanciers.forEach(ambulancier => {
        const isAssigned = assignedUserIds.has(ambulancier.id);
        const userPreference = userPreferencesMap.get(ambulancier.id);
        const isAvailable = !!userPreference;
        
        // Controleer of de ambulancier uren wil werken (hours > 0)
        const wantsToWork = ambulancier.hours > 0;
        
        // Bepaal het preferentietype
        let preferenceType = "unavailable";
        if (isAssigned) {
          preferenceType = "assigned";
        } else if (isAvailable && wantsToWork) {
          preferenceType = "available";
        }
        
        // Alleen toevoegen als ze toegewezen zijn OF een voorkeur hebben ingediend
        if (isAssigned || isAvailable) {
          const shiftDetails = assignedShiftDetails.get(ambulancier.id);
          result.push({
            userId: ambulancier.id,
            username: ambulancier.username || "Onbekend",
            firstName: ambulancier.firstName || "",
            lastName: ambulancier.lastName || "",
            preferenceType: preferenceType,
            canSplit: userPreference?.canSplit || false,
            isAssigned: isAssigned,
            isAvailable: isAvailable && wantsToWork,
            hours: ambulancier.hours || 0,
            startTime: isAssigned ? shiftDetails?.startTime : userPreference?.startTime,
            endTime: isAssigned ? shiftDetails?.endTime : userPreference?.endTime
          });
        }
      });
      
      // Sorteer de resultaten: eerst beschikbare niet-toegewezen, dan toegewezen, dan rest
      result.sort((a, b) => {
        // Eerst sorteren op basis van beschikbaarheid en toewijzing
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1; // Beschikbare gebruikers eerst
        }
        
        if (a.isAssigned !== b.isAssigned) {
          return a.isAssigned ? 1 : -1; // Niet-toegewezen gebruikers eerder
        }
        
        // Daarna op naam
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      return result;
    } catch (error) {
      console.error("Algemene fout in getUsersAvailableForDate:", error);
      return [];
    }
  };

  const today = new Date();
  const currentMonthDeadline = new Date(today.getFullYear(), today.getMonth(), 1, 23, 0);
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

  // Handler voor het openen van het beschikbaarheidsvenster
  const handleDateClick = (date: Date, shiftType: "day" | "night") => {
    setSelectedDate(date);
    setShowAvailabilityDialog(true);
  };
  
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
              <Button 
                variant="outline"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Weekdag Instellingen
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/statistics")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistieken
              </Button>
            </>
          )}
          {/* Shift Planner knop verwijderd, alleen "Voorkeuren Opgeven" behouden */}
          <Button 
            variant="outline"
            onClick={() => setLocation("/profile")}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Profiel
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
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto font-normal text-left hover:no-underline"
                              onClick={() => handleDateClick(new Date(shift.date), shift.type as "day" | "night")}
                            >
                              {format(new Date(shift.date), "dd MMMM (EEEE)", { locale: nl })}
                            </Button>
                          </TableCell>
                          <TableCell>{shift.type === "day" ? "Dag" : "Nacht"}</TableCell>
                          <TableCell>
                            {shift.startTime && shift.endTime ? (
                              (() => {
                                const startHour = new Date(shift.startTime).getUTCHours();
                                const endHour = new Date(shift.endTime).getUTCHours();
                                
                                if (shift.type === "night") {
                                  if (shift.isSplitShift) {
                                    if (startHour === 19 && endHour === 23) {
                                      return "19:00 - 23:00";
                                    } else if (startHour === 23 && endHour === 7) {
                                      return "23:00 - 07:00";
                                    } else {
                                      return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                    }
                                  } else {
                                    return "19:00 - 07:00";
                                  }
                                } else {
                                  if (shift.isSplitShift) {
                                    if (startHour === 7 && endHour === 13) {
                                      return "07:00 - 13:00";
                                    } else if (startHour === 13 && endHour === 19) {
                                      return "13:00 - 19:00";
                                    } else {
                                      return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                    }
                                  } else {
                                    return "07:00 - 19:00";
                                  }
                                }
                              })()
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {shift.status === "open" ? (
                              <span className="text-red-500 font-medium">Niet ingevuld</span>
                            ) : (
                              <span className={isCurrentUserShift ? "font-bold text-green-600" : ""}>
                                {shiftUser ? `${shiftUser.firstName} ${shiftUser.lastName}` : "Onbekend"}
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
      
      {/* Beschikbaarheidsvenster */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Beschikbaarheid voor {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: nl }) : ""}
            </DialogTitle>
            <DialogDescription>
              Overzicht van wie beschikbaar is voor deze shift
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="outline" className="py-1.5">
                  {selectedDate && isWeekend(selectedDate) ? "Weekend" : "Weekdag"}
                </Badge>
              </div>
              
              <div className="space-y-6">
                {/* Dag shift (alleen voor weekend) */}
                {selectedDate && isWeekend(selectedDate) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Dag Shift (07:00 - 19:00)</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Naam</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Beschikbare tijden</TableHead>
                            <TableHead>Uren</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getUsersAvailableForDate(selectedDate, "day").map((u) => (
                            <TableRow key={u.userId}>
                              <TableCell>
                                <div className="font-medium">{`${u.firstName} ${u.lastName}`}</div>
                              </TableCell>
                              <TableCell>
                                {u.isAssigned ? (
                                  <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                                ) : u.isAvailable ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                                ) : u.hours === 0 ? (
                                  <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {u.startTime && u.endTime ? (
                                  (() => {
                                    const startHour = new Date(u.startTime).getUTCHours();
                                    const endHour = new Date(u.endTime).getUTCHours();
                                    return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                  })()
                                ) : u.isAvailable || u.isAssigned ? (
                                  "Hele dag (07:00 - 19:00)"
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>{u.hours}</TableCell>
                            </TableRow>
                          ))}
                          
                          {getUsersAvailableForDate(selectedDate, "day").length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4">
                                Geen beschikbare ambulanciers gevonden
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {/* Nacht shift (altijd) */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Nacht Shift (19:00 - 07:00)</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Naam</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Beschikbare tijden</TableHead>
                          <TableHead>Uren</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getUsersAvailableForDate(selectedDate, "night").map((u) => (
                          <TableRow key={u.userId}>
                            <TableCell>
                              <div className="font-medium">{`${u.firstName} ${u.lastName}`}</div>
                            </TableCell>
                            <TableCell>
                              {u.isAssigned ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600">Toegewezen</Badge>
                              ) : u.isAvailable ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Beschikbaar</Badge>
                              ) : u.hours === 0 ? (
                                <Badge variant="outline" className="text-gray-500">Werkt geen uren</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-500">Niet beschikbaar</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.startTime && u.endTime ? (
                                (() => {
                                  const startHour = new Date(u.startTime).getUTCHours();
                                  const endHour = new Date(u.endTime).getUTCHours();
                                  return `${startHour.toString().padStart(2, '0')}:00 - ${endHour.toString().padStart(2, '0')}:00`;
                                })()
                              ) : u.isAvailable || u.isAssigned ? (
                                "Hele nacht (19:00 - 07:00)"
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{u.hours}</TableCell>
                          </TableRow>
                        ))}
                        
                        {getUsersAvailableForDate(selectedDate, "night").length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              Geen beschikbare ambulanciers gevonden
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}