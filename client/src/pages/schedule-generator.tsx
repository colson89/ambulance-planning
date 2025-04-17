import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Loader2, CalendarDays, Check, AlertCircle, Users, Edit, Save } from "lucide-react";
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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [generatedSchedule, setGeneratedSchedule] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);

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
    queryKey: ["/api/preferences/all", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/preferences/all?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Kon voorkeuren niet ophalen");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Haal alle shifts op voor de geselecteerde maand
  const { data: shifts = [], refetch: refetchShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shifts?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Kon shifts niet ophalen");
      return res.json();
    },
    enabled: !!user && user.role === "admin",
  });

  // Mutatie om de planning te genereren
  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/schedule/generate", {
        month: selectedMonth,
        year: selectedYear,
      });
      if (!res.ok) throw new Error("Kon planning niet genereren");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedSchedule(data);
      toast({
        title: "Succes",
        description: "Planning gegenereerd voor " + format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: nl }),
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

  // Helper functie om voorkeuren per gebruiker te tellen
  const countUserPreferences = (userId: number) => {
    return preferences.filter(p => p.userId === userId).length;
  };

  // Helper functie om gegenereerde shifts per gebruiker te tellen
  const countUserShifts = (userId: number) => {
    return shifts.filter(s => s.userId === userId).length;
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
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Maand</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Maand" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Jaar</label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Jaar" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        month: selectedMonth,
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
                  Planning voor {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: nl })}
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
              <TableCaption>Overzicht beschikbaarheid per medewerker</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-center">Voorkeuren</TableHead>
                  <TableHead className="text-center">Geplande Shifts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-center">{countUserPreferences(user.id)}</TableCell>
                    <TableCell className="text-center">{countUserShifts(user.id)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gegenereerde Planning</CardTitle>
        </CardHeader>
        <CardContent>
          {shifts.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Table>
                <TableCaption>Planning voor {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: nl })}</TableCaption>
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
                  {shifts.map((shift) => {
                    const shiftUser = users.find(u => u.id === shift.userId);
                    return (
                      <TableRow 
                        key={shift.id}
                        className={shift.status === "open" ? "bg-red-50" : ""}
                      >
                        <TableCell>{format(new Date(shift.date), "dd MMMM", { locale: nl })}</TableCell>
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
                            shiftUser?.username || "Onbekend"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {shift.status === "planned" ? (
                              <Check className="h-4 w-4 text-green-500 mr-1" />
                            ) : shift.status === "open" ? (
                              <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                            ) : null}
                            {shift.status === "open" ? "Open" : shift.status}
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
                Er zijn nog geen shifts gegenereerd voor deze maand.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}