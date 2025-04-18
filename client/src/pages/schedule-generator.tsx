import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Loader2, CalendarDays, Check, AlertCircle, Users, Edit, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { User, ShiftPreference, Shift } from "@shared/schema";

export default function ScheduleGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  // 0-based month (0 = januari, 11 = december) voor consistent gebruik met Date object
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generatedSchedule, setGeneratedSchedule] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  
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

  // Haal alle gebruikers op
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Kon gebruikers niet ophalen");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Haal alle voorkeuren op voor de geselecteerde maand
  const { data: preferences = [], refetch: refetchPreferences } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/preferences/all", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preferences/all?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Haal alle shifts op voor de geselecteerde maand
  const { data: shifts = [], refetch: refetchShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Kon shifts niet ophalen");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Mutatie om de planning te genereren
  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/schedule/generate", {
        month: selectedMonth + 1,
        year: selectedYear,
      });
      if (!res.ok) throw new Error("Kon planning niet genereren");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedSchedule(data);
      toast({
        title: "Succes",
        description: "Planning gegenereerd voor " + format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl }),
      });
      refetchShifts();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het genereren van de planning",
        variant: "destructive",
      });
    },
  });

  // Helper functie om voorkeuren in uren per gebruiker te berekenen
  const countUserPreferencesHours = (userId: number) => {
    // Elke voorkeur vertegenwoordigt ongeveer 12 uur (een volledige shift)
    const prefsCount = preferences.filter(p => p.userId === userId).length;
    return prefsCount * 12;
  };

  // Helper functie om gegenereerde shifts in uren per gebruiker te berekenen
  const countUserShiftsHours = (userId: number) => {
    const userShifts = shifts.filter(s => s.userId === userId);
    // Elke shift is 12 uur (standaard shift duur)
    return userShifts.length * 12;
  };
  
  // Mutatie om een shift te updaten
  const updateShiftMutation = useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: number; userId: number }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${shiftId}`, {
        userId: userId,
        status: userId === 0 ? "open" : "planned"
      });
      if (!res.ok) throw new Error("Kon shift niet updaten");
      return res.json();
    },
    onSuccess: () => {
      setEditingShift(null);
      toast({
        title: "Succes",
        description: "Shift succesvol bijgewerkt",
      });
      // Vernieuw de shifts na een update
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het updaten van de shift",
        variant: "destructive",
      });
    },
  });
  
  // Open edit dialog
  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setSelectedUserId(shift.userId);
  };
  
  // Handle save
  const handleSaveShift = () => {
    if (editingShift) {
      updateShiftMutation.mutate({
        shiftId: editingShift.id,
        userId: selectedUserId
      });
    }
  };

  // Maanden voor de select box
  const months = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maart" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Augustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Jaren voor de select box
  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Planning Generator</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
        >
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Genereer Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Planning periode
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-28 text-center">
                    {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Testdata genereren */}
              <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Test Voorkeuren Genereren
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Genereer willekeurige voorkeuren voor alle gebruikers voor de geselecteerde maand om de planning tool te testen.
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const res = await apiRequest("POST", "/api/preferences/generate-test-data", {
                        month: selectedMonth + 1,
                        year: selectedYear
                      });
                      
                      if (!res.ok) {
                        throw new Error("Kon test data niet genereren");
                      }
                      
                      const data = await res.json();
                      toast({
                        title: "Test Data Gegenereerd",
                        description: data.message,
                      });
                      
                      // Ververs de gegevens
                      refetchPreferences();
                    } catch (error) {
                      toast({
                        title: "Fout",
                        description: error instanceof Error ? error.message : "Onbekende fout bij genereren testdata",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Genereer Test Voorkeuren
                </Button>
              </div>

              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-gray-500">
                  Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </span>
                <Button
                  onClick={() => generateScheduleMutation.mutate()}
                  disabled={generateScheduleMutation.isPending}
                >
                  {generateScheduleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bezig met genereren...
                    </>
                  ) : (
                    <>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Genereer Planning
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beschikbaarheid Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Overzicht beschikbaarheid per medewerker (in uren)</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-center">Gevraagde Uren</TableHead>
                  <TableHead className="text-center">Geplande Uren</TableHead>
                  <TableHead className="text-center">Max Uren</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-center">{countUserPreferencesHours(user.id)}</TableCell>
                    <TableCell className="text-center">{countUserShiftsHours(user.id)}</TableCell>
                    <TableCell className="text-center">{user.maxHours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gegenereerde Planning</CardTitle>
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
          {shifts.filter(shift => {
              const shiftDate = new Date(shift.date);
              return shiftDate.getMonth() === selectedMonth && shiftDate.getFullYear() === selectedYear;
            }).length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Table>
                <TableCaption>Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</TableCaption>
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
                  {shifts
                    .filter(shift => {
                      const shiftDate = new Date(shift.date);
                      return shiftDate.getMonth() === selectedMonth && shiftDate.getFullYear() === selectedYear;
                    })
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {shift.status === "planned" ? (
                                  <Check className="h-4 w-4 text-green-500 mr-1" />
                                ) : shift.status === "open" ? (
                                  <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                ) : null}
                                {shift.status === "open" ? "Open" : "Ingepland"}
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditShift(shift)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Er zijn nog geen shifts gegenereerd voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Shift Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Shift Bewerken</DialogTitle>
            <DialogDescription>
              Pas de toewijzing voor deze shift aan.
            </DialogDescription>
          </DialogHeader>
          
          {editingShift && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Datum</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {format(new Date(editingShift.date), "dd MMMM yyyy", { locale: nl })}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="shift-type">Type Shift</Label>
                <div className="p-2 border rounded-md bg-gray-50">
                  {editingShift.type === "day" ? "Dag" : "Nacht"}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ambulancier">Ambulancier</Label>
                <Select
                  value={selectedUserId.toString()}
                  onValueChange={(value) => setSelectedUserId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer ambulancier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">-- Niet toegewezen --</SelectItem>
                    {users
                      .filter(u => u.role === "ambulancier")
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShift(null)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleSaveShift}
              disabled={updateShiftMutation.isPending}
            >
              {updateShiftMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bezig met opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}