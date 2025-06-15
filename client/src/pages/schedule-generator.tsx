import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, addMonths, isWeekend, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Home, Loader2, CalendarDays, Check, AlertCircle, Users, Edit, Save, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Clock, Split, Merge, Zap, UserPlus, RefreshCw, Calendar, Eye, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState<boolean>(false);
  const [isGeneratingTestPreferences, setIsGeneratingTestPreferences] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [deleteProgressPercentage, setDeleteProgressPercentage] = useState<number>(0);
  const [deleteProgressMessage, setDeleteProgressMessage] = useState<string>("");
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [generateProgressPercentage, setGenerateProgressPercentage] = useState<number>(0);
  const [generateProgressMessage, setGenerateProgressMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Query om de laatste tijdstempel voor gegenereerde testvoorkeuren op te halen (per maand)
  const { data: lastGeneratedTimestamp, isLoading: isLoadingTimestamp } = useQuery({
    queryKey: ["/api/system/settings/last-preferences-generated", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/system/settings/last-preferences-generated?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!res.ok) {
        console.error("Error fetching last generated timestamp");
        return null;
      }
      return res.json();
    }
  });

  // Query om de laatste tijdstempel voor planning generatie op te halen (per maand)
  const { data: lastScheduleTimestamp, isLoading: isLoadingScheduleTimestamp } = useQuery({
    queryKey: ["/api/system/settings/last-schedule-generated", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/system/settings/last-schedule-generated?month=${selectedMonth + 1}&year=${selectedYear}`);
      if (!res.ok) {
        console.error("Error fetching last schedule timestamp");
        return null;
      }
      return res.json();
    }
  });
  // Mutatie om alle shift tijden te corrigeren
  const fixShiftTimesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shifts/fix-times");
      if (!res.ok) throw new Error("Kon shift tijden niet corrigeren");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Succes",
        description: data.message || "Shift tijden succesvol gecorrigeerd",
      });
      // Vernieuw de shifts na een update
      refetchShifts();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het corrigeren van shift tijden",
        variant: "destructive",
      });
    },
  });
  const [lastGeneratedDate, setLastGeneratedDate] = useState<Date | null>(null);
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

  // Haal alle opmerkingen op voor de geselecteerde maand
  const { data: userComments = [] } = useQuery({
    queryKey: ["/api/comments/all", selectedMonth + 1, selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comments/all/${selectedMonth + 1}/${selectedYear}`);
      if (!res.ok && res.status !== 404) throw new Error("Kon opmerkingen niet ophalen");
      return res.status === 404 ? [] : res.json();
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
      setLastGeneratedDate(new Date());
      toast({
        title: "Succes",
        description: "Planning gegenereerd voor " + format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl }),
      });
      refetchShifts();
      // Vernieuw ook de planning timestamp voor de huidige maand
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings/last-schedule-generated", selectedMonth + 1, selectedYear] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het genereren van de planning",
        variant: "destructive",
      });
    },
  });
  
  // Mutatie om alle shifts voor een maand te verwijderen
  const deleteMonthShiftsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/shifts/month", {
        month: selectedMonth + 1,
        year: selectedYear
      });
      if (!res.ok) throw new Error("Kon shifts niet verwijderen");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Succes",
        description: data.message || `Shifts succesvol verwijderd voor ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}`,
      });
      // Vernieuw alle shift-gerelateerde cache entries
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.removeQueries({ queryKey: ["/api/shifts"] });
      // Vernieuw specifiek de dashboard query voor deze maand
      queryClient.invalidateQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear] });
      queryClient.removeQueries({ queryKey: ["/api/shifts", selectedMonth + 1, selectedYear] });
      refetchShifts();
      setLastGeneratedDate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het verwijderen van shifts",
        variant: "destructive",
      });
    },
  });

  // Helper functie om beschikbare uren uit voorkeuren voor deze maand te tellen
  const countAvailableHoursFromPreferences = (userId: number) => {
    // Elke voorkeur vertegenwoordigt ongeveer 12 uur (een volledige shift)
    const prefsCount = preferences.filter(p => p.userId === userId).length;
    return prefsCount * 12;
  };

  // Functie om beschikbare medewerkers te tonen op basis van voorkeuren
  const getUsersAvailableForDate = (date: Date | null, shiftType: "day" | "night") => {
    // Veiligheidsmaatregel: returnt een lege array als de datum null is
    if (!date) return [];
    
    console.log("Zoeken naar beschikbare medewerkers voor datum:", date);
    console.log("Shift type:", shiftType);
    
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
      }> = [];
      
      // Gezochte datum in YMD formaat voor eenvoudigere vergelijking
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript maanden zijn 0-11
      const day = date.getDate();
      const gezochteYMD = `${year}-${month}-${day}`;
      
      console.log(`Zoeken naar shifts voor datum: ${gezochteYMD}`);
      
      // In plaats van te zoeken in voorkeuren, kijken we direct naar de shifts
      // om te zien wie er gepland staat voor deze datum
      const matchingShifts = shifts.filter(shift => {
        if (!shift.date) return false;
        
        const shiftDate = new Date(shift.date);
        const shiftYMD = `${shiftDate.getFullYear()}-${shiftDate.getMonth() + 1}-${shiftDate.getDate()}`;
        
        // Controleer het shift type (dag of nacht)
        const isTypeMatch = (shiftType === "day" && shift.type === "day") || 
                           (shiftType === "night" && shift.type === "night");
        
        return shiftYMD === gezochteYMD && isTypeMatch;
      });
      
      console.log(`Gevonden aantal shifts voor deze datum en type: ${matchingShifts.length}`);
      
      // Voor elke gevonden shift, zoek de toegewezen medewerker
      const assignedUserIds = new Set();
      matchingShifts.forEach(shift => {
        if (shift.userId > 0) {
          assignedUserIds.add(shift.userId);
        }
      });
      
      console.log(`Aantal toegewezen gebruikers: ${assignedUserIds.size}`);
      
      // Haal alle ambulanciers EN admins op die shifts kunnen draaien
      const ambulanciers = users.filter(u => u.role === "ambulancier" || u.role === "admin");
      
      // Filter voorkeuren voor de geselecteerde datum en shift type
      const preferencesForDate = preferences.filter(pref => {
        if (!pref || !pref.date) return false;
        const prefDate = new Date(pref.date);
        const prefYMD = `${prefDate.getFullYear()}-${prefDate.getMonth() + 1}-${prefDate.getDate()}`;
        return prefYMD === gezochteYMD;
      });
      
      console.log(`Gevonden voorkeuren voor datum ${gezochteYMD}:`, preferencesForDate.length);
      
      // Maak een Set van gebruikers die beschikbaar zijn volgens voorkeur
      const availableUserIds = new Set();
      preferencesForDate.forEach(pref => {
        // Als de voorkeur niet 'unavailable' is en het shift type komt overeen
        if (pref.type !== "unavailable" && pref.type === shiftType) {
          availableUserIds.add(pref.userId);
          console.log(`Gebruiker ${pref.userId} is beschikbaar voor ${shiftType} shift op ${gezochteYMD}`);
        }
      });
      
      // Toon alle ambulanciers en markeer op basis van beschikbaarheid en toewijzing
      ambulanciers.forEach(ambulancier => {
        const isAssigned = assignedUserIds.has(ambulancier.id);
        const isAvailable = availableUserIds.has(ambulancier.id);
        
        // Controleer of de ambulancier uren wil werken (hours > 0)
        const wantsToWork = ambulancier.hours > 0;
        
        // AANGEPAST: Toon ALLE ambulanciers die zich beschikbaar hebben gesteld
        // Dit helpt bij het vinden van vervangingen
        const hasPreference = isAvailable || isAssigned;
        
        // Bepaal het preferentietype
        let preferenceType = "unavailable";
        if (isAssigned) {
          preferenceType = "assigned";
        } else if (isAvailable && wantsToWork) {
          preferenceType = "available";
        } else if (isAvailable && !wantsToWork) {
          preferenceType = "available_no_hours";
        }
        
        // Voeg toe aan resultaat als ze zich beschikbaar hebben gesteld OF al zijn toegewezen
        if (hasPreference) {
          result.push({
            userId: ambulancier.id,
            username: ambulancier.username || "Onbekend",
            firstName: ambulancier.firstName || "",
            lastName: ambulancier.lastName || "",
            preferenceType: preferenceType,
            canSplit: false, // Niet relevant voor weergave
            isAssigned: isAssigned, // Extra veld om snel te kunnen checken of deze gebruiker al is toegewezen
            isAvailable: isAvailable && wantsToWork, // Of de gebruiker beschikbaar is en uren wil werken
            hours: ambulancier.hours || 0 // Hoeveel uren deze persoon wil werken
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

  // Helper functie om gegenereerde shifts in uren per gebruiker te berekenen
  // Houdt alleen rekening met shifts in de geselecteerde maand/jaar
  const countUserShiftsHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // Controleer of de shift in de geselecteerde maand/jaar valt
      const shiftDate = new Date(s.date);
      return shiftDate.getMonth() === selectedMonth && 
             shiftDate.getFullYear() === selectedYear;
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
        // Bereken uren voor gesplitste shift
        const startTime = new Date(shift.splitStartTime);
        const endTime = new Date(shift.splitEndTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      } else if (shift.startTime && shift.endTime) {
        // Bereken uren voor volledige shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
  };
  
  // Helper functie om weekday shifts te tellen (maandag tot vrijdag)
  const countUserWeekdayShiftHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar én weekdagen
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // Controleer of de shift in de geselecteerde maand/jaar valt
      const shiftDate = new Date(s.date);
      // Controleer of het een weekdag is (niet weekend)
      return shiftDate.getMonth() === selectedMonth && 
             shiftDate.getFullYear() === selectedYear &&
             !isWeekend(shiftDate);
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
        // Bereken uren voor gesplitste shift
        const startTime = new Date(shift.splitStartTime);
        const endTime = new Date(shift.splitEndTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      } else if (shift.startTime && shift.endTime) {
        // Bereken uren voor volledige shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
  };
  
  // Helper functie om weekend shifts te tellen (zaterdag en zondag)
  const countUserWeekendShiftHours = (userId: number) => {
    // Filter shifts op gebruiker én geselecteerde maand/jaar én weekenddagen
    const userShifts = shifts.filter(s => {
      if (s.userId !== userId) return false;
      
      // Controleer of de shift in de geselecteerde maand/jaar valt
      const shiftDate = new Date(s.date);
      // Controleer of het weekend is
      return shiftDate.getMonth() === selectedMonth && 
             shiftDate.getFullYear() === selectedYear &&
             isWeekend(shiftDate);
    });
    
    // Tel de uren voor elke shift gebaseerd op daadwerkelijke tijden
    let totalHours = 0;
    userShifts.forEach(shift => {
      if (shift.isSplitShift && shift.splitStartTime && shift.splitEndTime) {
        // Bereken uren voor gesplitste shift
        const startTime = new Date(shift.splitStartTime);
        const endTime = new Date(shift.splitEndTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      } else if (shift.startTime && shift.endTime) {
        // Bereken uren voor volledige shift
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        const hours = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    });
    
    return Math.round(totalHours);
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
  
  // Handle remove from shift (voor zieke medewerkers)
  const handleRemoveFromShift = () => {
    if (editingShift && editingShift.userId > 0) {
      // Reset userId naar 0 en status naar "open"
      updateShiftMutation.mutate({
        shiftId: editingShift.id,
        userId: 0
      });
      
      // Toon een gespecialiseerde melding voor het verwijderen van een medewerker
      toast({
        title: "Medewerker verwijderd",
        description: "De medewerker is uit de shift verwijderd. De shift staat nu op 'Open'.",
        variant: "default",
      });
    }
  }

  const handleSplitShift = async () => {
    if (!editingShift || (editingShift.type !== "night" && editingShift.type !== "day") || editingShift.isSplitShift) return;
    
    try {
      const res = await apiRequest("POST", `/api/shifts/${editingShift.id}/split`, {});
      
      if (!res.ok) {
        throw new Error("Kon shift niet splitsen");
      }
      
      const splitDescription = editingShift.type === "night" 
        ? "De nachtshift is opgesplitst in twee halve shifts (19:00-23:00 en 23:00-07:00)"
        : "De dagshift is opgesplitst in twee halve shifts (07:00-13:00 en 13:00-19:00)";
      
      toast({
        title: "Shift gesplitst",
        description: splitDescription,
      });
      
      setEditingShift(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    } catch (error) {
      toast({
        title: "Fout bij splitsen",
        description: "Er ging iets mis bij het splitsen van de shift",
        variant: "destructive",
      });
    }
  }

  const handleMergeShift = async () => {
    if (!editingShift || (editingShift.type !== "night" && editingShift.type !== "day") || !editingShift.isSplitShift) return;
    
    try {
      const res = await apiRequest("POST", `/api/shifts/${editingShift.id}/merge`, {});
      
      if (!res.ok) {
        throw new Error("Kon shift niet samenvoegen");
      }
      
      const mergeDescription = editingShift.type === "night" 
        ? "De halve shifts zijn samengevoegd tot één volledige nachtshift (19:00-07:00)"
        : "De halve shifts zijn samengevoegd tot één volledige dagshift (07:00-19:00)";
      
      toast({
        title: "Shift samengevoegd",
        description: mergeDescription,
      });
      
      setEditingShift(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    } catch (error) {
      toast({
        title: "Fout bij samenvoegen",
        description: "Er ging iets mis bij het samenvoegen van de shift",
        variant: "destructive",
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
                
                {lastGeneratedTimestamp && (
                  <div className="flex items-center text-xs text-gray-500 mt-1 mb-2">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Laatst gegenereerd: {lastGeneratedTimestamp.formattedTimestamp}</span>
                  </div>
                )}
                
                {isGeneratingTestPreferences && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voortgang</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="w-full" />
                    {progressMessage && (
                      <p className="text-xs text-muted-foreground mt-1">{progressMessage}</p>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isGeneratingTestPreferences}
                  onClick={async () => {
                    let pollInterval: NodeJS.Timeout | null = null;
                    try {
                      setIsGeneratingTestPreferences(true);
                      setProgressPercentage(0);
                      setProgressMessage("Starten van voorkeurengeneratie...");
                      
                      // Start polling voor voortgang
                      pollInterval = setInterval(async () => {
                        try {
                          const progressRes = await fetch('/api/preferences/progress');
                          if (progressRes.ok) {
                            const progressData = await progressRes.json();
                            setProgressPercentage(progressData.percentage || 0);
                            setProgressMessage(progressData.message || "");
                            
                            if (progressData.percentage >= 100) {
                              if (pollInterval) clearInterval(pollInterval);
                            }
                          }
                        } catch (error) {
                          // Stille fout - polling mag niet het hoofdproces verstoren
                        }
                      }, 1000);
                      
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
                      
                      // Stop polling
                      if (pollInterval) clearInterval(pollInterval);
                      
                      // Vernieuw ook de tijdstempel voor de huidige maand
                      queryClient.invalidateQueries({ queryKey: ["/api/system/settings/last-preferences-generated", selectedMonth + 1, selectedYear] });
                    } catch (error) {
                      // Stop polling bij fout
                      if (pollInterval) clearInterval(pollInterval);
                      toast({
                        title: "Fout",
                        description: error instanceof Error ? error.message : "Onbekende fout bij genereren testdata",
                        variant: "destructive",
                      });
                    } finally {
                      setIsGeneratingTestPreferences(false);
                      setProgressPercentage(0);
                      setProgressMessage("");
                    }
                  }}
                >
                  {isGeneratingTestPreferences ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bezig met genereren...
                    </>
                  ) : (
                    "Genereer Test Voorkeuren"
                  )}
                </Button>
              </div>
              
              <div className="mt-4 p-4 border border-red-100 rounded-md bg-red-50">
                <h3 className="font-semibold mb-2 flex items-center text-red-800">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Planning Verwijderen
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Verwijder alle planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                </p>
                
                {isDeletingSchedule && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voortgang</span>
                      <span>{deleteProgressPercentage}%</span>
                    </div>
                    <Progress value={deleteProgressPercentage} className="w-full" />
                    {deleteProgressMessage && (
                      <p className="text-xs text-muted-foreground mt-1">{deleteProgressMessage}</p>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
                  onClick={() => {
                    const monthName = format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl });
                    // Toon bevestigingsdialoog
                    if (window.confirm(`Weet u zeker dat u de volledige planning voor ${monthName} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`)) {
                      setIsDeletingSchedule(true);
                      setDeleteProgressPercentage(0);
                      setDeleteProgressMessage("Planning verwijderen...");
                      
                      // Start polling voor voortgang
                      const deleteInterval = setInterval(async () => {
                        try {
                          const progressRes = await fetch('/api/schedule/delete-progress');
                          if (progressRes.ok) {
                            const progressData = await progressRes.json();
                            setDeleteProgressPercentage(progressData.percentage || 0);
                            setDeleteProgressMessage(progressData.message || "");
                            
                            if (progressData.percentage >= 100) {
                              clearInterval(deleteInterval);
                            }
                          }
                        } catch (error) {
                          // Stille fout - polling mag niet het hoofdproces verstoren
                        }
                      }, 500);
                      
                      deleteMonthShiftsMutation.mutate(undefined, {
                        onSettled: () => {
                          clearInterval(deleteInterval);
                          setIsDeletingSchedule(false);
                          setDeleteProgressPercentage(0);
                          setDeleteProgressMessage("");
                        }
                      });
                    }
                  }}
                  disabled={deleteMonthShiftsMutation.isPending}
                >
                  {deleteMonthShiftsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Bezig met verwijderen...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Planning Verwijderen
                    </>
                  )}
                </Button>
              </div>



              {isGeneratingSchedule && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Voortgang</span>
                    <span>{generateProgressPercentage}%</span>
                  </div>
                  <Progress value={generateProgressPercentage} className="w-full" />
                  {generateProgressMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{generateProgressMessage}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mt-6">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">
                    Planning voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
                  </span>
                  {lastScheduleTimestamp && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Laatst gegenereerd: {lastScheduleTimestamp.formattedTimestamp}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setIsGeneratingSchedule(true);
                    setGenerateProgressPercentage(0);
                    setGenerateProgressMessage("Planning genereren...");
                    
                    // Start polling voor voortgang
                    const generateInterval = setInterval(async () => {
                      try {
                        const progressRes = await fetch('/api/schedule/generate-progress');
                        if (progressRes.ok) {
                          const progressData = await progressRes.json();
                          setGenerateProgressPercentage(progressData.percentage || 0);
                          setGenerateProgressMessage(progressData.message || "");
                          
                          if (progressData.percentage >= 100) {
                            clearInterval(generateInterval);
                          }
                        }
                      } catch (error) {
                        // Stille fout - polling mag niet het hoofdproces verstoren
                      }
                    }, 500);
                    
                    generateScheduleMutation.mutate(undefined, {
                      onSettled: () => {
                        clearInterval(generateInterval);
                        setIsGeneratingSchedule(false);
                        setGenerateProgressPercentage(0);
                        setGenerateProgressMessage("");
                      }
                    });
                  }}
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
              <TableCaption>Overzicht van gewenste en geplande uren per medewerker voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead className="text-center">Gewenste Uren</TableHead>
                  <TableHead className="text-center">Totaal Geplande Uren</TableHead>
                  <TableHead className="text-center">Weekdagen Uren</TableHead>
                  <TableHead className="text-center">Weekend Uren</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell className="text-center">{user.hours}</TableCell>
                    <TableCell className="text-center">{countUserShiftsHours(user.id)}</TableCell>
                    <TableCell className="text-center">{countUserWeekdayShiftHours(user.id)}</TableCell>
                    <TableCell className="text-center">{countUserWeekendShiftHours(user.id)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Gegenereerde Planning</CardTitle>
                {lastGeneratedDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Gegenereerd op: {format(lastGeneratedDate, "dd-MM-yyyy HH:mm:ss")}
                  </p>
                )}
              </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const timestamp = Date.now();
                    const url = `/api/schedule/export-xlsx?month=${selectedMonth + 1}&year=${selectedYear}&t=${timestamp}`;
                    window.location.href = url;
                  }}
                  disabled={!shifts || shifts.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Planning
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input 
                type="search" 
                id="search-ambulancier" 
                className="block w-full p-3 ps-10 text-sm border rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Zoek op naam van medewerker..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                      const isUserDeleted = shift.userId > 0 && !shiftUser;
                      
                      return (
                        <TableRow 
                          key={shift.id}
                          className={`${shift.status === "open" || isUserDeleted ? "bg-red-50" : ""} ${isCurrentUserShift ? "bg-green-50" : ""}`}
                        >
                          <TableCell>
                            <button 
                              className="hover:underline text-left"
                              onClick={() => {
                                setSelectedDate(new Date(shift.date));
                                setShowAvailabilityDialog(true);
                              }}
                            >
                              {format(new Date(shift.date), "dd MMMM (EEEE)", { locale: nl })}
                            </button>
                          </TableCell>
                          <TableCell>{shift.type === "day" ? "Dag" : "Nacht"}</TableCell>
                          <TableCell>
                            {shift.startTime && shift.endTime ? (
                              shift.type === "night" ? (
                                shift.isSplitShift ? (
                                  format(new Date(shift.startTime), "HH") === "19" && format(new Date(shift.endTime), "HH") === "23" ? 
                                  "19:00 - 23:00" : 
                                  "23:00 - 07:00"
                                ) : (
                                  "19:00 - 07:00"
                                )
                              ) : (
                                shift.isSplitShift ? (
                                  format(new Date(shift.startTime), "HH") === "7" && format(new Date(shift.endTime), "HH") === "13" ? 
                                  "07:00 - 13:00" : 
                                  "13:00 - 19:00"
                                ) : (
                                  "07:00 - 19:00"
                                )
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {shift.status === "open" || isUserDeleted ? (
                              <span className="text-red-500 font-medium">
                                {shift.status === "open" ? "Niet ingevuld" : "Medewerker verwijderd"}
                              </span>
                            ) : (
                              <span 
                                className={`${isCurrentUserShift ? "font-bold text-green-600" : ""} 
                                  ${searchTerm && shiftUser && 
                                    (shiftUser.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     shiftUser.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     shiftUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     `${shiftUser.firstName} ${shiftUser.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
                                     ? "bg-green-200 px-1 py-0.5 rounded font-medium" : ""}`}
                              >
                                {shiftUser ? `${shiftUser.firstName} ${shiftUser.lastName}` : "Onbekend"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {shift.status === "planned" && !isUserDeleted ? (
                                  <Check className="h-4 w-4 text-green-500 mr-1" />
                                ) : (shift.status === "open" || isUserDeleted) ? (
                                  <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                ) : null}
                                {shift.status === "open" ? "Open" : isUserDeleted ? "Herinplannen nodig" : "Ingepland"}
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
                          {`${user.firstName} ${user.lastName}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col gap-4">
            {/* Shift bewerking knoppen */}
            {editingShift && (editingShift.type === "night" || editingShift.type === "day") && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <Label className="text-sm font-medium">Shift opties:</Label>
                <div className="flex flex-wrap gap-2">
                  {!editingShift.isSplitShift && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSplitShift}
                      disabled={updateShiftMutation.isPending}
                    >
                      <Split className="h-4 w-4 mr-2" />
                      {editingShift.type === "night" 
                        ? "Splitsen" 
                        : "Splitsen"
                      }
                    </Button>
                  )}
                  
                  {editingShift.isSplitShift && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleMergeShift}
                      disabled={updateShiftMutation.isPending}
                    >
                      <Merge className="h-4 w-4 mr-2" />
                      Samenvoegen
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setEditingShift(null)}>
                Annuleren
              </Button>
              
              {editingShift && editingShift.userId > 0 && (
                <Button 
                  variant="destructive"
                  onClick={handleRemoveFromShift}
                  disabled={updateShiftMutation.isPending}
                >
                  {updateShiftMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Verwijderen (Ziek)
                    </>
                  )}
                </Button>
              )}
              
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
                              <TableCell>{u.hours}</TableCell>
                            </TableRow>
                          ))}
                          
                          {getUsersAvailableForDate(selectedDate, "day").length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4">
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
                            <TableCell>{u.hours}</TableCell>
                          </TableRow>
                        ))}
                        
                        {getUsersAvailableForDate(selectedDate, "night").length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
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

      {/* Gebruiker Opmerkingen Sectie */}
      {userComments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gebruiker Opmerkingen voor {format(new Date(selectedYear, selectedMonth), "MMMM yyyy", { locale: nl })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userComments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-blue-700">
                      {comment.user?.firstName} {comment.user?.lastName}
                      <span className="text-sm text-gray-500 ml-2">({comment.user?.username})</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(comment.updatedAt).toLocaleString('nl-NL')}
                    </div>
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {comment.comment}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}